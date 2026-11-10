<?php

namespace Tests\Feature;

use App\Http\Middleware\Authentication\EnsureEligibleUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_account_does_not_see_the_mail_tab_or_recipient_picker(): void
    {
        $this->withoutVite();
        $this->withoutMiddleware(EnsureEligibleUser::class);
        $user = User::factory()->create(['role_id' => 3]);
        $this->actingAs($user);

        $this->get(route('admin.users.profile'))->assertOk()
            ->assertDontSee('id="mail-tab"', false)
            ->assertDontSee('id="mail-panel"', false)
            ->assertDontSee('Choose recipients');
    }

    public function test_system_administrator_can_see_the_mail_recipient_picker(): void
    {
        $this->withoutVite();
        $this->withoutMiddleware(EnsureEligibleUser::class);
        $user = User::factory()->create(['role_id' => 1]);
        $this->actingAs($user);

        $this->get(route('admin.users.profile'))->assertOk()->assertViewIs('admin.users.profile')
            ->assertSee('id="mail-tab"', false)->assertSee('id="mail-panel"', false)
            ->assertSee('Choose recipients')->assertSee('All regions')->assertSee('All offices')
            ->assertSee('Load sample users')->assertSee('Rows per page');
    }
}
