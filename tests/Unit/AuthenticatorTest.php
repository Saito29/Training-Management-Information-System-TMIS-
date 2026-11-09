<?php

namespace Tests\Unit;

use App\Support\Authenticator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class AuthenticatorTest extends TestCase
{
    public static function vectors(): array
    {
        return [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']];
    }

    #[DataProvider('vectors')]
    public function test_sha1_codes_match_published_rfc_6238_vectors(int $time, string $expected): void
    {
        $this->assertSame($expected, (new Authenticator)->code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', $time, 8));
    }
}
