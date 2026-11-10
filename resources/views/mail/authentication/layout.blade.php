<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>@yield('title') | TMIS</title>
</head>
<body style="margin:0;padding:0;background-color:#f8faf8;color:#1d3029;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">@yield('preheader')</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8faf8;">
        <tr>
            <td align="center" style="padding:32px 12px;">
                <!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #dfe7df;border-radius:20px;overflow:hidden;">
                    <tr>
                        <td bgcolor="#123e32" style="padding:28px 28px 24px;border-radius:20px 20px 0 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="60" valign="middle">
                                        <img src="{{ $message->embed(public_path('assets/logo/DA Logo/DA logo_120519.png')) }}" alt="Department of Agriculture" width="48" height="48" style="display:block;border:0;">
                                    </td>
                                    <td valign="middle">
                                        <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:3px;">TMIS</p>
                                        <p style="margin:5px 0 0;color:#d5e8a5;font-size:10px;line-height:16px;letter-spacing:1.5px;">TRAINING MANAGEMENT INFORMATION SYSTEM</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 0;color:#d0ded4;font-size:13px;line-height:20px;">Growing skills. Building a stronger tomorrow.</p>
                        </td>
                    </tr>
                    <tr><td height="4" bgcolor="#d5e8a5" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                    <tr>
                        <td style="padding:32px 28px;">
                            <p style="margin:0 0 12px;color:#226649;font-size:10px;font-weight:700;letter-spacing:2px;line-height:16px;">@yield('eyebrow')</p>
                            <h1 style="margin:0 0 16px;color:#1d3029;font-size:28px;font-weight:650;line-height:36px;">@yield('heading')</h1>
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#f2f6f1" style="padding:22px 28px;border-top:1px solid #e2e9df;border-radius:0 0 20px 20px;">
                            <p style="margin:0 0 6px;color:#355642;font-size:12px;font-weight:600;line-height:19px;">A little care keeps your account secure.</p>
                            <p style="margin:0;color:#68756e;font-size:12px;line-height:19px;">TMIS will never ask you to share your password or verification code. For account assistance, contact your system administrator.</p>
                        </td>
                    </tr>
                </table>
                <!--[if mso]></td></tr></table><![endif]-->
                <p style="margin:20px 0 0;color:#68756e;font-size:11px;line-height:18px;text-align:center;">TMIS &middot; Account security<br>This is an automated message. Please do not reply.</p>
            </td>
        </tr>
    </table>
</body>
</html>
