<section class="tab-pane fade {{ $isSuperAdministrator ? '' : 'show active' }}" id="branding" role="tabpanel" aria-labelledby="branding-tab" tabindex="0">
    <div class="settings-section-heading">
        <div>
            <h2>System branding</h2>
            <p>Update the system identity and dashboard welcome picture shown across TMIS.</p>
        </div>
        <span class="settings-count-badge">System Administrator only</span>
    </div>
    <article class="settings-card">
        <form method="post" action="{{ route('system.branding.update') }}" enctype="multipart/form-data" data-settings-form>
            @csrf
            <div class="settings-card-body">
                <div class="mb-4">
                    <label class="form-label" for="systemName">System name</label>
                    <input id="systemName" class="form-control" type="text" name="system_name" maxlength="120" required value="{{ old('system_name', $systemBranding['name']) }}">
                </div>
                {{-- Reuse the Database upload surface so logo and favicon replacements are easy to scan. --}}
                <div class="row g-4">
                    <div class="col-lg-6">
                        <label class="form-label" for="systemLogo">System logo</label>
                        <label class="database-file-drop branding-file-drop" for="systemLogo"><i class="bi bi-image" aria-hidden="true"></i><span><strong>Choose a logo file</strong><small>PNG, JPG, or WebP; up to 20 MB</small></span><i class="bi bi-folder2-open ms-auto" aria-hidden="true"></i><input id="systemLogo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" data-branding-file></label>
                        <p class="database-selected-file" data-branding-selected-file="systemLogo" aria-live="polite">No logo selected. The current logo will be kept.</p>
                        <img class="img-thumbnail mt-2" src="{{ $systemBranding['logoUrl'] }}" alt="Current system logo" data-branding-preview="systemLogo" style="max-width: 240px; max-height: 100px; object-fit: contain;">
                    </div>
                    <div class="col-lg-6">
                        <label class="form-label" for="systemFavicon">Favicon</label>
                        <label class="database-file-drop branding-file-drop" for="systemFavicon"><i class="bi bi-app-indicator" aria-hidden="true"></i><span><strong>Choose a favicon file</strong><small>PNG, JPG, or WebP; up to 20 MB</small></span><i class="bi bi-folder2-open ms-auto" aria-hidden="true"></i><input id="systemFavicon" name="favicon" type="file" accept="image/png,image/jpeg,image/webp" data-branding-file></label>
                        <p class="database-selected-file" data-branding-selected-file="systemFavicon" aria-live="polite">No favicon selected. The current favicon will be kept.</p><p class="settings-field-help mt-2">Use a square image no larger than 512 by 512 pixels.</p>
                        <img class="img-thumbnail mt-2" src="{{ $systemBranding['faviconUrl'] }}" alt="Current system favicon" data-branding-preview="systemFavicon" style="width: 64px; height: 64px; object-fit: contain;">
                    </div>
                    <div class="col-lg-6">
                        <label class="form-label" for="dashboardImage">Dashboard welcome picture</label>
                        <label class="database-file-drop branding-file-drop" for="dashboardImage"><i class="bi bi-card-image" aria-hidden="true"></i><span><strong>Choose a dashboard picture</strong><small>PNG, JPG, or WebP; up to 20 MB</small></span><i class="bi bi-folder2-open ms-auto" aria-hidden="true"></i><input id="dashboardImage" name="dashboard_image" type="file" accept="image/png,image/jpeg,image/webp" data-branding-file></label>
                        <p class="database-selected-file" data-branding-selected-file="dashboardImage" aria-live="polite">No new picture selected. The current picture will be kept.</p>
                        <p class="settings-field-help mt-2">This picture appears behind the signed-in user greeting, current date, and upcoming training on the dashboard.</p>
                        <img class="img-thumbnail mt-2 branding-dashboard-preview" src="{{ $systemBranding['dashboardImageUrl'] }}" alt="Current dashboard welcome picture" data-branding-preview="dashboardImage">
                    </div>
                </div>
            </div>
            <footer class="settings-card-footer">
                <span><i class="bi bi-shield-lock" aria-hidden="true"></i> Branding changes are recorded in the system audit history.</span>
                <button class="btn btn-success" type="submit"><i class="bi bi-check2" aria-hidden="true"></i> Save branding</button>
            </footer>
        </form>
    </article>
</section>
