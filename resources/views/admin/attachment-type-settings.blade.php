@php
    $attachmentTypeDetails = [
        'farmer_profile' => [
            'title' => 'Farmer profile attachments',
            'description' => 'Manage document categories used on individual farmer profiles.',
            'icon' => 'bi-person-vcard',
            'search' => 'Search farmer profile types',
            'placeholder' => 'Attachment type name',
        ],
        'farmer_association' => [
            'title' => 'Farmer association attachments',
            'description' => 'Manage document categories used on farmer association profiles.',
            'icon' => 'bi-people',
            'search' => 'Search association types',
            'placeholder' => 'Attachment type name',
        ],
        'training' => [
            'title' => 'Training attachments',
            'description' => 'Manage document categories used when uploading training documents.',
            'icon' => 'bi-mortarboard',
            'search' => 'Search training attachment types',
            'placeholder' => 'Attachment type name',
        ],
    ];
@endphp
<section class="tab-pane fade" id="attachment-types" role="tabpanel" aria-labelledby="attachment-types-tab" tabindex="0">
    <article class="settings-card">
        <header class="settings-card-header">
            <span class="settings-section-icon"><i class="bi bi-paperclip" aria-hidden="true"></i></span>
            <div>
                <h2>Attachment types</h2>
                <p>Configure the document categories available for farmers, farmer associations, and trainings.</p>
            </div>
        </header>
        <div class="settings-card-body">
            <nav class="nav nav-tabs mb-3" role="tablist" aria-label="Attachment type categories">
                @foreach($attachmentTypeCategories as $category => $label)
                    @php($tabId = str_replace('_', '-', $category))
                    <button class="nav-link {{ $loop->first ? 'active' : '' }}" id="attachment-type-{{ $tabId }}-tab" data-bs-toggle="tab" data-bs-target="#attachment-type-{{ $tabId }}" type="button" role="tab" aria-controls="attachment-type-{{ $tabId }}" aria-selected="{{ $loop->first ? 'true' : 'false' }}">{{ $label }}</button>
                @endforeach
            </nav>
            <div class="tab-content">
                @foreach($attachmentTypeCategories as $category => $label)
                    @php($tabId = str_replace('_', '-', $category))
                    @php($details = $attachmentTypeDetails[$category])
                    @php($options = $attachmentTypesByCategory[$category])
                    <section class="tab-pane fade {{ $loop->first ? 'show active' : '' }}" id="attachment-type-{{ $tabId }}" role="tabpanel" aria-labelledby="attachment-type-{{ $tabId }}-tab" tabindex="0" data-attachment-type-panel="{{ $category }}" data-attachment-type-label="{{ $label }}">
                        <article class="settings-card">
                            <header class="settings-card-header">
                                <span class="settings-section-icon"><i class="bi {{ $details['icon'] }}" aria-hidden="true"></i></span>
                                <div><h3>{{ $details['title'] }}</h3><p>{{ $details['description'] }}</p></div>
                            </header>
                            <form method="post" action="{{ route('system.attachment-types.store', $category) }}" data-attachment-type-form>
                                @csrf
                                <div class="settings-card-body">
                                    <div class="row g-3 align-items-end">
                                        <div class="col-md-8">
                                            <label class="form-label" for="attachmentTypeName-{{ $tabId }}">Attachment type name</label>
                                            <input id="attachmentTypeName-{{ $tabId }}" name="name" class="form-control" maxlength="80" placeholder="Enter an attachment type" required>
                                            <p class="settings-field-help mt-2 mb-0">This choice will appear on the corresponding document upload forms.</p>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="form-check">
                                                <input class="form-check-input" id="attachmentTypeRequired-{{ $tabId }}" name="is_required" type="checkbox" value="1">
                                                <label class="form-check-label" for="attachmentTypeRequired-{{ $tabId }}">Required attachment type</label>
                                            </div>
                                            <p class="settings-field-help mt-2 mb-0">This setting is informational and does not block record saves. Types in use cannot be deleted; renaming updates saved document labels.</p>
                                        </div>
                                    </div>
                                </div>
                                <footer class="settings-card-footer">
                                    <button class="btn btn-primary" type="submit"><i class="bi bi-plus-circle" aria-hidden="true"></i> Add attachment type</button>
                                </footer>
                            </form>
                        </article>
                        <article class="settings-card mt-3 directory-card">
                            <header class="settings-card-header directory-card-header">
                                <span class="settings-section-icon"><i class="bi bi-card-list" aria-hidden="true"></i></span>
                                <div><h3>{{ $label }} type directory</h3><p>Review and maintain the categories configured for this area.</p></div>
                            </header>
                            <div class="settings-card-body">
                                <div class="directory-summary-grid" aria-label="{{ $label }} attachment type summary">
                                    <article><span>Type choices</span><strong data-attachment-type-stat-total>{{ $options->count() }}</strong></article>
                                    <article><span>Tagged documents</span><strong data-attachment-type-stat-used>{{ $options->sum('attachment_count') }}</strong></article>
                                    <article><span>Protected defaults</span><strong data-attachment-type-stat-protected>{{ $options->where('is_builtin', true)->count() }}</strong></article>
                                </div>
                                <div class="directory-toolbar directory-toolbar-offices">
                                    <label class="directory-search">
                                        <span>{{ $details['search'] }}</span>
                                        <span class="directory-input-wrap"><i class="bi bi-search" aria-hidden="true"></i><input type="search" class="form-control" placeholder="{{ $details['placeholder'] }}" aria-controls="attachmentTypesTable-{{ $tabId }}" data-attachment-type-search></span>
                                    </label>
                                    <label><span>Rows</span><select class="form-select" aria-controls="attachmentTypesTable-{{ $tabId }}" data-attachment-type-page-size>@foreach([10,25,50,100] as $size)<option value="{{ $size }}" @selected($size === 10)>{{ $size }} per page</option>@endforeach</select></label>
                                    <button class="btn btn-outline-secondary" type="button" data-attachment-type-refresh aria-label="Refresh {{ strtolower($label) }} attachment types"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Refresh</button>
                                </div>
                                <div class="directory-table-meta"><span><i class="bi bi-arrow-down-up" aria-hidden="true"></i> Select a column heading to sort</span><span>Types in use and protected defaults cannot be deleted.</span></div>
                                <div class="table-responsive directory-table-wrap">
                                    <table id="attachmentTypesTable-{{ $tabId }}" class="table align-middle directory-table">
                                        <thead><tr>
                                            <th scope="col" class="directory-action-heading">Action</th>
                                            <th scope="col"><button type="button" class="directory-sort" data-attachment-type-sort="name">Attachment type <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                                            <th scope="col"><button type="button" class="directory-sort" data-attachment-type-sort="is_required">Requirement <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                                            <th scope="col"><button type="button" class="directory-sort" data-attachment-type-sort="attachment_count">Documents using it <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
                                            <th scope="col">Availability</th>
                                        </tr></thead>
                                        <tbody data-attachment-type-rows></tbody>
                                    </table>
                                </div>
                                <div class="directory-table-footer">
                                    <p class="mb-0" data-attachment-type-summary role="status" aria-live="polite"></p>
                                    <nav class="directory-pagination" aria-label="{{ $label }} attachment type directory pagination">
                                        <button class="btn btn-sm btn-outline-secondary" type="button" data-attachment-type-previous><i class="bi bi-chevron-left" aria-hidden="true"></i> Previous</button>
                                        <span data-attachment-type-page aria-live="polite"></span>
                                        <button class="btn btn-sm btn-outline-secondary" type="button" data-attachment-type-next>Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
                                    </nav>
                                </div>
                            </div>
                        </article>
                        <script type="application/json" data-attachment-type-data>{!! Illuminate\Support\Js::encode($options) !!}</script>
                    </section>
                @endforeach
            </div>
        </div>
    </article>

    <div class="modal fade" id="attachmentTypeEditModal" tabindex="-1" aria-labelledby="attachmentTypeEditTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="attachmentTypeEditForm">
                    <div class="modal-header">
                        <div>
                            <span class="settings-eyebrow">ATTACHMENT CATALOGUE</span>
                            <h2 class="modal-title fs-5" id="attachmentTypeEditTitle">Edit attachment type</h2>
                            <p class="settings-field-help mb-0" data-attachment-type-edit-category></p>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label" for="attachmentTypeEditName">Attachment type name</label>
                        <input id="attachmentTypeEditName" name="name" class="form-control" maxlength="80" required>
                        <p class="settings-field-help mt-2 mb-0">Saved documents using this type will be updated when you save.</p>
                        <div class="form-check mt-3">
                            <input class="form-check-input" id="attachmentTypeEditRequired" name="is_required" type="checkbox" value="1">
                            <label class="form-check-label" for="attachmentTypeEditRequired">Required attachment type</label>
                        </div>
                        <p class="settings-field-help mt-2 mb-0">This setting is informational and does not block record saves.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-primary" type="submit"><i class="bi bi-check2" aria-hidden="true"></i> Save changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <script src="{{ asset('src/js/shared/attachment-type-settings.js?v=attachment-type-catalog-1') }}" defer></script>
</section>
