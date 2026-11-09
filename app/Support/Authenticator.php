<?php

namespace App\Support;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/** RFC 6238: SHA-1, 30-second time steps, six digits, one-step clock tolerance. */
class Authenticator
{
    public function secret(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($index = 0; $index < 32; $index++) {
            $secret .= $alphabet[random_int(0, 31)];
        }

        return $secret;
    }

    public function code(string $secret, int $timestamp, int $digits = 6): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $buffer = 0;
        $bits = 0;
        $key = '';
        foreach (str_split($secret) as $character) {
            $value = strpos($alphabet, $character);
            if ($value === false) {
                throw new \InvalidArgumentException('Invalid authenticator key.');
            }
            $buffer = ($buffer << 5) | $value;
            $bits += 5;
            if ($bits >= 8) {
                $bits -= 8;
                $key .= chr(($buffer >> $bits) & 255);
                $buffer &= (1 << $bits) - 1;
            }
        }
        $counter = intdiv($timestamp, 30);
        $hash = hash_hmac('sha1', pack('N2', intdiv($counter, 4294967296), $counter % 4294967296), $key, true);
        $offset = ord($hash[19]) & 15;
        $value = unpack('N', substr($hash, $offset, 4))[1] & 2147483647;

        return str_pad((string) ($value % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    public function counter(string $secret, string $code, ?int $last = null): ?int
    {
        if (! preg_match('/^[0-9]{6}$/', $code)) {
            return null;
        }
        $counter = intdiv(now()->timestamp, 30);
        for ($step = max(0, $counter - 1); $step <= $counter + 1; $step++) {
            if (($last === null || $step > $last) && hash_equals($this->code($secret, $step * 30), $code)) {
                return $step;
            }
        }

        return null;
    }

    /** Caller must lock user_auth in a transaction to prevent replay of codes. */
    public function consume(object $account, string $code): bool
    {
        if (! $account->totp_secret) {
            return false;
        }
        $counter = $this->counter(Crypt::decryptString($account->totp_secret), $code, $account->totp_last_counter === null ? null : (int) $account->totp_last_counter);
        if ($counter !== null) {
            DB::table('user_auth')->where('id', $account->id)->update(['totp_last_counter' => $counter]);

            return true;
        }
        $codes = $account->totp_recovery_codes ? json_decode(Crypt::decryptString($account->totp_recovery_codes), true, 512, JSON_THROW_ON_ERROR) : [];
        $hash = hash('sha256', strtolower(str_replace('-', '', trim($code))));
        foreach ($codes as $index => $saved) {
            if (hash_equals($saved, $hash)) {
                unset($codes[$index]);
                DB::table('user_auth')->where('id', $account->id)->update(['totp_recovery_codes' => Crypt::encryptString(json_encode(array_values($codes), JSON_THROW_ON_ERROR))]);

                return true;
            }
        }

        return false;
    }

    public function recoveryCodes(int $accountId): array
    {
        $codes = array_map(fn (): string => bin2hex(random_bytes(5)).'-'.bin2hex(random_bytes(5)), range(1, 8));
        $hashes = array_map(fn (string $code): string => hash('sha256', str_replace('-', '', $code)), $codes);
        DB::table('user_auth')->where('id', $accountId)->update(['totp_recovery_codes' => Crypt::encryptString(json_encode($hashes, JSON_THROW_ON_ERROR))]);

        return $codes;
    }
}
