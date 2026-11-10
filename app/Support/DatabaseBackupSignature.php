<?php

namespace App\Support;

use RuntimeException;

class DatabaseBackupSignature
{
    private const FOOTER_PREFIX = "\n-- TMIS-SQL-BACKUP-HMAC-SHA256:";

    /** Append an application-key signature so restore can reject altered or external SQL files. */
    public function append(string $path): void
    {
        $signature = $this->hashFile($path);
        $written = file_put_contents($path, self::FOOTER_PREFIX.$signature."\n", FILE_APPEND | LOCK_EX);

        if ($written !== strlen(self::FOOTER_PREFIX.$signature."\n")) {
            throw new RuntimeException('The database backup signature could not be written.');
        }
    }

    /** Verify the trailing signature before any uploaded SQL is passed to PostgreSQL. */
    public function isValid(string $path): bool
    {
        if (! is_file($path) || ! is_readable($path)) {
            return false;
        }

        $footerLength = strlen(self::FOOTER_PREFIX.str_repeat('0', 64)."\n");
        $size = filesize($path);
        if ($size === false || $size <= $footerLength) {
            return false;
        }

        $stream = fopen($path, 'rb');
        if ($stream === false) {
            return false;
        }

        try {
            if (fseek($stream, -$footerLength, SEEK_END) !== 0) {
                return false;
            }

            $footer = fread($stream, $footerLength);
            if (! is_string($footer) || ! preg_match('/^\n-- TMIS-SQL-BACKUP-HMAC-SHA256:([a-f0-9]{64})\n$/D', $footer, $matches)) {
                return false;
            }

            rewind($stream);
            $context = hash_init('sha256', HASH_HMAC, $this->key());
            $remaining = $size - $footerLength;
            while ($remaining > 0) {
                $chunk = fread($stream, min(1024 * 1024, $remaining));
                if (! is_string($chunk) || $chunk === '') {
                    return false;
                }

                hash_update($context, $chunk);
                $remaining -= strlen($chunk);
            }

            return hash_equals(hash_final($context), $matches[1]);
        } finally {
            fclose($stream);
        }
    }

    /** HMAC the backup in chunks so large exports do not need to be loaded into memory. */
    private function hashFile(string $path): string
    {
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException('The database backup could not be signed.');
        }

        try {
            $context = hash_init('sha256', HASH_HMAC, $this->key());
            if (hash_update_stream($context, $stream) === false) {
                throw new RuntimeException('The database backup could not be signed.');
            }

            return hash_final($context);
        } finally {
            fclose($stream);
        }
    }

    /** Decode Laravel's configured application key for HMAC signing and verification. */
    private function key(): string
    {
        $key = (string) config('app.key');
        if (str_starts_with($key, 'base64:')) {
            $decodedKey = base64_decode(substr($key, 7), true);
            if (is_string($decodedKey)) {
                return $decodedKey;
            }
        }

        if ($key === '') {
            throw new RuntimeException('APP_KEY must be configured to sign database backups.');
        }

        return $key;
    }
}
