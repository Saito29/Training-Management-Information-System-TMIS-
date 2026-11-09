@extends('mail.authentication.layout')

@section('title', $accountSetup ? 'Set up your password' : 'Reset your password')
@section('preheader', 'A fresh start for your TMIS account. Use this secure link to choose a new password.')
@section('eyebrow', $accountSetup ? 'ACCOUNT SETUP' : 'ACCOUNT RECOVERY')
@section('heading', $accountSetup ? 'Welcome to TMIS.' : 'Let’s get you back in.')

@section('content')
@if($accountSetup)
<p>Your TMIS account has been created. Set your password using the link below. Your account remains inactive and pending approval. Setting a password does not grant access; a System Administrator must approve and activate your account first.</p>
@endif
<p style="margin:0 0 24px;color:#68756e;font-size:15px;line-height:25px;">{{ $accountSetup ? 'Select the button below to choose your password. Your account must still be approved and activated before you can sign in.' : 'We received a request to reset your TMIS password. Select the button below to choose a new password.' }}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td bgcolor="#226649" align="center" style="border-radius:9px;mso-padding-alt:16px 28px;">
        <a href="{{ $resetUrl }}" style="display:inline-block;padding:16px 28px;border:1px solid #226649;border-radius:9px;color:#ffffff;font-size:15px;font-weight:600;line-height:20px;text-decoration:none;mso-padding-alt:0;">{{ $accountSetup ? 'Set my password' : 'Reset my password' }}</a>
    </td></tr>
</table>
<p style="margin:0 0 24px;color:#527047;font-size:13px;line-height:22px;">This link expires in <strong>{{ $expiresInMinutes }} minutes</strong> and can only be used once.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f7ed;border:1px solid #dce6d4;border-radius:10px;">
    <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 8px;color:#355642;font-size:13px;font-weight:600;">What happens next?</p>
        <p style="margin:0;color:#527047;font-size:13px;line-height:23px;">1. Choose a strong, unique password.<br>2. Wait for account approval and activation, then sign in with your new password.<br>3. Verify your sign-in with the code sent to your email.</p>
    </td></tr>
</table>
<p style="margin:22px 0;color:#68756e;font-size:13px;line-height:22px;"><strong style="color:#1d3029;">Didn’t request this?</strong> You can ignore this email. Your password will stay the same unless you complete the reset. Never forward this link to anyone.</p>
<p style="margin:0 0 8px;color:#68756e;font-size:12px;line-height:20px;">Button not working? Copy and paste this link into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;line-height:20px;word-break:break-all;overflow-wrap:anywhere;"><a href="{{ $resetUrl }}" style="color:#226649;text-decoration:underline;">{{ $resetUrl }}</a></p>
<p style="margin:0;padding-top:18px;border-top:1px solid #e2e9df;font-size:12px;line-height:20px;"><a href="{{ $forgotPasswordUrl }}" style="color:#226649;text-decoration:underline;">Link expired? Request a new one</a></p>
@endsection
