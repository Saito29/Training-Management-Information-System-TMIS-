@extends('mail.authentication.layout')

@section('title', 'Your sign-in code')
@section('preheader', 'Complete your TMIS sign-in. Your verification code is valid for 5 minutes.')
@section('eyebrow', 'TWO-STEP VERIFICATION')
@section('heading', 'One last step. You’re almost in.')

@section('content')
<p style="margin:0 0 24px;color:#68756e;font-size:15px;line-height:25px;">We received a sign-in request for your TMIS account. Enter the six-digit code below on the verification page to continue.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #cbdcc4;border-radius:12px;background-color:#f2f7ed;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <p style="margin:0 0 10px;color:#527047;font-size:10px;font-weight:700;letter-spacing:1.5px;">YOUR VERIFICATION CODE</p>
            <p style="margin:0;color:#123e32;font-family:Consolas,'Courier New',monospace;font-size:36px;font-weight:700;line-height:46px;letter-spacing:7px;">{{ $code }}</p>
            <p style="margin:10px 0 0;color:#527047;font-size:12px;line-height:20px;">Valid for <strong>5 minutes</strong> &middot; One-time use</p>
        </td>
    </tr>
</table>
<p style="margin:20px 0;color:#68756e;font-size:13px;line-height:22px;">Keep the verification page open in the browser where you started signing in. If you request another code, use the newest email.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:18px 0;border-top:1px solid #e2e9df;border-bottom:1px solid #e2e9df;">
        <p style="margin:0 0 6px;color:#1d3029;font-size:13px;font-weight:600;">Didn’t try to sign in?</p>
        <p style="margin:0;color:#68756e;font-size:13px;line-height:22px;">Do not share this code. If you’re concerned about your account, reset your password or contact your system administrator.</p>
    </td></tr>
</table>
<p style="margin:20px 0 0;font-size:13px;line-height:22px;"><a href="{{ $forgotPasswordUrl }}" style="color:#226649;font-weight:600;text-decoration:underline;">Forgot password? Request a reset link</a></p>
@endsection
