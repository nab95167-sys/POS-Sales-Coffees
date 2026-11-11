import { apiFetch } from './api';

try {
  localStorage.removeItem('coffee_pos_telegram_config');
} catch {
  // Ignore storage access errors
}

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

function getToastContainer(): HTMLElement {
  const id = 'aura-toast-stack';
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.className =
      'fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none';
    document.body.appendChild(container);
  }
  return container;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: 'border-amber-500/50 text-amber-200 bg-[#12131a]/95',
  success: 'border-emerald-500/50 text-emerald-200 bg-[#0d1915]/95',
  warning: 'border-orange-500/50 text-orange-200 bg-[#1c140e]/95',
  error: 'border-red-500/50 text-red-200 bg-[#1b1012]/95',
};

const DOT_CLASSES: Record<ToastVariant, string> = {
  info: 'bg-amber-400',
  success: 'bg-emerald-400',
  warning: 'bg-orange-400',
  error: 'bg-red-400',
};

export function showToastNotification(text: string, variant: ToastVariant = 'info'): void {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.role = 'status';
  toast.className = `pointer-events-auto border ${VARIANT_CLASSES[variant]} backdrop-blur-xl text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2.5 transition-all duration-200 cursor-pointer`;

  const dot = document.createElement('span');
  dot.className = `w-2 h-2 rounded-full ${DOT_CLASSES[variant]} mt-1 flex-shrink-0`;

  const span = document.createElement('span');
  span.className = 'leading-relaxed flex-1';
  span.textContent = text;

  toast.appendChild(dot);
  toast.appendChild(span);

  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(12px)';
    setTimeout(() => toast.remove(), 180);
  };

  toast.addEventListener('click', removeToast);
  container.appendChild(toast);

  // Keep stack compact (max 4 visible toasts)
  while (container.children.length > 4) {
    container.firstElementChild?.remove();
  }

  setTimeout(removeToast, 4200);
}

export async function sendTelegramTestAlert(): Promise<{ sent: boolean; error?: string }> {
  return apiFetch<{ sent: boolean; error?: string }>('/api/v1/settings/telegram/test', {
    method: 'POST',
  });
}
