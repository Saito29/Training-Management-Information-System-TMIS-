<!doctype html>
<html lang="en">
  <head>
    <meta name="referrer" content="no-referrer">
    <link rel="icon" type="image/png" href="{{ asset('assets/logo/DA Logo/DA logo_120519.png') }}">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#123e32" />
    @vite('resources/js/authentication/page.js')
    <title>Reset password | TMIS</title>
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
          <div id="reset-request">
            <span class="recovery-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg></span>
            <span class="section-label">ACCOUNT RECOVERY · STEP 2 OF 2</span>
            <header><h2 id="auth-title">Set a new password.</h2><p>Choose a strong password to protect your workspace.</p></header>
            <form action="{{ route('password.update') }}" method="POST" id="reset-password-form">
              @csrf
              <input type="hidden" name="email" value="{{ $email }}">
              <input type="hidden" name="token" value="{{ $token }}">
              <div class="form-field">
                <label for="new-password">New password</label>
                <div class="password-field">
                  <input type="password" name="password" id="new-password" placeholder="Create a new password" autocomplete="new-password" minlength="8" maxlength="128" aria-describedby="password-requirements reset-error" required />
                  <button type="button" class="password-toggle" data-password-target="new-password" aria-label="Show new password" aria-pressed="false">Show</button>
                </div>
                <ul class="password-requirements" id="password-requirements">
                  <li data-reset-rule="length">At least 8 characters</li>
                  <li data-reset-rule="case">Uppercase and lowercase letters</li>
                  <li data-reset-rule="number">At least one number</li>
                  <li data-reset-rule="special">At least one special character</li>
                </ul>
              </div>
              <div class="form-field">
                <label for="confirm-password">Confirm new password</label>
                <div class="password-field">
                  <input type="password" name="password_confirmation" id="confirm-password" placeholder="Re-enter your new password" autocomplete="new-password" maxlength="128" aria-describedby="reset-error" required />
                  <button type="button" class="password-toggle" data-password-target="confirm-password" aria-label="Show password confirmation" aria-pressed="false">Show</button>
                </div>
                <p id="reset-error" class="code-error" role="alert" hidden></p>
              </div>
              <button type="submit" class="form-submit">Reset password <span aria-hidden="true">→</span></button>
            </form>
          </div>
        </div>
        <footer class="auth-footer">TMIS <span>Training Management Information System</span></footer>
      </section>
    </main>
  </body>
</html>




