TMIS | Training Management Information System

@if($accountSetup)
SET UP YOUR PASSWORD
Your account has been created and remains inactive pending approval. Setting a password does not grant login access. A System Administrator must approve and activate your account first.
@else
RESET YOUR PASSWORD
@endif

{{ $accountSetup ? 'Open this link to set your password:' : 'We received a request to reset your TMIS password. Open this link to choose a new password:' }}
{!! $resetUrl !!}

This link expires in {{ $expiresInMinutes }} minutes and can only be used once.

Once your account is approved and activated, sign in with your new password and verify the code sent to your email.

Did not request this? You can ignore this email. Your password will stay the same unless you complete the reset. Never forward this link to anyone.

Link expired? Request a new one:
{!! $forgotPasswordUrl !!}

For account assistance, contact your system administrator.
This is an automated message. Please do not reply.
