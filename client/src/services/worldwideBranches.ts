import { GlobalBranch, Currency } from '../types';

export const WORLDWIDE_BRANCHES: GlobalBranch[] = [
  { id: 'b-001', code: '#001', name: 'Phnom Penh Main', country: 'Cambodia', flag: '🇰🇭', currency: 'USD', exchangeRateToUSD: 1.0, timezone: 'Asia/Phnom_Penh' },
  { id: 'b-002', code: '#002', name: 'Bangkok Sukhumvit', country: 'Thailand', flag: '🇹🇭', currency: 'THB', exchangeRateToUSD: 36.5, timezone: 'Asia/Bangkok' },
  { id: 'b-003', code: '#003', name: 'Singapore Orchard', country: 'Singapore', flag: '🇸🇬', currency: 'SGD', exchangeRateToUSD: 1.35, timezone: 'Asia/Singapore' },
  { id: 'b-004', code: '#004', name: 'Tokyo Shibuya', country: 'Japan', flag: '🇯🇵', currency: 'JPY', exchangeRateToUSD: 155.0, timezone: 'Asia/Tokyo' },
  { id: 'b-005', code: '#005', name: 'London Oxford St', country: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', exchangeRateToUSD: 0.78, timezone: 'Europe/London' },
  { id: 'b-006', code: '#006', name: 'New York Broadway', country: 'United States', flag: '🇺🇸', currency: 'USD', exchangeRateToUSD: 1.0, timezone: 'America/New_York' },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  KHR: '៛',
  EUR: '€',
  GBP: '£',
  THB: '฿',
  CNY: '¥',
  JPY: '¥',
  SGD: 'S$',
};

export const formatGlobalPrice = (priceInUSD: number, branch: GlobalBranch): string => {
  const symbol = CURRENCY_SYMBOLS[branch.currency] || '$';
  const converted = priceInUSD * branch.exchangeRateToUSD;
  if (branch.currency === 'KHR' || branch.currency === 'JPY') {
    return `${symbol}${Math.round(converted).toLocaleString()}`;
  }
  return `${symbol}${converted.toFixed(2)}`;
};
