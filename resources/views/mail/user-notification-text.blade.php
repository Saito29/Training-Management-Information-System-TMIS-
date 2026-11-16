{{ $title }}
{{ str_repeat('=', mb_strlen($title)) }}

{{ $messageBody }}

@if ($summary !== '')
Summary: {{ $summary }}
@endif
@if (in_array($priority, ['high', 'critical'], true))
Priority: {{ $priority === 'critical' ? 'Critical' : 'Important' }}
@endif
@if ($reference !== '')
Reference: {{ $reference }}
@endif
@if ($relatedUrl)
Open the related page in TMIS: {{ $relatedUrl }}
@endif

This notification was sent by TMIS. Replies to this email are not monitored.
