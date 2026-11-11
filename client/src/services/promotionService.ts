import { apiFetch } from './api';

export interface Promotion {
  id: string;
  name: string;
  nameKh: string;
  type: 'PERCENT' | 'FIXED' | 'HAPPY_HOUR' | 'BOGO';
  value: number;
  categoryIds?: string[];
  startHour?: number;
  endHour?: number;
  daysOfWeek?: number[];
  minSpend?: number;
  isActive: boolean;
  description: string;
  descriptionKh: string;
  badge: string;
}

try {
  localStorage.removeItem('coffee_pos_promotions');
} catch {
  // Ignore storage cleanup errors
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const data = await apiFetch<{ promotions: Promotion[] }>('/api/v1/promotions');
  return data.promotions;
}

export async function createPromotionApi(
  payload: Omit<Promotion, 'id' | 'isActive'>
): Promise<Promotion> {
  const data = await apiFetch<{ promotion: Promotion }>('/api/v1/promotions', {
    method: 'POST',
    body: payload,
  });
  return data.promotion;
}

export async function togglePromotionApi(id: string): Promise<Promotion> {
  const data = await apiFetch<{ promotion: Promotion }>(`/api/v1/promotions/${id}/toggle`, {
    method: 'PATCH',
  });
  return data.promotion;
}

export function isPromotionTimeActive(promo: Promotion, now: Date = new Date()): boolean {
  if (!promo.isActive) return false;
  if (promo.daysOfWeek && !promo.daysOfWeek.includes(now.getDay())) return false;
  if (promo.startHour !== undefined && promo.endHour !== undefined) {
    const hour = now.getHours();
    if (hour < promo.startHour || hour >= promo.endHour) return false;
  }
  return true;
}

export function calculatePromotionDiscount(promo: Promotion, subtotal: number): number {
  if (!promo.isActive) return 0;
  if (promo.minSpend && subtotal < promo.minSpend) return 0;
  if (promo.type === 'PERCENT' || promo.type === 'HAPPY_HOUR') {
    return Number(((subtotal * promo.value) / 100).toFixed(2));
  }
  if (promo.type === 'FIXED') {
    return Number(Math.min(subtotal, promo.value).toFixed(2));
  }
  return 0;
}
