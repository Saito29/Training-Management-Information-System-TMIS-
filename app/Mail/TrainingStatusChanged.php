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
        $subject = match ([$this->fromStatus, $this->status]) {
            ['For review', 'For approval'] => 'TMIS training submitted for approval: '.$this->trainingName,
            ['For approval', 'For acceptance'] => 'TMIS training forwarded for acceptance: '.$this->trainingName,
            ['For acceptance', 'Approved & Accepted'] => 'TMIS training approved and accepted: '.$this->trainingName,
            default => $this->isReturn() ? 'TMIS training returned for changes: '.$this->trainingName : 'TMIS training status: '.$this->status,
        };

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
                'isRevert' => $this->isReturn(),
                'isSubmitted' => $this->fromStatus === 'For review' && $this->status === 'For approval',
                'isForwarded' => $this->fromStatus === 'For approval' && $this->status === 'For acceptance',
                'isFinalAcceptance' => $this->status === 'Approved & Accepted',
            ],
        );
    }

    private function isReturn(): bool
    {
        return in_array([$this->fromStatus, $this->status], [
            ['For approval', 'For review'],
            ['For acceptance', 'For approval'],
            ['For acceptance', 'For review'],
        ], true);
    }
}
