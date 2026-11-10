<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TrainingStatusChanged extends Mailable
{
    public function __construct(
        public string $trainingName,
        public int $trainingId,
        public string $status,
        public string $fromStatus = '',
        public string $reason = '',
        public string $changedBy = 'TMIS user',
        public string $actorOffice = 'Office not recorded',
        public string $trainingOffice = 'Office not recorded',
        public string $changedAt = 'Time not recorded',
    ) {}

    public function envelope(): Envelope
    {
        $subject = in_array($this->status, ['For approval', 'For review'], true)
            ? 'TMIS training returned for changes: '.$this->trainingName
            : ($this->status === 'Approved & Accepted' ? 'TMIS training approved and accepted: '.$this->trainingName : 'TMIS training status: '.$this->status);

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.training-status-changed',
            text: 'mail.training-status-changed-text',
            with: [
                'trainingName' => $this->trainingName,
                'trainingId' => $this->trainingId,
                'status' => $this->status,
                'fromStatus' => $this->fromStatus,
                'reason' => $this->reason,
                'changedBy' => $this->changedBy,
                'actorOffice' => $this->actorOffice,
                'trainingOffice' => $this->trainingOffice,
                'changedAt' => $this->changedAt,
                'isRevert' => in_array($this->status, ['For approval', 'For review'], true),
                'isFinalAcceptance' => $this->status === 'Approved & Accepted',
            ],
        );
    }
}
