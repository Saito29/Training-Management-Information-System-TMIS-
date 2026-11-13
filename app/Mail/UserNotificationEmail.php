<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserNotificationEmail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, string>  $recipients
     */
    public function __construct(
        public array $recipients,
        public string $title,
        public string $summary,
        public string $messageBody,
        public string $type,
        public string $priority,
        public string $reference,
        public ?string $relatedUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'TMIS notification: '.$this->title,
            bcc: $this->recipients,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.user-notification',
            text: 'mail.user-notification-text',
            with: [
                'title' => $this->title,
                'summary' => $this->summary,
                'messageBody' => $this->messageBody,
                'type' => ucfirst($this->type),
                'priority' => $this->priority,
                'reference' => $this->reference,
                'relatedUrl' => $this->relatedUrl,
            ],
        );
    }
}
