@foreach ($errors->all() as $message)
    <span hidden data-auth-toast data-toast-type="{{ session('toast_type', 'error') }}">{{ $message }}</span>
    <noscript><p role="alert">{{ $message }}</p></noscript>
@endforeach
@if (session('status'))
    <span hidden data-auth-toast data-toast-type="{{ session('toast_type', 'success') }}">{{ session('status') }}</span>
    <noscript><p role="status">{{ session('status') }}</p></noscript>
@endif
