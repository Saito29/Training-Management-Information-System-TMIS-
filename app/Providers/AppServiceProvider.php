<?php

namespace App\Providers;

use App\Http\Authentication\AccountDisplay;
use App\Http\Authentication\AuditTrail;
use App\Support\ModuleAccess;
use App\Support\OriginalInterfaceData;
use App\Support\SystemBranding;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(Login::class, function (Login $event): void {
            AuditTrail::record(request(), 'login_success', $event->user, category: 'security');
        });
        Event::listen(Logout::class, function (Logout $event): void {
            if ($event->user !== null) {
                AuditTrail::record(request(), 'logout', $event->user, category: 'security');
            }
        });
        View::composer('admin.*', function (\Illuminate\View\View $view): void {
            $view->with('accountDisplay', app(AccountDisplay::class)->forUser(auth()->user()));
            $view->with('systemBranding', app(SystemBranding::class)->forDisplay());
            if (auth()->check() && request()->is('app/admin/*', 'system/*')) {
                $data = request()->attributes->get('original_interface_data');
                if ($data === null) {
                    $data = app(OriginalInterfaceData::class)->bootstrap(auth()->user());
                    request()->attributes->set('original_interface_data', $data);
                }
                $view->with('originalInterfaceData', $data);
            }
        });
        View::composer('layouts.admin', function (\Illuminate\View\View $view): void {
            $view->with('navigationAccess', ModuleAccess::navigationAccess(auth()->user()));
        });
        View::composer(['authentication.login', 'authentication.two_factor', 'errors.503'], function (\Illuminate\View\View $view): void {
            $view->with('systemBranding', app(SystemBranding::class)->forDisplay());
        });

        RateLimiter::for('login', function (Request $request): array {
            $email = $request->input('email');

            return [
                Limit::perMinute(20)->by('ip:'.$request->ip()),
                Limit::perMinute(5)->by('account:'.hash('sha256', is_string($email) ? strtolower(trim($email)).'|'.$request->ip() : $request->ip())),
            ];
        });
    }
}
