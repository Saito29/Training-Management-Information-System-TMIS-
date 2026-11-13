<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AttachmentTypeSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(int $role = 1): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        $passwordHash = Hash::make('Attachment-settings-password-123!');
        DB::table('user_auth')->insert(['user_id' => $user->user_id, 'password_hash' => $passwordHash]);
        if ($role === 1) {
            DB::table('system_super_admins')->insert([
                'user_id' => $user->user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $this->actingAs($user)->withSession([
            'auth.verified_user_id' => $user->user_id,
            'auth.password_fingerprint' => hash('sha256', $passwordHash),
        ]);

        return $user;
    }

    public function test_administrators_manage_attachment_types_per_category(): void
    {
        $this->signIn();

        $profileType = $this->postJson(route('system.attachment-types.store', 'farmer_profile'), ['name' => 'Field Reports', 'is_required' => true])
            ->assertCreated()
            ->assertJsonPath('option.category', 'farmer_profile')
            ->assertJsonPath('option.is_required', true)
            ->json('option');
        $associationType = $this->postJson(route('system.attachment-types.store', 'farmer_association'), ['name' => 'Field Reports'])
            ->assertCreated()
            ->assertJsonPath('option.category', 'farmer_association')
            ->json('option');

        $this->postJson(route('system.attachment-types.store', 'farmer_profile'), ['name' => 'field reports'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->patchJson(route('system.attachment-types.update', ['category' => 'farmer_profile', 'option' => $profileType['id']]), ['name' => 'Farmer Field Report'])
            ->assertOk()
            ->assertJsonPath('option.name', 'Farmer Field Report')
            ->assertJsonPath('option.is_required', true);
        $this->assertDatabaseHas('attachment_type_options', [
            'id' => $profileType['id'],
            'category' => 'farmer_profile',
            'name' => 'Farmer Field Report',
            'is_required' => true,
        ]);
        $this->patchJson(route('system.attachment-types.update', ['category' => 'farmer_profile', 'option' => $profileType['id']]), ['is_required' => false])
            ->assertOk()
            ->assertJsonPath('option.is_required', false);

        $this->deleteJson(route('system.attachment-types.destroy', ['category' => 'farmer_association', 'option' => $associationType['id']]))
            ->assertOk()
            ->assertJsonPath('message', 'Attachment type deleted.');
        $this->assertDatabaseMissing('attachment_type_options', ['id' => $associationType['id']]);
        $this->getJson(route('system.attachment-types.index', 'farmer_profile'))
            ->assertOk()
            ->assertJsonFragment(['name' => 'Farmer Field Report', 'category' => 'farmer_profile']);
        $this->get(route('system.settings'))
            ->assertOk()
            ->assertSee('Attachment types')
            ->assertSee('Farmer profile attachments')
            ->assertSee('Farmer association attachments')
            ->assertSee('Training attachments')
            ->assertSee('Required attachment type')
            ->assertSee('Requirement')
            ->assertSee('informational')
            ->assertSee('attachment-type-settings.js');
    }

    public function test_built_in_attachment_types_allow_requirement_changes_but_not_renaming(): void
    {
        $this->signIn();
        $trainingDesignId = DB::table('attachment_type_options')
            ->where('category', 'training')
            ->where('name', 'Training design')
            ->value('id');

        $this->patchJson(route('system.attachment-types.update', ['category' => 'training', 'option' => $trainingDesignId]), ['is_required' => true])
            ->assertOk()
            ->assertJsonPath('option.is_required', true);
        $this->patchJson(route('system.attachment-types.update', ['category' => 'training', 'option' => $trainingDesignId]), ['name' => 'Required Plan'])
            ->assertConflict();
        $this->assertDatabaseHas('attachment_type_options', [
            'id' => $trainingDesignId,
            'name' => 'Training design',
            'is_required' => true,
        ]);
        $this->postJson(route('system.attachment-types.store', 'training'), ['name' => 'Invalid required value', 'is_required' => 'sometimes'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_required');
        $this->assertDatabaseMissing('attachment_type_options', ['name' => 'Invalid required value']);
    }

    public function test_renaming_a_type_updates_saved_document_labels_and_blocks_deletion(): void
    {
        $user = $this->signIn();
        $participantId = DB::table('participants')->insertGetId([
            'region_id' => 4,
            'org_id' => 1,
            'created_by' => $user->user_id,
            'name' => 'Attachment catalog farmer',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('participant_attachments')->insert([
            'participant_id' => $participantId,
            'kind' => 'Profile Form',
            'path' => 'record-documents/profile-form.pdf',
            'original_name' => 'profile-form.pdf',
            'mime_type' => 'application/pdf',
            'size' => 8,
            'uploaded_by' => $user->user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $optionId = DB::table('attachment_type_options')
            ->where('category', 'farmer_profile')
            ->where('name', 'Profile Form')
            ->value('id');

        $this->patchJson(route('system.attachment-types.update', ['category' => 'farmer_profile', 'option' => $optionId]), ['name' => 'Farmer Profile Form'])
            ->assertOk()
            ->assertJsonPath('option.attachment_count', 1);
        $this->assertDatabaseHas('participant_attachments', [
            'participant_id' => $participantId,
            'kind' => 'Farmer Profile Form',
        ]);
        $this->deleteJson(route('system.attachment-types.destroy', ['category' => 'farmer_profile', 'option' => $optionId]))
            ->assertConflict();
    }

    public function test_protected_types_cannot_be_changed_and_non_administrators_cannot_manage_the_catalog(): void
    {
        $this->signIn();
        $trainingDesignId = DB::table('attachment_type_options')
            ->where('category', 'training')
            ->where('name', 'Training design')
            ->value('id');

        $this->patchJson(route('system.attachment-types.update', ['category' => 'training', 'option' => $trainingDesignId]), ['name' => 'Required Plan'])
            ->assertConflict();
        $this->deleteJson(route('system.attachment-types.destroy', ['category' => 'training', 'option' => $trainingDesignId]))
            ->assertConflict();

        $this->signIn(3);
        $this->getJson(route('system.attachment-types.index', 'training'))->assertForbidden();
        $this->postJson(route('system.attachment-types.store', 'training'), ['name' => 'Restricted type'])->assertForbidden();
    }
}
