<?php

use App\Http\Middleware\EnsureSystemAvailable;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [EnsureSystemAvailable::class]);
        $middleware->redirectUsersTo(fn (Request $request): string => route('admin.dashboard.dashboard'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (Response $response): Response {
            $request = request();
            $json = $request->expectsJson() || $request->is('api/*');
            if ($response->getStatusCode() === 403 && ! $json) {
                return response()->view('errors.404', [], 404, ['Cache-Control' => 'no-store']);
            }
            if ($response->getStatusCode() >= 500 && $response->getStatusCode() !== 503) {
                return $json
                    ? response()->json(['message' => 'A system error occurred. Please try again later.'], 500)
                    : response()->view('errors.500', [], 500, ['Cache-Control' => 'no-store']);
            }

            return $response;
        });
        $exceptions->dontFlash(['token', 'verification_code', 'sensitive', 'code', 'secret', 'recoveryCodes']);
        $exceptions->render(function (ThrottleRequestsException $exception, Request $request): ?RedirectResponse {
            if ($request->expectsJson() || ! $request->routeIs('login.store', 'verification.*', 'password.*')) {
                return null;
            }

            $route = $request->routeIs('verification.*') ? 'verification' : ($request->routeIs('password.*') ? 'password.request' : 'login');

            return redirect()->route($route)
                ->withErrors(['authentication' => 'Too many attempts. Please wait a minute before trying again.'])
                ->with('toast_type', 'warning');
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
