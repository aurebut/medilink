import { api, primeApiCache, updateApiCache } from './api';
import type { Notification } from './types';

const NOTIFICATIONS_PATH = '/notifications';
const deletedNotificationIds = new Set<string>();
const readNotificationIds = new Map<string, string>();

export function normalizeNotifications(items: Notification[]) {
  return items
    .filter((notification) => !deletedNotificationIds.has(notification.id))
    .map((notification) => {
      const readAt = readNotificationIds.get(notification.id);
      return readAt && !notification.readAt ? { ...notification, readAt } : notification;
    });
}

export function primeNotificationsCache(items: Notification[]) {
  primeApiCache(NOTIFICATIONS_PATH, normalizeNotifications(items));
}

export function removeNotificationFromCache(id: string) {
  deletedNotificationIds.add(id);
  updateApiCache<Notification[]>(NOTIFICATIONS_PATH, (items) =>
    normalizeNotifications(items || []).filter((notification) => notification.id !== id),
  );
}

export function restoreNotificationInCache(notification: Notification, index: number) {
  deletedNotificationIds.delete(notification.id);
  updateApiCache<Notification[]>(NOTIFICATIONS_PATH, (items) => {
    const current = normalizeNotifications(items || []);
    if (current.some((item) => item.id === notification.id)) return current;
    const restored = [...current];
    restored.splice(Math.max(index, 0), 0, notification);
    return restored;
  });
}

export function clearNotificationsCache(items: Notification[]) {
  items.forEach((notification) => deletedNotificationIds.add(notification.id));
  primeApiCache(NOTIFICATIONS_PATH, []);
}

export function restoreNotificationsCache(items: Notification[]) {
  items.forEach((notification) => deletedNotificationIds.delete(notification.id));
  primeApiCache(NOTIFICATIONS_PATH, items);
}

export function markNotificationReadInCache(id: string, readAt = new Date().toISOString()) {
  readNotificationIds.set(id, readAt);
  updateApiCache<Notification[]>(NOTIFICATIONS_PATH, (items) =>
    normalizeNotifications(items || []).map((notification) =>
      notification.id === id ? { ...notification, readAt: notification.readAt || readAt } : notification,
    ),
  );
}

export async function confirmNotificationRead(id: string) {
  markNotificationReadInCache(id);
  try {
    await api.patchSilent(`/notifications/${id}/read`, {});
  } catch {
    // The next automatic refresh reconciles the badge if the server rejects the read.
  }
}

export async function confirmNotificationDelete(id: string) {
  await api.deleteSilent(`/notifications/${id}`);
  void api.reload<Notification[]>(NOTIFICATIONS_PATH)
    .then(primeNotificationsCache)
    .catch(() => undefined);
}

export async function confirmNotificationsClear() {
  await api.deleteSilent(NOTIFICATIONS_PATH);
  void api.reload<Notification[]>(NOTIFICATIONS_PATH)
    .then(primeNotificationsCache)
    .catch(() => undefined);
}
