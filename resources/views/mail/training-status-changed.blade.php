@if($isRevert)
<p>A training assigned to your office has been returned for changes.</p>
@elseif($isFinalAcceptance)
<p>A training assigned to your office has received final approval and is now approved and accepted.</p>
@else
<p>A training assigned to your office has changed status.</p>
@endif
<p><strong>{{ $trainingName }}</strong> (ID {{ $trainingId }})</p>
@if($fromStatus !== '')<p>Previous status: <strong>{{ $fromStatus }}</strong></p>@endif
<p>New status: <strong>{{ $status }}</strong></p>
@if($isRevert && $reason !== '')<p>Reason for return: {{ $reason }}</p>@endif
<p>Status changed by <strong>{{ $changedBy }}</strong> ({{ $actorOffice }}) on {{ $changedAt }}.</p>
<p>Training office / organization: <strong>{{ $trainingOffice }}</strong></p>
<p>Sign in to TMIS to view the training if your role has access.</p>
