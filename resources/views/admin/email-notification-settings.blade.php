<section class="tab-pane fade" id="email-notification-control" role="tabpanel" aria-labelledby="email-notification-control-tab" tabindex="0">
  <article class="settings-card training-notification-settings email-notification-settings">
    <header class="settings-card-header">
      <span class="settings-section-icon"><i class="bi bi-envelope-paper-heart-fill" aria-hidden="true"></i></span>
      <div><h2>Training email notification control</h2><p>Choose which roles receive email for each training status update and customize the email copy.</p></div>
      @if($canManageEmailNotificationRules)<button class="btn btn-success ms-auto" id="addTrainingEmailNotificationRule" type="button"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Add email rule</button>@endif
    </header>
    <div class="settings-card-body">
      <div class="notification-control-notice"><i class="bi bi-shield-lock-fill" aria-hidden="true"></i><p><strong>System Administrator controls</strong><span>System Administrators can add, edit, and remove these email rules. Enabled rules send only to active accounts in the training’s region and office. Leave the subject or message blank to use the standard training update template.</span></p></div>
      <div class="table-responsive notification-rules-table-wrap">
        <table class="table align-middle notification-rules-table">
          <caption class="visually-hidden">Training email events, templates, and recipient roles</caption>
          <thead><tr><th scope="col">Status transition</th><th scope="col">Email notification</th><th scope="col">Recipient roles</th>@if($canManageEmailNotificationRules)<th scope="col">Actions</th>@endif</tr></thead>
          <tbody id="trainingEmailNotificationRulesBody"></tbody>
        </table>
      </div>
      <p class="settings-empty notification-rules-empty" id="trainingEmailNotificationRulesEmpty" hidden>No email rules have been configured.</p>
      <p id="trainingEmailNotificationRulesFeedback" class="notification-rules-feedback" role="status" aria-live="polite" hidden></p>
    </div>
  </article>

  @if($canManageEmailNotificationRules)
  <div class="modal fade" id="trainingEmailNotificationRuleModal" tabindex="-1" aria-labelledby="trainingEmailNotificationRuleModalTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content notification-rule-modal">
        <form id="trainingEmailNotificationRuleForm">
          @csrf
          <div class="modal-header">
            <div><span class="notification-rule-eyebrow">SYSTEM ADMINISTRATOR CONTROL</span><h2 class="modal-title" id="trainingEmailNotificationRuleModalTitle">Add email rule</h2><p>Choose a training status transition, recipient roles, and optional email copy.</p></div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="trainingEmailNotificationRuleId">
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label" for="emailNotificationRuleFromStatus">From status</label><select class="form-select" id="emailNotificationRuleFromStatus" required></select></div>
              <div class="col-md-6"><label class="form-label" for="emailNotificationRuleToStatus">To status</label><select class="form-select" id="emailNotificationRuleToStatus" required></select></div>
              <div class="col-12"><section class="notification-rule-preview email-notification-preview" aria-label="Email preview" aria-live="polite">
                <div class="notification-rule-preview-heading"><i class="bi bi-envelope-open" aria-hidden="true"></i><span>Email preview</span><span class="notification-rule-preview-chip" id="emailNotificationRulePreviewTransition">Status update</span></div>
                <div class="email-notification-preview-subject"><span>Subject</span><strong id="emailNotificationRulePreviewSubject">TMIS training status update: Sample training</strong></div>
                <p id="emailNotificationRulePreviewMessage">The email content preview will update as you edit the subject, message, and status transition.</p>
                <small><i class="bi bi-people" aria-hidden="true"></i><span id="emailNotificationRulePreviewRecipients">No recipient roles selected</span></small>
              </section></div>
              <div class="col-12"><label class="form-label" for="emailNotificationRuleSubject">Email subject <span class="text-secondary">(optional)</span></label><input class="form-control" id="emailNotificationRuleSubject" maxlength="255" placeholder="Leave blank to use the standard subject"></div>
              <div class="col-12"><label class="form-label" for="emailNotificationRuleMessage">Email message <span class="text-secondary">(optional)</span></label><textarea class="form-control" id="emailNotificationRuleMessage" rows="5" maxlength="5000" placeholder="Leave blank to use the standard detailed message"></textarea><small class="form-text">Available placeholders: {training_title}, {training_id}, {from_status}, {to_status}, {reason}, {changed_by}, {actor_office}, {training_office}, {changed_at}.</small></div>
            </div>
            <div class="notification-rule-enabled-row"><div><strong>Email delivery enabled</strong><small>When off, this status transition will not send email.</small></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="emailNotificationRuleEnabled" checked></div></div>
            <fieldset class="notification-role-fieldset"><legend>Who can receive this email?</legend><p>Only active accounts with a selected role in the training’s region and office are included.</p><div id="emailNotificationRuleRoles" class="notification-rule-roles"></div></fieldset>
            <p id="trainingEmailNotificationRuleError" class="alert alert-danger mt-3 mb-0" role="alert" hidden></p>
          </div>
          <div class="modal-footer"><button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button><button class="btn btn-success" id="saveTrainingEmailNotificationRule" type="submit"><i class="bi bi-check2 me-1" aria-hidden="true"></i>Save email rule</button></div>
        </form>
      </div>
    </div>
  </div>

  <div class="modal fade" id="deleteTrainingEmailNotificationRuleModal" tabindex="-1" aria-labelledby="deleteTrainingEmailNotificationRuleTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content notification-rule-modal notification-rule-delete-modal">
        <div class="modal-header"><div><span class="notification-rule-eyebrow">REMOVE EMAIL ROUTING</span><h2 class="modal-title" id="deleteTrainingEmailNotificationRuleTitle">Delete this email rule?</h2><p id="deleteTrainingEmailNotificationRuleSummary"></p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body"><p class="mb-0">Future email updates for this transition will stop. In-app notification rules remain unchanged.</p><p id="deleteTrainingEmailNotificationRuleError" class="alert alert-danger mt-3 mb-0" role="alert" hidden></p></div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" id="confirmDeleteTrainingEmailNotificationRule"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete email rule</button></div>
      </div>
    </div>
  </div>
  @endif

  <script>
    window.TMIS_EMAIL_NOTIFICATION_SETTINGS = {{ Illuminate\Support\Js::from([
        'rules' => $emailNotificationRules,
        'roles' => $notificationRoles,
        'transitions' => $notificationTransitions,
        'canEdit' => $canManageEmailNotificationRules,
    ]) }};
  </script>
</section>
