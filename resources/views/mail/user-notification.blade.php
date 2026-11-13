<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }} | TMIS</title>
</head>
<body style="margin:0;padding:24px;background:#f4f7f4;color:#1d3029;font-family:Arial,sans-serif;">
    <main style="max-width:640px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #dfe7df;border-radius:12px;">
        <p style="margin:0 0 8px;color:#226649;font-size:12px;font-weight:700;letter-spacing:1.5px;">TMIS {{ strtoupper($type) }} NOTIFICATION</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.35;">{{ $title }}</h1>
        @if ($priority === 'high')
            <p style="display:inline-block;margin:0 0 16px;padding:6px 10px;background:#fff2d6;color:#815500;border-radius:6px;font-size:13px;font-weight:700;">Important</p>
        @endif
        @if ($summary !== '')
            <p style="margin:0 0 20px;color:#52635a;font-size:15px;line-height:1.6;">{{ $summary }}</p>
        @endif
        <div style="font-size:15px;line-height:1.7;white-space:pre-wrap;">{{ $messageBody }}</div>
        @if ($reference !== '')
            <p style="margin:20px 0 0;color:#52635a;font-size:13px;"><strong>Reference:</strong> {{ $reference }}</p>
        @endif
        @if ($relatedUrl)
            <p style="margin:24px 0 0;"><a href="{{ $relatedUrl }}" style="color:#226649;font-weight:700;">Open the related page in TMIS</a></p>
        @endif
        <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e2e9df;color:#68756e;font-size:12px;line-height:1.6;">This notification was sent by TMIS. Replies to this email are not monitored.</p>
    </main>
</body>
</html>
