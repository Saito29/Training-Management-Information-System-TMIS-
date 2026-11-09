A System Administrator requested permanent deletion of account and security audit logs.

Request reference: {{ $reference }}
Requested by: {{ $requester }}
Scope: {{ $selectedCount === null ? 'All audit entries matching the selected filters' : $selectedCount.' selected audit entries' }}

No records will be deleted until a Super Admin reviews and approves this request.
Review the request in TMIS: {{ $reviewUrl }}
