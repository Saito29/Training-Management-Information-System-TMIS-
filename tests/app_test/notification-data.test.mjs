import test from 'node:test';
import assert from 'node:assert/strict';
import { activeRecipients, composeNotifications, countAvailableRecipients, resolveRecipients } from '../../public/src/js/notification/notification-data.js';

test('notification recipient selection excludes the signed-in sender', () => {
  const users = [
    { id: 'SENDER', status: 'Approved & Accepted' },
    { id: 'RECIPIENT', status: 'Active' },
    { id: 'INACTIVE', status: 'Inactive' },
  ];
  const actor = { id: 'SENDER' };
  const data = {
    title: 'Office update',
    message: 'Read the update',
    type: 'system',
    priority: 'normal',
    relatedPage: '',
    audience: 'all',
  };

  assert.deepEqual(activeRecipients(users, actor.id).map((user) => user.id), ['RECIPIENT']);
  assert.deepEqual(resolveRecipients(data, users, actor).map((user) => user.id), ['RECIPIENT']);
  assert.deepEqual(resolveRecipients({ ...data, audience: 'users', recipientIds: ['SENDER', 'RECIPIENT'] }, users, actor).map((user) => user.id), ['RECIPIENT']);
  assert.equal(countAvailableRecipients({ ...data, audience: 'users', recipientIds: [] }, users, actor), 1);
  assert.equal(countAvailableRecipients({ ...data, audience: 'users', recipientIds: ['RECIPIENT'] }, users, actor), 0);
  assert.deepEqual(composeNotifications(data, users, actor).map((notification) => notification.recipientId), ['RECIPIENT']);
});
