<?php

namespace Tests\Feature;

use App\Http\Middleware\Authentication\EnsureEligibleUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BladePagesTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('pages')]
    public function test_admin_page_renders_with_working_local_assets(string $path, string $view): void
    {
        $this->withoutMiddleware(EnsureEligibleUser::class);

        if (in_array($path, ['admin/administration/details/trash', 'admin/notification/notification'], true)) {
            $this->actingAs(User::factory()->create());
        }

        $response = $this->get('/app/'.$path);

        $response->assertOk()->assertViewIs($view)->assertSee('<!doctype html>', false);
        preg_match_all('/(?:src|href)="([^"#]+)"/', $response->getContent(), $matches);

        foreach ($matches[1] as $url) {
            if (str_starts_with($url, url('/').'/src/') || str_starts_with($url, url('/').'/assets/')) {
                $assetPath = rawurldecode(parse_url($url, PHP_URL_PATH));
                $this->assertFileExists(public_path(ltrim($assetPath, '/')), $url);
            }
        }
    }

    #[DataProvider('pages')]
    public function test_legacy_page_urls_redirect_with_query_parameters(string $path, string $view): void
    {
        $this->withoutMiddleware(EnsureEligibleUser::class);
        $this->get('/app/'.$path.'.html?id=42&filter=active')->assertStatus(301)
            ->assertRedirect(route($view, ['id' => '42', 'filter' => 'active']));
    }

    public function test_existing_authentication_pages_still_render(): void
    {
        foreach (['/', '/forgot-password'] as $path) {
            $this->get($path)->assertOk();
        }
    }

    public function test_legacy_login_link_redirects_to_login(): void
    {
        $this->get('/app/authentication/login.html')->assertRedirect('/');
    }

    /**
     * @return array<int, array{string, string}>
     */
    public static function pages(): array
    {
        return [
            ['admin/administration/create/register', 'admin.administration.create.register'],
            ['admin/administration/details/all-status', 'admin.administration.details.all-status'],
            ['admin/administration/details/approved-accepted', 'admin.administration.details.approved-accepted'],
            ['admin/administration/details/inactive', 'admin.administration.details.inactive'],
            ['admin/administration/details/trash', 'admin.administration.details.trash'],
            ['admin/administration/id/edit-user', 'admin.administration.id.edit-user'],
            ['admin/administration/id/view-user', 'admin.administration.id.view-user'],
            ['admin/administration/update/for-approval', 'admin.administration.update.for-approval'],
            ['admin/dashboard/dashboard', 'admin.dashboard.dashboard'],
            ['admin/evaluation/create/post-test-register', 'admin.evaluation.create.post-test-register'],
            ['admin/evaluation/create/pre-test-register', 'admin.evaluation.create.pre-test-register'],
            ['admin/evaluation/create/rp-evaluation-register', 'admin.evaluation.create.rp-evaluation-register'],
            ['admin/evaluation/create/training-evaluation-register', 'admin.evaluation.create.training-evaluation-register'],
            ['admin/evaluation/details/draft-questionnaire', 'admin.evaluation.details.draft-questionnaire'],
            ['admin/evaluation/details/encoded-post-test', 'admin.evaluation.details.encoded-post-test'],
            ['admin/evaluation/details/encoded-pre-test', 'admin.evaluation.details.encoded-pre-test'],
            ['admin/evaluation/details/encoded-rp-evaluation', 'admin.evaluation.details.encoded-rp-evaluation'],
            ['admin/evaluation/details/encoded-training-evaluation', 'admin.evaluation.details.encoded-training-evaluation'],
            ['admin/evaluation/details/inactive', 'admin.evaluation.details.inactive'],
            ['admin/evaluation/details/list-questionnaire', 'admin.evaluation.details.list-questionnaire'],
            ['admin/evaluation/encode/post-test', 'admin.evaluation.encode.post-test'],
            ['admin/evaluation/encode/pre-test', 'admin.evaluation.encode.pre-test'],
            ['admin/evaluation/encode/rp-evaluation', 'admin.evaluation.encode.rp-evaluation'],
            ['admin/evaluation/encode/training-evaluation', 'admin.evaluation.encode.training-evaluation'],
            ['admin/evaluation/id/edit-post-test', 'admin.evaluation.id.edit-post-test'],
            ['admin/evaluation/id/edit-pre-test', 'admin.evaluation.id.edit-pre-test'],
            ['admin/evaluation/id/edit-rp-evaluation', 'admin.evaluation.id.edit-rp-evaluation'],
            ['admin/evaluation/id/edit-training-evaluation', 'admin.evaluation.id.edit-training-evaluation'],
            ['admin/evaluation/id/view-post-test', 'admin.evaluation.id.view-post-test'],
            ['admin/evaluation/id/view-pre-test', 'admin.evaluation.id.view-pre-test'],
            ['admin/evaluation/id/view-rp-evaluation', 'admin.evaluation.id.view-rp-evaluation'],
            ['admin/evaluation/id/view-training-evaluation', 'admin.evaluation.id.view-training-evaluation'],
            ['admin/notification/details/all-notification', 'admin.notification.details.all-notification'],
            ['admin/notification/notification', 'admin.notification.notification'],
            ['admin/participants/create/fa-register', 'admin.participants.create.fa-register'],
            ['admin/participants/create/register', 'admin.participants.create.register'],
            ['admin/participants/details/all-with-status', 'admin.participants.details.all-with-status'],
            ['admin/participants/details/fa-all-list', 'admin.participants.details.fa-all-list'],
            ['admin/participants/details/fa-inactive', 'admin.participants.details.fa-inactive'],
            ['admin/participants/details/inactive', 'admin.participants.details.inactive'],
            ['admin/participants/id/edit-fa', 'admin.participants.id.edit-fa'],
            ['admin/participants/id/edit-farmer', 'admin.participants.id.edit-farmer'],
            ['admin/participants/id/view-fa', 'admin.participants.id.view-fa'],
            ['admin/participants/id/view-farmer', 'admin.participants.id.view-farmer'],
            ['admin/training/create/register', 'admin.training.create.register'],
            ['admin/training/create/rp-register', 'admin.training.create.rp-register'],
            ['admin/training/details/all-status', 'admin.training.details.all-status'],
            ['admin/training/details/approved-accepted', 'admin.training.details.approved-accepted'],
            ['admin/training/details/inactive', 'admin.training.details.inactive'],
            ['admin/training/details/incomplete', 'admin.training.details.incomplete'],
            ['admin/training/details/rp-inactive', 'admin.training.details.rp-inactive'],
            ['admin/training/details/rp-list', 'admin.training.details.rp-list'],
            ['admin/training/id/edit-rp', 'admin.training.id.edit-rp'],
            ['admin/training/id/edit-training', 'admin.training.id.edit-training'],
            ['admin/training/id/view-rp', 'admin.training.id.view-rp'],
            ['admin/training/id/view-training', 'admin.training.id.view-training'],
            ['admin/training/update/for-approval', 'admin.training.update.for-approval'],
            ['admin/training/update/for-review', 'admin.training.update.for-review'],
            ['admin/users/logs', 'admin.users.logs'],
            ['admin/users/profile', 'admin.users.profile'],
        ];
    }
}
