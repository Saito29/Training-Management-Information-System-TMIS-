<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/png" href="{{ $systemBranding['faviconUrl'] ?? asset('assets/logo/DA Logo/DA logo_120519.png') }}">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#123e32" />
    @vite('resources/js/authentication/page.js')
    <title>Verify your email | {{ $systemBranding['name'] ?? 'TMIS' }}</title>
  </head>
  <body>
    <main class="authenticator-container">
      <aside class="authenticator-left" aria-label="About TMIS">
        <div class="brand"><img class="brand-mark" style="object-fit:contain;padding:5px;background:#fff" src="{{ $systemBranding['logoUrl'] ?? asset('assets/logo/DA Logo/DA logo_120519.png') }}" alt=""><div><strong>{{ $systemBranding['name'] ?? 'TMIS' }}</strong><span>TRAINING MANAGEMENT</span></div></div>
        <div class="brand-story">
          <span class="eyebrow">TRAINING MANAGEMENT INFORMATION SYSTEM</span>
          <h1>Growing skills.<br />Building a<br /><em>stronger tomorrow.</em></h1>
          <p>A shared space to plan training, track progress, and support your team's development.</p>
          <div class="brand-features"><span>Plan with purpose</span><span>Track your impact</span></div>
        </div>
        <footer class="brand-footer">Built for learning and development <span>Training Management Information System</span></footer>
        <div class="field-lines" aria-hidden="true"></div>
      </aside>
      <section class="authenticator-right" aria-labelledby="auth-title">
        <div class="mobile-brand"><img class="brand-mark" style="object-fit:contain;padding:5px;background:#fff" src="{{ $systemBranding['logoUrl'] ?? asset('assets/logo/DA Logo/DA logo_120519.png') }}" alt=""><strong>{{ $systemBranding['name'] ?? 'TMIS' }} <small>TRAINING MANAGEMENT</small></strong></div>
        <div class="auth-content">
          @include('authentication.feedback')
          <a href="{{ route('login') }}" class="back-link"><span aria-hidden="true">←</span> Back to sign in</a>
          <div class="verification-progress" aria-label="Step 2 of 2: Email verification"><span>✓ Account details</span><span class="current-step">2 Email verification</span></div>
          <span class="recovery-icon" aria-hidden="true">
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg>
          </span>
          <span class="section-label">TWO-STEP VERIFICATION</span>
          <header>
            <h2 id="auth-title">{{ !empty($authenticatorChallenge) ? 'Open your authenticator.' : 'Check your inbox.' }}</h2>
            <p>@if(!empty($authenticatorChallenge)) Enter a current app code or an unused recovery code.<br />@else Enter the 6-digit verification code sent to<br />@endif<strong id="verification-email">{{ $maskedEmail }}</strong>.</p>
          </header>
          <form action="{{ route('verification.store') }}" method="POST" id="email-verification-form" data-authenticator="{{ !empty($authenticatorChallenge) ? 'true' : 'false' }}" data-expires-at="{{ $expiresAt }}" data-resend-available-at="{{ $resendAvailableAt }}">
            @csrf
            <div class="form-field">
              <label for="verification-code">Verification code</label>
              <input class="verification-code" id="verification-code" name="verification_code" type="text" inputmode="{{ !empty($authenticatorChallenge) ? 'text' : 'numeric' }}" autocomplete="one-time-code" pattern="{{ !empty($authenticatorChallenge) ? '([0-9]{6}|[a-fA-F0-9]{10}-[a-fA-F0-9]{10})' : '[0-9]{6}' }}" minlength="6" maxlength="{{ !empty($authenticatorChallenge) ? 21 : 6 }}" placeholder="000000" aria-describedby="code-hint code-validity code-error" required />
              <p id="code-hint" class="field-hint">{{ !empty($authenticatorChallenge) ? 'Enter an app code or a saved recovery code.' : 'Enter all 6 digits. You can paste the full code.' }}</p>
              <p id="code-validity" class="field-hint" role="timer" aria-live="off">Code expires in <strong id="code-validity-countdown">05:00</strong></p>
              <p id="code-error" class="code-error" role="alert" @if(! $errors->any()) hidden @endif>{{ $errors->first() }}</p>
            </div>
            <button type="submit" class="form-submit" id="verify-code-button" aria-busy="false">
              <span id="verify-code-spinner" class="submit-spinner" aria-hidden="true" hidden></span>
              <span id="verify-code-label">Verify and sign in</span>
              <span id="verify-code-arrow" aria-hidden="true">→</span>
            </button>
          </form>
          <p id="verification-status" tabindex="-1" class="auth-service-message" role="status" aria-live="polite">{{ session('status') }}</p>
          <div class="resend-panel" @if(!empty($authenticatorChallenge)) hidden @endif>
            <p>Didn't receive a code?</p>
            <form action="{{ route('verification.resend') }}" method="POST" id="resend-code-form">
              @csrf
              <button type="submit" id="resend-code" class="resend-button">Resend code</button>
            </form>
            <span id="resend-countdown" class="field-hint">Available in 00:30</span>
          </div>
          <div class="account-help"><span class="help-icon" aria-hidden="true">?</span><p>Need help?<br /><span>Return to sign in to start a new verification request.</span></p></div>
        </div>
        <footer class="auth-footer">{{ $systemBranding['name'] ?? 'TMIS' }} <span>Training Management Information System</span></footer>
      </section>
    </main>
  </body>
</html>



