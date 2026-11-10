<?php

use App\Http\Controllers\Authentication\AccountRegistrationController;
use App\Http\Controllers\Authentication\AuditLogController;
use App\Http\Controllers\Authentication\BrandingAssetController;
use App\Http\Controllers\DatabaseBackupController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\OperationsController;
use App\Http\Controllers\OriginalDocumentController;
use App\Http\Controllers\OriginalInterfaceController;
use App\Http\Controllers\SystemSettingsController;
use App\Http\Middleware\Authentication\EnsureEligibleUser;
use App\Support\ModuleAccess;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

require __DIR__.'/authentication/web.php';

Route::get('/maintenance', [SystemSettingsController::class, 'maintenancePage'])->name('maintenance.page');
Route::get('/system-branding/{kind}', [BrandingAssetController::class, 'show'])->whereIn('kind', ['logo', 'favicon', 'dashboard'])->name('system-branding.asset');

Route::middleware(EnsureEligibleUser::class)->group(function (): void {
    Route::get('/maintenance/settings', [SystemSettingsController::class, 'maintenanceSettings'])->name('maintenance.settings');
    Route::post('/maintenance/settings', [SystemSettingsController::class, 'updateMaintenance'])->name('maintenance.settings.update');
    Route::post('/ui/participants', [OriginalInterfaceController::class, 'registerParticipant'])->middleware('throttle:60,1')->name('ui.participants.store');
    Route::post('/ui/participants/matches', [OriginalInterfaceController::class, 'participantMatches'])->middleware('throttle:20,1')->name('ui.participants.matches');
    Route::post('/ui/participants/{participant}/beneficiaries', [OriginalInterfaceController::class, 'addParticipantBeneficiary'])->where('participant', '[A-Za-z0-9-]+')->middleware('throttle:30,1')->name('ui.participants.beneficiaries.store');
    Route::patch('/system/locations/{kind}/{id}', [LocationController::class, 'update'])->whereIn('kind', ['region', 'province', 'district', 'municipality', 'barangay'])->whereNumber('id')->name('system.locations.update');
    Route::delete('/system/locations/{kind}/{id}', [LocationController::class, 'destroy'])->whereIn('kind', ['region', 'province', 'district', 'municipality', 'barangay'])->whereNumber('id')->name('system.locations.destroy');
    Route::post('/system/locations', [LocationController::class, 'store'])->name('system.locations.store');
    Route::post('/ui/training-enrollment', [OriginalInterfaceController::class, 'enrollment'])->name('ui.enrollment');
    Route::post('/ui/documents/{module}/{id}', [OriginalDocumentController::class, 'store'])->name('ui.documents.store');
    Route::get('/ui/documents/{module}/{id}/{document}', [OriginalDocumentController::class, 'show'])->whereNumber('document')->name('ui.documents.show');
    Route::patch('/ui/documents/{module}/{id}/{document}', [OriginalDocumentController::class, 'update'])->whereNumber('document')->name('ui.documents.update');
    Route::delete('/ui/documents/{module}/{id}/{document}', [OriginalDocumentController::class, 'destroy'])->whereNumber('document')->name('ui.documents.destroy');
    Route::post('/ui/highlights/{id}', [OriginalDocumentController::class, 'highlight'])->name('ui.highlights.store');
    Route::get('/ui/highlights/{id}/{slide}/{kind}', [OriginalDocumentController::class, 'highlightImage'])->whereNumber('slide')->name('ui.highlights.image');
    Route::get('/ui/data', [OriginalInterfaceController::class, 'data'])->name('ui.data');
    Route::post('/ui/sync', [OriginalInterfaceController::class, 'sync'])->middleware('throttle:120,1')->name('ui.sync');
    Route::post('/ui/draft', [OriginalInterfaceController::class, 'draft'])->name('ui.draft');

    Route::get('/system/accounts', [SystemSettingsController::class, 'accounts'])->name('system.accounts');
    Route::get('/system/accounts/{user}', [SystemSettingsController::class, 'accountProfile'])->whereNumber('user')->name('system.accounts.show');
    Route::patch('/system/accounts/{id}', [SystemSettingsController::class, 'manageAccount'])->whereNumber('id')->name('system.accounts.update');
    Route::get('/system/settings', [SystemSettingsController::class, 'index'])->name('system.settings');
    Route::get('/system/database/export', [DatabaseBackupController::class, 'export'])->middleware('throttle:2,1')->name('system.database.export');
    Route::post('/system/database/import', [DatabaseBackupController::class, 'import'])->middleware('throttle:1,10')->name('system.database.import');
    Route::post('/system/database/restore', [DatabaseBackupController::class, 'restore'])->middleware('throttle:1,10')->name('system.database.restore');
    Route::post('/system/settings', [SystemSettingsController::class, 'update'])->name('system.settings.update');
    Route::post('/system/branding', [SystemSettingsController::class, 'updateBranding'])->name('system.branding.update');
    Route::get('/system/data-scope', [SystemSettingsController::class, 'scopeOptions'])->name('system.scope.options');
    Route::post('/system/data-scope', [SystemSettingsController::class, 'scope'])->name('system.scope');
    Route::post('/system/nationalities', [SystemSettingsController::class, 'storeNationality'])->name('system.nationalities.store');
    Route::patch('/system/nationalities/{option}', [SystemSettingsController::class, 'updateNationality'])->whereNumber('option')->name('system.nationalities.update');
    Route::delete('/system/nationalities/{option}', [SystemSettingsController::class, 'deleteNationality'])->whereNumber('option')->name('system.nationalities.destroy');
    Route::get('/system/training-types', [SystemSettingsController::class, 'trainingTypes'])->name('system.training-types.index');
    Route::post('/system/training-types', [SystemSettingsController::class, 'storeTrainingType'])->name('system.training-types.store');
    Route::patch('/system/training-types/{option}', [SystemSettingsController::class, 'updateTrainingType'])->whereNumber('option')->name('system.training-types.update');
    Route::delete('/system/training-types/{option}', [SystemSettingsController::class, 'deleteTrainingType'])->whereNumber('option')->name('system.training-types.destroy');
    Route::patch('/system/offices/{id}', [SystemSettingsController::class, 'updateOffice'])->whereNumber('id')->name('system.offices.update');
    Route::delete('/system/offices/{id}', [SystemSettingsController::class, 'deleteOffice'])->whereNumber('id')->name('system.offices.destroy');
    Route::post('/system/offices', [SystemSettingsController::class, 'office'])->name('system.offices.store');
    Route::post('/system/roles', [SystemSettingsController::class, 'role'])->name('system.roles.store');
    Route::patch('/system/roles/{role}', [SystemSettingsController::class, 'role'])->whereNumber('role')->name('system.roles.update');
    Route::post('/system/role-credentials', [SystemSettingsController::class, 'roleCredential'])->name('system.role-credentials.store');
    Route::patch('/system/role-credentials/{credential}', [SystemSettingsController::class, 'roleCredential'])->whereNumber('credential')->name('system.role-credentials.update');
    Route::delete('/system/role-credentials/{credential}', [SystemSettingsController::class, 'destroyRoleCredential'])->whereNumber('credential')->name('system.role-credentials.destroy');
    Route::patch('/system/super-admins', [SystemSettingsController::class, 'manageSuperAdministrators'])->name('system.super-admins.update');
    Route::get('/operations/notifications', [OperationsController::class, 'notifications'])->name('operations.notifications');
    Route::get('/operations/training-queue-counts', [OperationsController::class, 'queueCounts'])->name('operations.training-queue-counts');
    Route::patch('/operations/notifications/{id}', [OperationsController::class, 'readNotification'])->whereNumber('id')->name('operations.notifications.read');
    Route::get('/operations/evaluations', [OperationsController::class, 'evaluations'])->name('operations.evaluations.index');
    Route::post('/operations/evaluations', [OperationsController::class, 'evaluation'])->name('operations.evaluations.store');
    Route::post('/operations/trainings/{id}/status', [OperationsController::class, 'transition'])->whereNumber('id')->name('operations.trainings.status');
    Route::post('/operations/trainings/bulk-status', [OperationsController::class, 'bulkTransition'])->middleware('throttle:30,1')->name('operations.trainings.bulk-status');
    Route::post('/operations/trainings/{id}/attachments', [OperationsController::class, 'attachment'])->whereNumber('id')->name('operations.trainings.attachments');
    Route::get('/operations/trainings/{id}/attachments/{attachment}', [OperationsController::class, 'download'])->whereNumber(['id', 'attachment'])->name('operations.trainings.download');
    Route::post('/operations/trainings/{id}/enrollment', [OperationsController::class, 'link'])->whereNumber('id')->name('operations.trainings.enrollment');
    Route::get('/operations/{module}', [OperationsController::class, 'index'])->whereIn('module', ModuleAccess::MODULES)->name('operations.index');
    Route::post('/operations/{module}', [OperationsController::class, 'store'])->whereIn('module', ModuleAccess::MODULES)->middleware('throttle:60,1')->name('operations.store');
    Route::patch('/operations/{module}/{id}', [OperationsController::class, 'update'])->whereIn('module', ModuleAccess::MODULES)->whereNumber('id')->name('operations.update');
    Route::delete('/operations/{module}/{id}', [OperationsController::class, 'destroy'])->whereIn('module', ModuleAccess::MODULES)->whereNumber('id')->name('operations.destroy');
    Route::get('/administration/audit-logs', [AuditLogController::class, 'index'])->name('audit.index');
    Route::get('/administration/audit-logs/export', [AuditLogController::class, 'export'])->name('audit.export');
    Route::delete('/administration/audit-logs', [AuditLogController::class, 'destroy'])->middleware('throttle:10,1')->name('audit.destroy');
    Route::get('/administration/audit-deletion-requests', [AuditLogController::class, 'pendingDeletions'])->name('audit.deletions.pending');
    Route::patch('/administration/audit-deletion-requests/{id}', [AuditLogController::class, 'resolveDeletion'])->whereNumber('id')->name('audit.deletions.resolve');
    Route::get('/administration/accounts/options', [AccountRegistrationController::class, 'options'])->name('accounts.options');
    Route::get('/administration/accounts', [AccountRegistrationController::class, 'index'])->name('accounts.index');
    Route::post('/administration/accounts', [AccountRegistrationController::class, 'store'])->middleware('throttle:10,1')->name('accounts.store');
    Route::patch('/administration/accounts/{user}', [AccountRegistrationController::class, 'update'])->name('accounts.update');

    Route::view('/app/admin/administration/create/register', 'admin.administration.create.register')->name('admin.administration.create.register');
    Route::view('/app/admin/administration/details/all-status', 'admin.administration.details.all-status')->name('admin.administration.details.all-status');
    Route::view('/app/admin/administration/details/approved-accepted', 'admin.administration.details.approved-accepted')->name('admin.administration.details.approved-accepted');
    Route::view('/app/admin/administration/details/inactive', 'admin.administration.details.inactive')->name('admin.administration.details.inactive');
    Route::get('/app/admin/administration/details/trash', [SystemSettingsController::class, 'trash'])->name('admin.administration.details.trash');
    Route::view('/app/admin/administration/id/edit-user', 'admin.administration.id.edit-user')->name('admin.administration.id.edit-user');
    Route::view('/app/admin/administration/id/view-user', 'admin.administration.id.view-user')->name('admin.administration.id.view-user');
    Route::view('/app/admin/administration/update/for-approval', 'admin.administration.update.for-approval')->name('admin.administration.update.for-approval');
    Route::get('/app/admin/dashboard/dashboard', [OperationsController::class, 'dashboard'])->name('admin.dashboard.dashboard');
    Route::view('/app/admin/evaluation/create/post-test-register', 'admin.evaluation.create.post-test-register')->name('admin.evaluation.create.post-test-register');
    Route::view('/app/admin/evaluation/create/pre-test-register', 'admin.evaluation.create.pre-test-register')->name('admin.evaluation.create.pre-test-register');
    Route::view('/app/admin/evaluation/create/rp-evaluation-register', 'admin.evaluation.create.rp-evaluation-register')->name('admin.evaluation.create.rp-evaluation-register');
    Route::view('/app/admin/evaluation/create/training-evaluation-register', 'admin.evaluation.create.training-evaluation-register')->name('admin.evaluation.create.training-evaluation-register');
    Route::view('/app/admin/evaluation/details/draft-questionnaire', 'admin.evaluation.details.draft-questionnaire')->name('admin.evaluation.details.draft-questionnaire');
    Route::view('/app/admin/evaluation/details/encoded-post-test', 'admin.evaluation.details.encoded-post-test')->name('admin.evaluation.details.encoded-post-test');
    Route::view('/app/admin/evaluation/details/encoded-pre-test', 'admin.evaluation.details.encoded-pre-test')->name('admin.evaluation.details.encoded-pre-test');
    Route::view('/app/admin/evaluation/details/encoded-rp-evaluation', 'admin.evaluation.details.encoded-rp-evaluation')->name('admin.evaluation.details.encoded-rp-evaluation');
    Route::view('/app/admin/evaluation/details/encoded-training-evaluation', 'admin.evaluation.details.encoded-training-evaluation')->name('admin.evaluation.details.encoded-training-evaluation');
    Route::view('/app/admin/evaluation/details/inactive', 'admin.evaluation.details.inactive')->name('admin.evaluation.details.inactive');
    Route::view('/app/admin/evaluation/details/list-questionnaire', 'admin.evaluation.details.list-questionnaire')->name('admin.evaluation.details.list-questionnaire');
    Route::view('/app/admin/evaluation/encode/post-test', 'admin.evaluation.encode.post-test')->name('admin.evaluation.encode.post-test');
    Route::view('/app/admin/evaluation/encode/pre-test', 'admin.evaluation.encode.pre-test')->name('admin.evaluation.encode.pre-test');
    Route::view('/app/admin/evaluation/encode/rp-evaluation', 'admin.evaluation.encode.rp-evaluation')->name('admin.evaluation.encode.rp-evaluation');
    Route::view('/app/admin/evaluation/encode/training-evaluation', 'admin.evaluation.encode.training-evaluation')->name('admin.evaluation.encode.training-evaluation');
    Route::view('/app/admin/evaluation/id/edit-post-test', 'admin.evaluation.id.edit-post-test')->name('admin.evaluation.id.edit-post-test');
    Route::view('/app/admin/evaluation/id/edit-pre-test', 'admin.evaluation.id.edit-pre-test')->name('admin.evaluation.id.edit-pre-test');
    Route::view('/app/admin/evaluation/id/edit-rp-evaluation', 'admin.evaluation.id.edit-rp-evaluation')->name('admin.evaluation.id.edit-rp-evaluation');
    Route::view('/app/admin/evaluation/id/edit-training-evaluation', 'admin.evaluation.id.edit-training-evaluation')->name('admin.evaluation.id.edit-training-evaluation');
    Route::view('/app/admin/evaluation/id/view-post-test', 'admin.evaluation.id.view-post-test')->name('admin.evaluation.id.view-post-test');
    Route::view('/app/admin/evaluation/id/view-pre-test', 'admin.evaluation.id.view-pre-test')->name('admin.evaluation.id.view-pre-test');
    Route::view('/app/admin/evaluation/id/view-rp-evaluation', 'admin.evaluation.id.view-rp-evaluation')->name('admin.evaluation.id.view-rp-evaluation');
    Route::view('/app/admin/evaluation/id/view-training-evaluation', 'admin.evaluation.id.view-training-evaluation')->name('admin.evaluation.id.view-training-evaluation');
    Route::view('/app/admin/notification/details/all-notification', 'admin.notification.details.all-notification')->name('admin.notification.details.all-notification');
    // Notification composition is a system-administrator capability, including for direct URL access.
    Route::get('/app/admin/notification/notification', function (Request $request): View {
        abort_unless(ModuleAccess::isAdministrator($request->user()), 403);

        return view('admin.notification.notification');
    })->name('admin.notification.notification');
    Route::view('/app/admin/participants/create/fa-register', 'admin.participants.create.fa-register')->name('admin.participants.create.fa-register');
    Route::view('/app/admin/participants/create/register', 'admin.participants.create.register')->name('admin.participants.create.register');
    Route::view('/app/admin/participants/details/all-with-status', 'admin.participants.details.all-with-status')->name('admin.participants.details.all-with-status');
    Route::view('/app/admin/participants/details/fa-all-list', 'admin.participants.details.fa-all-list')->name('admin.participants.details.fa-all-list');
    Route::view('/app/admin/participants/details/fa-inactive', 'admin.participants.details.fa-inactive')->name('admin.participants.details.fa-inactive');
    Route::view('/app/admin/participants/details/inactive', 'admin.participants.details.inactive')->name('admin.participants.details.inactive');
<<<<<<< HEAD
    Route::view('/app/admin/participants/id/edit-fa', 'admin.participants.id.edit-fa')->name('admin.participants.id.edit-fa');
    Route::view('/app/admin/participants/id/edit-farmer/{farmer?}', 'admin.participants.id.edit-farmer')->where('farmer', '[0-9]{8,}')->name('admin.participants.id.edit-farmer');
    Route::view('/app/admin/participants/id/view-fa', 'admin.participants.id.view-fa')->name('admin.participants.id.view-fa');
    Route::view('/app/admin/participants/id/view-farmer/{farmer?}', 'admin.participants.id.view-farmer')->where('farmer', '[0-9]{8,}')->name('admin.participants.id.view-farmer');
=======
    Route::view('/app/admin/participants/id/edit-fa/{id?}', 'admin.participants.id.edit-fa')->where('id', '[A-Za-z0-9:_-]+')->name('admin.participants.id.edit-fa');
    Route::view('/app/admin/participants/id/edit-farmer/{id?}', 'admin.participants.id.edit-farmer')->name('admin.participants.id.edit-farmer');
    Route::view('/app/admin/participants/id/view-fa/{id?}', 'admin.participants.id.view-fa')->where('id', '[A-Za-z0-9:_-]+')->name('admin.participants.id.view-fa');
    Route::view('/app/admin/participants/id/view-farmer/{id?}', 'admin.participants.id.view-farmer')->name('admin.participants.id.view-farmer');
>>>>>>> 332963f28688daffde7d152b170d14b6d358c39e
    Route::view('/app/admin/training/create/register', 'admin.training.create.register')->name('admin.training.create.register');
    Route::view('/app/admin/training/create/rp-register', 'admin.training.create.rp-register')->name('admin.training.create.rp-register');
    Route::view('/app/admin/training/details/all-status', 'admin.training.details.all-status')->name('admin.training.details.all-status');
    Route::view('/app/admin/training/details/approved-accepted', 'admin.training.details.approved-accepted')->name('admin.training.details.approved-accepted');
    Route::view('/app/admin/training/details/inactive', 'admin.training.details.inactive')->name('admin.training.details.inactive');
    Route::view('/app/admin/training/details/incomplete', 'admin.training.details.incomplete')->name('admin.training.details.incomplete');
    Route::view('/app/admin/training/details/rp-inactive', 'admin.training.details.rp-inactive')->name('admin.training.details.rp-inactive');
    Route::view('/app/admin/training/details/rp-list', 'admin.training.details.rp-list')->name('admin.training.details.rp-list');
    Route::view('/app/admin/training/id/edit-rp', 'admin.training.id.edit-rp')->name('admin.training.id.edit-rp');
    Route::view('/app/admin/training/id/edit-training/{id?}', 'admin.training.id.edit-training')->name('admin.training.id.edit-training');
    Route::view('/app/admin/training/id/view-rp', 'admin.training.id.view-rp')->name('admin.training.id.view-rp');
    Route::view('/app/admin/training/id/view-training/{id?}', 'admin.training.id.view-training')->name('admin.training.id.view-training');
    Route::view('/app/admin/training/update/for-approval', 'admin.training.update.for-approval')->name('admin.training.update.for-approval');
    Route::view('/app/admin/training/update/for-acceptance', 'admin.training.update.for-acceptance')->name('admin.training.update.for-acceptance');
    Route::view('/app/admin/training/update/for-review', 'admin.training.update.for-review')->name('admin.training.update.for-review');
    Route::get('/app/admin/users/logs', [OperationsController::class, 'logs'])->name('admin.users.logs');
    Route::get('/app/admin/users/profile', [OperationsController::class, 'profile'])->name('admin.users.profile');

    // Keep bookmarked page URLs working, including record query parameters.
    Route::get('/app/admin/administration/create/register.html', fn (Request $request) => redirect()->route('admin.administration.create.register', $request->query(), 301));
    Route::get('/app/admin/administration/details/all-status.html', fn (Request $request) => redirect()->route('admin.administration.details.all-status', $request->query(), 301));
    Route::get('/app/admin/administration/details/approved-accepted.html', fn (Request $request) => redirect()->route('admin.administration.details.approved-accepted', $request->query(), 301));
    Route::get('/app/admin/administration/details/inactive.html', fn (Request $request) => redirect()->route('admin.administration.details.inactive', $request->query(), 301));
    Route::get('/app/admin/administration/details/trash.html', fn (Request $request) => redirect()->route('admin.administration.details.trash', $request->query(), 301));
    Route::get('/app/admin/administration/id/edit-user.html', fn (Request $request) => redirect()->route('admin.administration.id.edit-user', $request->query(), 301));
    Route::get('/app/admin/administration/id/view-user.html', fn (Request $request) => redirect()->route('admin.administration.id.view-user', $request->query(), 301));
    Route::get('/app/admin/administration/update/for-approval.html', fn (Request $request) => redirect()->route('admin.administration.update.for-approval', $request->query(), 301));
    Route::get('/app/admin/dashboard/dashboard.html', fn (Request $request) => redirect()->route('admin.dashboard.dashboard', $request->query(), 301));
    Route::get('/app/admin/evaluation/create/post-test-register.html', fn (Request $request) => redirect()->route('admin.evaluation.create.post-test-register', $request->query(), 301));
    Route::get('/app/admin/evaluation/create/pre-test-register.html', fn (Request $request) => redirect()->route('admin.evaluation.create.pre-test-register', $request->query(), 301));
    Route::get('/app/admin/evaluation/create/rp-evaluation-register.html', fn (Request $request) => redirect()->route('admin.evaluation.create.rp-evaluation-register', $request->query(), 301));
    Route::get('/app/admin/evaluation/create/training-evaluation-register.html', fn (Request $request) => redirect()->route('admin.evaluation.create.training-evaluation-register', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/draft-questionnaire.html', fn (Request $request) => redirect()->route('admin.evaluation.details.draft-questionnaire', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/encoded-post-test.html', fn (Request $request) => redirect()->route('admin.evaluation.details.encoded-post-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/encoded-pre-test.html', fn (Request $request) => redirect()->route('admin.evaluation.details.encoded-pre-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/encoded-rp-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.details.encoded-rp-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/encoded-training-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.details.encoded-training-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/inactive.html', fn (Request $request) => redirect()->route('admin.evaluation.details.inactive', $request->query(), 301));
    Route::get('/app/admin/evaluation/details/list-questionnaire.html', fn (Request $request) => redirect()->route('admin.evaluation.details.list-questionnaire', $request->query(), 301));
    Route::get('/app/admin/evaluation/encode/post-test.html', fn (Request $request) => redirect()->route('admin.evaluation.encode.post-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/encode/pre-test.html', fn (Request $request) => redirect()->route('admin.evaluation.encode.pre-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/encode/rp-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.encode.rp-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/encode/training-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.encode.training-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/edit-post-test.html', fn (Request $request) => redirect()->route('admin.evaluation.id.edit-post-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/edit-pre-test.html', fn (Request $request) => redirect()->route('admin.evaluation.id.edit-pre-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/edit-rp-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.id.edit-rp-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/edit-training-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.id.edit-training-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/view-post-test.html', fn (Request $request) => redirect()->route('admin.evaluation.id.view-post-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/view-pre-test.html', fn (Request $request) => redirect()->route('admin.evaluation.id.view-pre-test', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/view-rp-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.id.view-rp-evaluation', $request->query(), 301));
    Route::get('/app/admin/evaluation/id/view-training-evaluation.html', fn (Request $request) => redirect()->route('admin.evaluation.id.view-training-evaluation', $request->query(), 301));
    Route::get('/app/admin/notification/details/all-notification.html', fn (Request $request) => redirect()->route('admin.notification.details.all-notification', $request->query(), 301));
    Route::get('/app/admin/notification/notification.html', fn (Request $request) => redirect()->route('admin.notification.notification', $request->query(), 301));
    Route::get('/app/admin/participants/create/fa-register.html', fn (Request $request) => redirect()->route('admin.participants.create.fa-register', $request->query(), 301));
    Route::get('/app/admin/participants/create/register.html', fn (Request $request) => redirect()->route('admin.participants.create.register', $request->query(), 301));
    Route::get('/app/admin/participants/details/all-with-status.html', fn (Request $request) => redirect()->route('admin.participants.details.all-with-status', $request->query(), 301));
    Route::get('/app/admin/participants/details/fa-all-list.html', fn (Request $request) => redirect()->route('admin.participants.details.fa-all-list', $request->query(), 301));
    Route::get('/app/admin/participants/details/fa-inactive.html', fn (Request $request) => redirect()->route('admin.participants.details.fa-inactive', $request->query(), 301));
    Route::get('/app/admin/participants/details/inactive.html', fn (Request $request) => redirect()->route('admin.participants.details.inactive', $request->query(), 301));
    Route::get('/app/admin/participants/id/edit-fa.html', fn (Request $request) => redirect()->route(
        'admin.participants.id.edit-fa',
        $request->filled('faId') ? ['id' => $request->query('faId')] : $request->query(),
        301,
    ));
    Route::get('/app/admin/participants/id/edit-farmer.html', fn (Request $request) => redirect()->route('admin.participants.id.edit-farmer', $request->query(), 301));
    Route::get('/app/admin/participants/id/view-fa.html', fn (Request $request) => redirect()->route(
        'admin.participants.id.view-fa',
        $request->filled('faId') ? ['id' => $request->query('faId')] : $request->query(),
        301,
    ));
    Route::get('/app/admin/participants/id/view-farmer.html', fn (Request $request) => redirect()->route('admin.participants.id.view-farmer', $request->query(), 301));
    Route::get('/app/admin/training/create/register.html', fn (Request $request) => redirect()->route('admin.training.create.register', $request->query(), 301));
    Route::get('/app/admin/training/create/rp-register.html', fn (Request $request) => redirect()->route('admin.training.create.rp-register', $request->query(), 301));
    Route::get('/app/admin/training/details/all-status.html', fn (Request $request) => redirect()->route('admin.training.details.all-status', $request->query(), 301));
    Route::get('/app/admin/training/details/approved-accepted.html', fn (Request $request) => redirect()->route('admin.training.details.approved-accepted', $request->query(), 301));
    Route::get('/app/admin/training/details/inactive.html', fn (Request $request) => redirect()->route('admin.training.details.inactive', $request->query(), 301));
    Route::get('/app/admin/training/details/incomplete.html', fn (Request $request) => redirect()->route('admin.training.details.incomplete', $request->query(), 301));
    Route::get('/app/admin/training/details/rp-inactive.html', fn (Request $request) => redirect()->route('admin.training.details.rp-inactive', $request->query(), 301));
    Route::get('/app/admin/training/details/rp-list.html', fn (Request $request) => redirect()->route('admin.training.details.rp-list', $request->query(), 301));
    Route::get('/app/admin/training/id/edit-rp.html', fn (Request $request) => redirect()->route('admin.training.id.edit-rp', $request->query(), 301));
    Route::get('/app/admin/training/id/edit-training.html', fn (Request $request) => redirect()->route('admin.training.id.edit-training', $request->query(), 301));
    Route::get('/app/admin/training/id/view-rp.html', fn (Request $request) => redirect()->route('admin.training.id.view-rp', $request->query(), 301));
    Route::get('/app/admin/training/id/view-training.html', fn (Request $request) => redirect()->route('admin.training.id.view-training', $request->query(), 301));
    Route::get('/app/admin/training/update/for-approval.html', fn (Request $request) => redirect()->route('admin.training.update.for-approval', $request->query(), 301));
    Route::get('/app/admin/training/update/for-acceptance.html', fn (Request $request) => redirect()->route('admin.training.update.for-acceptance', $request->query(), 301));
    Route::get('/app/admin/training/update/for-review.html', fn (Request $request) => redirect()->route('admin.training.update.for-review', $request->query(), 301));
    Route::get('/app/admin/users/logs.html', fn (Request $request) => redirect()->route('admin.users.logs', $request->query(), 301));
    Route::get('/app/admin/users/profile.html', fn (Request $request) => redirect()->route('admin.users.profile', $request->query(), 301));
});
