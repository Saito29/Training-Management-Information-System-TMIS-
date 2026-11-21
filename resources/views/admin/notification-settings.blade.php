<section class="tab-pane fade" id="notification-control" role="tabpanel" aria-labelledby="notification-control-tab" tabindex="0">
  <article class="settings-card training-notification-settings">
    <header class="settings-card-header">
      <span class="settings-section-icon"><i class="bi bi-bell-fill" aria-hidden="true"></i></span>
      <div><h2>Training notification control</h2><p>Choose which active roles receive each training status update in the training’s region and office.</p></div>
      @if($canManageNotificationRules)<button class="btn btn-success ms-auto" id="addTrainingNotificationRule" type="button"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Add notification rule</button>@endif
    </header>
    <div class="settings-card-body">
      <div class="notification-control-notice"><i class="bi bi-shield-lock-fill" aria-hidden="true"></i><p><strong>System Administrator controls</strong><span>System Administrators can add, edit, and remove these rules. A role receives a training notification only when enabled and its account is active in the training’s region and office.</span></p></div>
      <div class="table-responsive notification-rules-table-wrap">
        <table class="table align-middle notification-rules-table">
          <caption class="visually-hidden">Training notification events and enabled recipient roles</caption>
          <thead><tr><th scope="col">Status transition</th><th scope="col">Notification</th><th scope="col">Recipient roles</th>@if($canManageNotificationRules)<th scope="col">Actions</th>@endif</tr></thead>
          <tbody id="trainingNotificationRulesBody"></tbody>
        </table>
      </div>
      <p class="settings-empty notification-rules-empty" id="trainingNotificationRulesEmpty" hidden>No notification rules have been configured.</p>
      <p id="trainingNotificationRulesFeedback" class="notification-rules-feedback" role="status" aria-live="polite" hidden></p>
    </div>
  </article>

  <div class="modal fade" id="trainingNotificationRuleModal" tabindex="-1" aria-labelledby="trainingNotificationRuleModalTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content notification-rule-modal">
        <form id="trainingNotificationRuleForm">
          @csrf
          <div class="modal-header">
            <div><span class="notification-rule-eyebrow">SYSTEM ADMINISTRATOR CONTROL</span><h2 class="modal-title" id="trainingNotificationRuleModalTitle">Add notification rule</h2><p>Set recipients for one training status transition.</p></div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="trainingNotificationRuleId">
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label" for="notificationRuleFromStatus">From status</label><select class="form-select" id="notificationRuleFromStatus" required></select></div>
              <div class="col-md-6"><label class="form-label" for="notificationRuleToStatus">To status</label><select class="form-select" id="notificationRuleToStatus" required></select></div>
            </div>
            <section class="notification-rule-preview" aria-label="Notification preview" aria-live="polite">
              <div class="notification-rule-preview-heading"><i class="bi bi-eye" aria-hidden="true"></i><span>In-app notification preview</span><span class="notification-rule-preview-chip" id="notificationRulePreviewTransition">Status update</span></div>
              <strong id="notificationRulePreviewTitle">Training status updated</strong>
              <p id="notificationRulePreviewMessage">A sample notification will appear here for the selected transition.</p>
              <small><i class="bi bi-people" aria-hidden="true"></i><span id="notificationRulePreviewRecipients">No recipient roles selected</span></small>
            </section>
            <div class="notification-rule-enabled-row"><div><strong>Notification enabled</strong><small>When off, no recipients are notified for this status transition.</small></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="notificationRuleEnabled" checked></div></div>
            <fieldset class="notification-role-fieldset"><legend>Who can receive this notification?</legend><p>Only active accounts with the selected role in the training’s region and office are included.</p><div id="notificationRuleRoles" class="notification-rule-roles"></div></fieldset>
            <p id="trainingNotificationRuleError" class="alert alert-danger mt-3 mb-0" role="alert" hidden></p>
          </div>
          <div class="modal-footer"><button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button><button class="btn btn-success" id="saveTrainingNotificationRule" type="submit"><i class="bi bi-check2 me-1" aria-hidden="true"></i>Save rule</button></div>
        </form>
      </div>
    </div>
  </div>

  <div class="modal fade" id="deleteTrainingNotificationRuleModal" tabindex="-1" aria-labelledby="deleteTrainingNotificationRuleTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content notification-rule-modal notification-rule-delete-modal">
        <div class="modal-header"><div><span class="notification-rule-eyebrow">REMOVE NOTIFICATION ROUTING</span><h2 class="modal-title" id="deleteTrainingNotificationRuleTitle">Delete this rule?</h2><p id="deleteTrainingNotificationRuleSummary"></p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body"><p>Future training updates will stop using this rule. Previously delivered notifications remain in recipients’ inboxes.</p><p id="deleteTrainingNotificationRuleError" class="alert alert-danger mb-0" role="alert" hidden></p></div>
        <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" id="confirmDeleteTrainingNotificationRule"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete rule</button></div>
      </div>
    </div>
  </div>

    <script>
    window.TMIS_NOTIFICATION_SETTINGS = {{ Illuminate\Support\Js::from([
        'rules' => $notificationRules,
        'roles' => $notificationRoles,
        'transitions' => $notificationTransitions,
        'canEdit' => $canManageNotificationRules,
    ]) }};
  </script>
</section>
