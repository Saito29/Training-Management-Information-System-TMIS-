<?php

use App\Http\Controllers\Authentication\EmailVerificationController;
use App\Http\Controllers\Authentication\LoginController;
use App\Http\Controllers\Authentication\PasswordRecoveryController;
use App\Http\Controllers\Authentication\ProfileController;
use App\Http\Controllers\Authentication\ProfilePhotoController;
use App\Http\Controllers\Authentication\ProfileSecurityController;
use App\Http\Middleware\Authentication\EnsureEligibleUser;
use Illuminate\Support\Facades\Route;

Route::middleware(EnsureEligibleUser::class.':optional')->group(function (): void {
    Route::view('/maintenance/sign-in', 'authentication.login')->middleware('guest')->name('maintenance.login');
    Route::post('/maintenance/sign-in', [LoginController::class, 'store'])->middleware(['guest', 'throttle:login'])->name('maintenance.login.store');
    Route::view('/', 'authentication.login')->middleware('guest')->name('login');
    Route::post('/login', [LoginController::class, 'store'])->middleware(['guest', 'throttle:login'])->name('login.store');
    Route::get('/two-factor', [EmailVerificationController::class, 'show'])->middleware('guest')->name('verification');
    Route::post('/two-factor', [EmailVerificationController::class, 'store'])->middleware(['guest', 'throttle:10,1'])->name('verification.store');
    Route::post('/two-factor/resend', [EmailVerificationController::class, 'resend'])->middleware(['guest', 'throttle:5,1'])->name('verification.resend');
    Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');
    Route::view('/forgot-password', 'authentication.forget_password')->middleware('guest')->name('password.request');
    Route::post('/forgot-password', [PasswordRecoveryController::class, 'send'])->middleware(['guest', 'throttle:5,1'])->name('password.email');
    Route::get('/reset-password', [PasswordRecoveryController::class, 'show'])->middleware('guest')->name('password.reset');
    Route::post('/reset-password', [PasswordRecoveryController::class, 'update'])->middleware(['guest', 'throttle:5,1'])->name('password.update');

    Route::redirect('/app/authentication/login.html', '/');
});

Route::patch('/profile/personal-information', [ProfileController::class, 'update'])->middleware(EnsureEligibleUser::class)->name('profile.update');

Route::middleware(EnsureEligibleUser::class)->group(function (): void {
    Route::post('/profile/photo', [ProfilePhotoController::class, 'store'])->middleware('throttle:10,1')->name('profile.photo.store');
    Route::get('/profile/photo', [ProfilePhotoController::class, 'show'])->name('profile.photo');
    Route::delete('/profile/photo', [ProfilePhotoController::class, 'destroy'])->name('profile.photo.destroy');
    Route::get('/profile/security', [ProfileSecurityController::class, 'show']);
    Route::get('/profile/security/logs', [ProfileSecurityController::class, 'logs']);
    Route::get('/profile/security/sessions', [ProfileSecurityController::class, 'sessions']);
    Route::post('/profile/security/sessions/{action}', [ProfileSecurityController::class, 'revoke'])->whereIn('action', ['revoke', 'revoke-others'])->middleware('throttle:10,1');
    Route::post('/profile/security/{action}', [ProfileSecurityController::class, 'action'])->whereIn('action', ['setup', 'enable', 'cancel', 'disable', 'recovery', 'password'])->middleware('throttle:6,1');
});
