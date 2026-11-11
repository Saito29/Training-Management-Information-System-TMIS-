<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/png" href="{{ $systemBranding['faviconUrl'] ?? asset('assets/logo/DA Logo/DA logo_120519.png') }}">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#123e32" />
    @vite('resources/js/authentication/page.js')
    <title>Sign in | {{ $systemBranding['name'] ?? 'TMIS' }}</title>
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
          <span class="recovery-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg></span>
          <span class="section-label">YOUR WORKSPACE, CONNECTED</span>
          <header>
            <h2 id="auth-title">Welcome back.</h2>
            <p>Enter your account details to continue to email verification.</p>
          </header>
          <p id="signInMessage" class="auth-service-message" role="status" aria-live="polite">{{ $errors->first() }}</p>
          <form action="{{ route(request()->routeIs('maintenance.login') ? 'maintenance.login.store' : 'login.store') }}" method="POST" id="authenticator_form" autocomplete="on">
            @csrf
            <div class="form-field">
              <label for="email-input">Email address</label>
              <input type="email" name="email" value="{{ old('email') }}" id="email-input" placeholder="you@example.com" autocomplete="username" spellcheck="false" autocapitalize="none" required />
            </div>
            <div class="form-field">
              <div class="label-row"><label for="password_input">Password</label><a href="{{ route('password.request') }}">Forgot password?</a></div>
              <div class="password-field">
                <input type="password" name="password" id="password_input" placeholder="Enter your password" autocomplete="current-password" required />
                <button type="button" class="password-toggle" id="toggle-password" data-password-target="password_input" aria-label="Show password" aria-pressed="false">Show</button>
              </div>
            </div>
            <button type="submit" class="form-submit auth-submit-button" aria-busy="false">
              <span class="auth-submit-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 19 6v5c0 4.5-2.9 8-7 10-4.1-2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg></span>
              <span class="auth-submit-label">Sign in</span>
              <span class="submit-spinner" aria-hidden="true" hidden></span>
              <span class="auth-submit-arrow" aria-hidden="true">→</span>
            </button>
          </form>
          <div class="account-help"><span class="help-icon" aria-hidden="true">?</span><p>Need access to TMIS?<br /><span>Contact your system administrator for assistance.</span></p></div>
        </div>
        <footer class="auth-footer">TMIS <span>Training Management Information System</span></footer>
      </section>
    </main>
  </body>
</html>


