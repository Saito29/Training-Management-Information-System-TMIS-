<?php

namespace App\Console\Commands;

use App\Support\TrainingNotificationDelivery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeliverTrainingNotifications extends Command
{
    protected $signature = 'tmis:deliver-training-notifications';

    protected $description = 'Deliver up to 100 pending training status emails, retaining failed deliveries for retry';

    public function handle(TrainingNotificationDelivery $delivery): int
    {
        $ids = DB::table('training_notifications')->whereNull('sent_at')->whereNull('cancelled_at')
            ->where(fn ($query) => $query->whereNull('retry_at')->orWhere('retry_at', '<=', now()))->orderBy('id')->limit(100)->pluck('id');
        $failed = 0;
        foreach ($ids as $id) {
            if (! $delivery->deliver($id)) {
                $failed++;
            }
        }
        $this->info(($ids->count() - $failed).' processed; '.$failed.' deferred for retry.');

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
