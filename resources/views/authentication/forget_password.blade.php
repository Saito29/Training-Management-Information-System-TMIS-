<!doctype html>
<html lang="en">
  <head>
    <link rel="icon" type="image/png" href="{{ asset('assets/logo/DA Logo/DA logo_120519.png') }}">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#123e32" />
    @vite('resources/js/authentication/page.js')
    <title>Forgot password | TMIS</title>
  </head>
  <body>
    <main class="authenticator-container">
      <aside class="authenticator-left" aria-label="About TMIS">
        <div class="brand"><span class="brand-mark" aria-hidden="true">T</span><div><strong>TMIS</strong><span>TRAINING MANAGEMENT</span></div></div>
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
        <div class="mobile-brand"><span class="brand-mark" aria-hidden="true">T</span><strong>TMIS <small>TRAINING MANAGEMENT</small></strong></div>
        <div class="auth-content">
          @include('authentication.feedback')
          <a href="{{ route('login') }}" class="back-link"><span aria-hidden="true">←</span> Back to sign in</a>
          <div id="recovery-request">
            <span class="recovery-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg></span>
            <span class="section-label">ACCOUNT RECOVERY · STEP 1 OF 2</span>
            <header><h2 id="auth-title">Forgot password?</h2><p>Enter your account email. We'll help you get back to your workspace.</p></header>
            <form action="{{ route('password.email') }}" method="POST" id="forgot-password-form">
              @csrf
              <div class="form-field">
                <label for="forgot-email-input">Email address</label>
                <input type="email" name="email" id="forgot-email-input" placeholder="you@example.com" autocomplete="email" spellcheck="false" autocapitalize="none" aria-describedby="recovery-hint" required />
                <p class="field-hint" id="recovery-hint">Use the email address associated with your TMIS account.</p>
              </div>
              <button type="submit" class="form-submit">Send reset link <span aria-hidden="true">→</span></button>
            </form>
          </div>
          <div class="account-help"><span class="help-icon" aria-hidden="true">?</span><p>Can't access your email?<br /><span>Contact your system administrator for assistance.</span></p></div>
        </div>
        <footer class="auth-footer">TMIS <span>Training Management Information System</span></footer>
      </section>
    </main>
  </body>
</html>




