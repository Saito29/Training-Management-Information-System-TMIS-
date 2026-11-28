<div class="modal fade" id="deleteInterventionModal" tabindex="-1" aria-labelledby="deleteInterventionTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable intervention-form-dialog">
        <div class="modal-content review-modal-content intervention-modal intervention-delete-modal">
            <div class="modal-header review-modal-header">
                <div class="review-modal-heading">
                    <span class="review-modal-icon text-danger" aria-hidden="true"><i class="bi bi-trash3"></i></span>
                    <div><span class="review-modal-eyebrow">PERMANENT RECORD REMOVAL</span><h2 class="modal-title" id="deleteInterventionTitle">Delete intervention permanently?</h2><p>This record will be removed from the profile and cannot be restored.</p></div>
                </div>
                <button type="button" class="btn review-modal-close" data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <div class="modal-body review-modal-body">
                <dl class="intervention-detail-list" id="deleteInterventionDetails"></dl>
                <p class="alert alert-warning mb-0"><i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>Deleting an intervention permanently removes this entry from the database.</p>
                <p id="deleteInterventionError" class="alert alert-danger mt-3 mb-0" role="alert" hidden></p>
            </div>
            <div class="modal-footer review-modal-footer">
                <button type="button" class="btn review-modal-dismiss" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDeleteIntervention"><i class="bi bi-trash3 me-1" aria-hidden="true"></i>Delete permanently</button>
            </div>
        </div>
    </div>
</div>
