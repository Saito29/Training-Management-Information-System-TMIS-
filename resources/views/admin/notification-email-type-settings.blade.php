<section class="tab-pane fade notification-email-types" id="notification-email-types" role="tabpanel" aria-labelledby="notification-email-types-tab" tabindex="0">
  <article class="settings-card">
    <header class="settings-card-header">
      <span class="settings-section-icon"><i class="bi bi-envelope-check" aria-hidden="true"></i></span>
      <div><h2>Notification email delivery</h2><p>Choose which manually composed notification types may also be delivered by email.</p></div>
      <span class="database-secure-badge ms-auto"><i class="bi bi-lock-fill" aria-hidden="true"></i> Super Admin only</span>
    </header>
    <div class="settings-card-body">
      <div class="notification-email-types-notice" role="note">
        <i class="bi bi-info-circle-fill" aria-hidden="true"></i>
        <p><strong>In-app notifications are kept on.</strong><span>Turning off a type here suppresses only its email. The notification still appears in the recipient’s TMIS inbox. The master email switch and these type switches must both be on to send email. Training status emails remain controlled by Email notification control.</span></p>
      </div>
      <div class="notification-email-types-grid">
        @foreach([
          'account' => ['Account notifications', 'Account registration, approval, and profile updates.', 'person-check'],
          'training' => ['Training notifications', 'Manually composed notices about training activity. Training status emails use their separate rules.', 'mortarboard'],
          'participants' => ['Participant notifications', 'Manually composed notices about farmers and farmer associations.', 'people'],
          'evaluation' => ['Evaluation notifications', 'Manually composed notices about evaluation and questionnaire activity.', 'clipboard-check'],
          'system' => ['System notifications', 'System-wide advisories and operational notices.', 'gear'],
        ] as $type => [$label, $description, $icon])
          <div class="notification-email-type-row">
            <span class="notification-email-type-icon" aria-hidden="true"><i class="bi bi-{{ $icon }}"></i></span>
            <div class="notification-email-type-copy"><strong>{{ $label }}</strong><span>{{ $description }}</span></div>
            <label class="form-check form-switch notification-email-type-switch mb-0">
              <input class="form-check-input" type="checkbox" role="switch" data-notification-email-type-toggle data-url="{{ route('system.notification-email-types.update', ['type' => $type]) }}" @checked($notificationEmailTypeSettings[$type] ?? true) aria-label="Enable email for {{ strtolower($label) }}">
              <span class="visually-hidden">Enable email for {{ strtolower($label) }}</span>
            </label>
          </div>
        @endforeach
      </div>
      <p class="notification-email-type-feedback" role="status" aria-live="polite" hidden></p>
    </div>
  </article>
</section>
