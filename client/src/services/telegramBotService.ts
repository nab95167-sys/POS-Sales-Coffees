import { apiFetch } from './api';

try {
  localStorage.removeItem('coffee_pos_telegram_config');
} catch {
  // Ignore storage access errors
}

export function showToastNotification(text: string): void {
  const toast = document.createElement('div');
  toast.className =
    'fixed top-5 right-5 z-50 bg-stone-900 border border-amber-500 text-amber-300 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-3 duration-300 flex items-center space-x-2';
  const span = document.createElement('span');
  span.textContent = text;
  toast.appendChild(span);
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4500);
}

export async function sendTelegramTestAlert(): Promise<{ sent: boolean; error?: string }> {
  return apiFetch<{ sent: boolean; error?: string }>('/api/v1/settings/telegram/test', {
    method: 'POST',
  });
}
