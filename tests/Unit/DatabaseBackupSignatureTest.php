<?php

namespace Tests\Unit;

use App\Support\DatabaseBackupSignature;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class DatabaseBackupSignatureTest extends TestCase
{
    /** Ensure a signed dump verifies until even one byte is changed. */
    public function test_it_accepts_only_untampered_sql_backups_signed_by_the_application_key(): void
    {
        Config::set('app.key', 'base64:'.base64_encode(str_repeat('s', 32)));
        $path = tempnam(sys_get_temp_dir(), 'tmis-backup-test-');
        file_put_contents($path, "-- PostgreSQL database dump\nCREATE TABLE example (id integer);\n");
        $signature = app(DatabaseBackupSignature::class);

        try {
            $signature->append($path);

            $this->assertTrue($signature->isValid($path));

            file_put_contents($path, "-- altered\n", FILE_APPEND);

            $this->assertFalse($signature->isValid($path));
        } finally {
            unlink($path);
        }
    }

    /** Ensure an arbitrary SQL file cannot reach the restore command as a trusted backup. */
    public function test_it_rejects_unsigned_sql_files(): void
    {
        Config::set('app.key', 'base64:'.base64_encode(str_repeat('k', 32)));
        $path = tempnam(sys_get_temp_dir(), 'tmis-backup-test-');
        file_put_contents($path, "CREATE TABLE example (id integer);\n");

        try {
            $this->assertFalse(app(DatabaseBackupSignature::class)->isValid($path));
        } finally {
            unlink($path);
        }
    }
}
