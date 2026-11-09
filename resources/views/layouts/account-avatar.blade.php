<span class="user-profile account-avatar" role="img" aria-label="{{ $accountDisplay['navigationName'] }}" data-account-avatar>
@if($accountDisplay['photoUrl'])<img src="{{ $accountDisplay['photoUrl'] }}" alt="" data-account-photo><span class="account-avatar-initials" hidden>{{ $accountDisplay['initials'] }}</span>
@else<span class="account-avatar-initials">{{ $accountDisplay['initials'] }}</span>@endif
</span>
