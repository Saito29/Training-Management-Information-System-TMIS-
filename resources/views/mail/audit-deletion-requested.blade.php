<p>A System Administrator requested permanent deletion of account and security audit logs.</p>
<p><strong>Request reference:</strong> {{ $reference }}</p>
<p><strong>Requested by:</strong> {{ $requester }}</p>
<p><strong>Scope:</strong> {{ $selectedCount === null ? 'All audit entries matching the selected filters' : $selectedCount.' selected audit entries' }}</p>
<p>No records will be deleted until a Super Admin reviews and approves this request.</p>
<p><a href="{{ $reviewUrl }}">Review the request in TMIS</a></p>
