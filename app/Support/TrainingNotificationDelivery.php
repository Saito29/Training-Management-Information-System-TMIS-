<?php

namespace App\Support;

use App\Http\Authentication\AccountDisplay;
use App\Mail\TrainingStatusChanged;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class TrainingNotificationDelivery
{
    /** Deliver only committed outbox entries; the row lock serializes competing workers. */
    public function deliver(int $id): bool
    {
        return DB::transaction(function () use ($id): bool {
            $entry = DB::table('training_notifications')->where('id', $id)->lockForUpdate()->first();
            if (! $entry || $entry->sent_at || $entry->cancelled_at || ($entry->retry_at && now()->lt($entry->retry_at))) {
                return true;
            }
            $change = DB::table('training_status_changes')->where('id', $entry->status_change_id)->first();
            $training = DB::table('trainings')
                ->leftJoin('organization as training_office', 'trainings.org_id', '=', 'training_office.org_id')
                ->where('trainings.id', $change->training_id)
                ->select('trainings.*', 'training_office.name as training_office_name')
                ->first();
            $actor = DB::table('users')
                ->leftJoin('organization as actor_office', 'users.org_id', '=', 'actor_office.org_id')
                ->where('users.user_id', $change->actor_user_id)
                ->select('users.first_name', 'users.middle_name', 'users.last_name', 'users.extension_name', 'actor_office.name as office_name')
                ->first();
            $eligible = DB::table('users')->join('user_roles', 'users.role_id', '=', 'user_roles.role_id')->where('users.user_id', $entry->user_id)
                ->where('users.email', $entry->email)->where('users.org_id', $training->org_id)->where('users.region_id', $training->region_id)
                ->where('users.active_status', 1)->where('users.status', 'Approved & Accepted')->where('user_roles.is_active', 1)->exists();
            if (! $eligible) {
                DB::table('training_notifications')->where('id', $id)->update(['cancelled_at' => now()]);

                return true;
            }
            try {
                $actorName = app(AccountDisplay::class)->formatName(
                    $actor?->first_name,
                    $actor?->middle_name,
                    $actor?->last_name,
                    $actor?->extension_name,
                );
                $changedAt = Carbon::parse($change->created_at)
                    ->timezone(config('app.timezone'))
                    ->format('M j, Y g:i A');
                Mail::to($entry->email)->send(new TrainingStatusChanged(
                    $training->name,
                    $training->id,
                    $change->to_status,
                    $change->from_status,
                    (string) ($change->reason ?? ''),
                    $actorName,
                    (string) ($actor?->office_name ?: 'Office not recorded'),
                    (string) ($training->training_office_name ?: 'Office not recorded'),
                    $changedAt,
                ));
                DB::table('training_notifications')->where('id', $id)->update(['sent_at' => now(), 'attempts' => $entry->attempts + 1, 'retry_at' => null]);
                $this->audit($entry->user_id, $id, 'training_email_sent', 'success');

                return true;
            } catch (TransportExceptionInterface $exception) {
                report($exception);
                DB::table('training_notifications')->where('id', $id)->update(['attempts' => $entry->attempts + 1, 'retry_at' => now()->addMinutes(min(60, 2 ** min(6, $entry->attempts + 1)))]);
                $this->audit($entry->user_id, $id, 'training_email_failed', 'failure');

                return false;
            }
        });
    }

    private function audit(int $userId, int $notificationId, string $event, string $outcome): void
    {
        DB::table('users_log')->insert(['user_id' => $userId, 'event' => $event, 'category' => 'notification', 'outcome' => $outcome, 'description' => str_replace('_', ' ', $event), 'metadata' => json_encode(['notification_id' => $notificationId], JSON_THROW_ON_ERROR), 'created_at' => now()]);
    }
}
