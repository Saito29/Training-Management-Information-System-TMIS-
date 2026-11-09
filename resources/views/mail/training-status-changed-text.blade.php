@if($isRevert)
This training assigned to your office was returned for changes.
@elseif($isFinalAcceptance)
A training assigned to your office has received final approval and is now approved and accepted.
@else
A training assigned to your office has changed status.
@endif
Training: {{ $trainingName }} (ID {{ $trainingId }})
@if($fromStatus !== '')Previous status: {{ $fromStatus }}@endif
New status: {{ $status }}
@if($isRevert && $reason !== '')Reason for return: {{ $reason }}@endif
Status changed by: {{ $changedBy }} ({{ $actorOffice }}) on {{ $changedAt }}.
Training office / organization: {{ $trainingOffice }}
Sign in to TMIS to view the training if your role has access.
