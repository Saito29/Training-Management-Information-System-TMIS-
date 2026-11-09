<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AuditDeletionRequested extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $reference,
        public string $requester,
        public ?int $selectedCount,
        public string $reviewUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'TMIS audit deletion requires your review');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.audit-deletion-requested', text: 'mail.audit-deletion-requested-text');
    }
}
