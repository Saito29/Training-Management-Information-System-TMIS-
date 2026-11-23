<?php

namespace App\Mail\Authentication;

use App\Support\SystemBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoginVerificationCode extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(public string $code) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your TMIS sign-in code',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $branding = app(SystemBranding::class)->forEmail();

        return new Content(
            view: 'mail.authentication.login-code',
            text: 'mail.authentication.login-code-text',
            with: [
                'forgotPasswordUrl' => rtrim(config('app.url'), '/').route('password.request', [], false),
                'brandName' => $branding['name'],
                'brandLogoPath' => $branding['logoPath'],
                'brandLogoWidth' => $branding['logoWidth'],
                'brandLogoHeight' => $branding['logoHeight'],
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
