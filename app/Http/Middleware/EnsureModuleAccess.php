<?php

namespace App\Http\Middleware;

use App\Support\ModuleAccess;
use App\Support\OriginalInterfaceData;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path();
        $page = basename($path, '.html');
        if (str_starts_with($path, 'app/admin/administration/')) {
            $navigationPage = ModuleAccess::navigationPage($path);
            if ($navigationPage && $navigationPage['module'] === 'administration') {
                ModuleAccess::authorizeNavigationPage($request, 'administration', $navigationPage['page']);
            } else {
                ModuleAccess::authorize($request, 'administration.read');
            }
            if (str_contains($path, '/create/')) {
                ModuleAccess::authorize($request, 'administration.create');
            }
            if (str_contains($path, '/id/edit-') || str_contains($path, '/id/edit/')) {
                ModuleAccess::authorize($request, 'administration.edit');
            }
            if (str_contains($path, '/update/for-approval')) {
                ModuleAccess::authorize($request, 'administration.approve');
            }
        }
        if ($request->is('app/admin/notification/notification', 'app/admin/notification/notification.html')) {
            abort_unless(ModuleAccess::isAdministrator($request->user()), 403);
        }
        $module = match (true) {
            str_starts_with($path, 'app/admin/training/') => str_contains($path, 'rp-') || str_contains($path, '-rp') ? 'resource_persons' : 'trainings',
            str_starts_with($path, 'app/admin/participants/') => str_starts_with($page, 'fa-') || str_ends_with($page, '-fa') ? 'associations' : 'participants',
            str_starts_with($path, 'app/admin/evaluation/') => str_contains($path, '/encode/') || str_contains($path, 'encoded-') ? 'evaluations' : 'questionnaires',
            default => null,
        };
        if ($module) {
            $navigationPage = ModuleAccess::navigationPage($path);
            if ($navigationPage && $navigationPage['module'] === $module) {
                ModuleAccess::authorizeNavigationPage($request, $module, $navigationPage['page']);
            } else {
                ModuleAccess::authorize($request, $module.'.read');
            }
            if (str_contains($path, '/create/') || str_contains($path, '/encode/')) {
                ModuleAccess::authorize($request, $module.'.create');
            }
            if (str_contains($path, '/id/edit-')) {
                ModuleAccess::authorize($request, $module.'.edit');
            }
            if (str_contains($path, '/id/') && ! str_ends_with($path, '.html') && in_array($module, ['participants', 'associations', 'trainings', 'resource_persons'], true)) {
                $id = $request->query('id', $request->query('faId', $request->query('farmerId')));
                if ($id !== null) {
                    abort_unless(is_string($id) && strlen($id) <= 100 && OriginalInterfaceData::find($request->user(), $module, $id), 404);
                }
            }
            if (str_contains($path, '/update/for-review')) {
                ModuleAccess::authorize($request, 'trainings.submit');
            }
            if (str_contains($path, '/update/for-approval')) {
                ModuleAccess::authorize($request, 'trainings.approve');
            }
            if (str_contains($path, '/update/for-acceptance')) {
                ModuleAccess::authorize($request, 'trainings.accept');
            }
        }

        return $next($request);
    }
}
