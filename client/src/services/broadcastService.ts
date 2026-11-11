import { apiFetch } from './api';

export interface BroadcastMessage {
  id: string;
  messageKh: string;
  messageEn: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  author: string;
  createdAt: string;
  isActive: boolean;
}

try {
  localStorage.removeItem('coffee_pos_store_broadcast');
} catch {
  // Ignore storage cleanup errors
}

export async function fetchBroadcasts(): Promise<BroadcastMessage[]> {
  const data = await apiFetch<{ broadcasts: BroadcastMessage[] }>('/api/v1/broadcasts');
  return data.broadcasts;
}

export async function fetchActiveBroadcast(): Promise<BroadcastMessage | null> {
  const broadcasts = await fetchBroadcasts();
  return broadcasts.find((b) => b.isActive) || null;
}

export async function createBroadcastApi(
  messageKh: string,
  messageEn: string,
  priority: 'NORMAL' | 'URGENT'
): Promise<BroadcastMessage> {
  const data = await apiFetch<{ broadcast: BroadcastMessage }>('/api/v1/broadcasts', {
    method: 'POST',
    body: {
      messageKh,
      messageEn: messageEn || messageKh,
      priority,
    },
  });
  window.dispatchEvent(new Event('coffee_broadcast_updated'));
  return data.broadcast;
}

export async function clearActiveBroadcastApi(): Promise<void> {
  await apiFetch('/api/v1/broadcasts/active', { method: 'DELETE' });
  window.dispatchEvent(new Event('coffee_broadcast_updated'));
}
