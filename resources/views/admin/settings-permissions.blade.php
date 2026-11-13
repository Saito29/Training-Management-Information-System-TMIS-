<div class="settings-permission-grid">
@php($permissionInputName = $permissionInputName ?? 'permissions[]')
@php($deniedPermissionEditor = $deniedPermissionEditor ?? false)
@foreach(collect($permissions)->groupBy(fn ($permission) => explode('.', $permission)[0]) as $module => $modulePermissions)
@php($modulePermissions = $modulePermissions->filter(fn ($permission) => substr_count($permission, '.') === 1 && !str_ends_with($permission, '.page_access') && !str_ends_with($permission, '.write')))
@php($pageAccessPermission = \App\Support\ModuleAccess::pageAccessPermission($module))
@php($pageAccessEnabled = in_array($pageAccessPermission, $selectedPermissions, true))
{{-- Keep a category-level master switch beside its title; it applies only to this grant or block group. --}}
<div class="settings-permission-group"><div class="settings-permission-group-heading"><h4>{{ ['trainings' => 'Trainings', 'participants' => 'Participants', 'associations' => 'Farmer associations', 'resource_persons' => 'Resource persons', 'questionnaires' => 'Questionnaires', 'evaluations' => 'Assessments & evaluations', 'administration' => 'User administration'][$module] ?? ucfirst($module) }}</h4><label class="form-check form-switch settings-permission-select-all" for="{{ $prefix }}-{{ $module }}-select-all"><input id="{{ $prefix }}-{{ $module }}-select-all" class="form-check-input" type="checkbox" role="switch" data-permission-select-all><span>Select all</span></label></div>
@foreach($modulePermissions as $permission)
@php($action = explode('.', $permission)[1])
@php($legacyWritePermission = str_ends_with($permission, '.create') ? substr($permission, 0, -7).'.write' : (str_ends_with($permission, '.edit') ? substr($permission, 0, -5).'.write' : null))
@php($permissionSelected = in_array($permission, $selectedPermissions, true) || ($legacyWritePermission !== null && in_array($legacyWritePermission, $selectedPermissions, true)))
<div class="form-check form-switch"><input id="{{ $prefix }}-{{ str_replace('.', '-', $permission) }}" class="form-check-input" type="checkbox" role="switch" name="{{ $permissionInputName }}" value="{{ $permission }}" @checked($permissionSelected)><label class="form-check-label" for="{{ $prefix }}-{{ str_replace('.', '-', $permission) }}">{{ $module === 'administration' && $action === 'approve' ? 'Approve or reject accounts' : (['read' => 'View records', 'create' => 'Create records', 'edit' => 'Edit records', 'delete' => 'Delete records', 'submit' => 'Submit for approval', 'approve' => 'Move to acceptance & return to review', 'accept' => 'Manage acceptance queue (final approval is System Administrator-only)'][$action] ?? ucfirst($action)) }}</label></div>
@endforeach
<div class="settings-page-permissions">
@if(!$deniedPermissionEditor)
<div class="form-check form-switch"><input id="{{ $prefix }}-{{ $module }}-page-access" class="form-check-input" type="checkbox" role="switch" name="{{ $permissionInputName }}" value="{{ $pageAccessPermission }}" data-page-access-toggle data-page-access-module="{{ $module }}" @checked($pageAccessEnabled)><label class="form-check-label" for="{{ $prefix }}-{{ $module }}-page-access">Limit access to selected pages</label></div>
<p class="settings-field-help">When enabled, only selected pages are available. Otherwise, View records grants access to all pages.</p>
@endif
<div class="settings-page-permission-list" @if(!$deniedPermissionEditor) data-page-access-list="{{ $module }}" @endif>
@foreach($navigationPages[$module] ?? [] as $page => $details)
@php($pagePermission = \App\Support\ModuleAccess::pagePermission($module, $page))
<div class="form-check form-switch"><input id="{{ $prefix }}-{{ str_replace('.', '-', $pagePermission) }}" class="form-check-input" type="checkbox" role="switch" name="{{ $permissionInputName }}" value="{{ $pagePermission }}" @if(!$deniedPermissionEditor) data-page-access-option {{ !$pageAccessEnabled ? 'disabled' : '' }} @endif @checked(in_array($pagePermission, $selectedPermissions, true))><label class="form-check-label" for="{{ $prefix }}-{{ str_replace('.', '-', $pagePermission) }}">{{ $details['label'] }}</label></div>
@endforeach
</div>
</div>
</div>
@endforeach
</div>
