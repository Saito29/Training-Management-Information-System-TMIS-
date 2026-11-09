<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ErrorPagesTest extends TestCase
{
    public function test_missing_pages_render_the_imported_404_design(): void
    {
        $this->get('/missing/nested/page')->assertNotFound()->assertSee('A little off the beaten path.')->assertSee(route('login'));
    }

    public function test_server_errors_render_without_exposing_exception_details(): void
    {
        config(['app.debug' => true]);
        Route::get('/test-server-error', function (): void {
            throw new \RuntimeException('private-error-detail');
        });

        $this->get('/test-server-error')->assertStatus(500)->assertSee('500')->assertDontSee('private-error-detail');
    }

    public function test_service_unavailable_uses_maintenance_design_and_preserves_retry_header(): void
    {
        Route::get('/test-service-unavailable', function (): void {
            abort(503, '', ['Retry-After' => '60']);
        });

        $this->get('/test-service-unavailable')->assertStatus(503)->assertHeader('Retry-After', '60')->assertSee('Making space for better.');
    }

    public function test_api_errors_remain_json(): void
    {
        $this->getJson('/api/missing-page')->assertNotFound()->assertJsonStructure(['message'])->assertDontSee('A little off the beaten path.');
    }

    public function test_permission_denials_use_404_for_browser_pages_and_preserve_json_contract(): void
    {
        Route::get('/test-denied-page', fn () => abort(403, 'Private permission details'));
        $this->get('/test-denied-page')->assertNotFound()->assertSee('A little off the beaten path.')->assertDontSee('Private permission details');
        $this->getJson('/test-denied-page')->assertForbidden();
    }

    public function test_database_failures_render_generic_500_without_connection_details(): void
    {
        config(['app.debug' => true]);
        Route::get('/test-database-error', function (): void {
            throw new \PDOException('private-database-connection-password');
        });
        $this->get('/test-database-error')->assertStatus(500)->assertSee('500')->assertDontSee('private-database-connection-password');
        $this->getJson('/test-database-error')->assertStatus(500)->assertJsonPath('message', 'A system error occurred. Please try again later.')->assertDontSee('private-database-connection-password');
    }
}
