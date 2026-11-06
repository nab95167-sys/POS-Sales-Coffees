export interface Promotion {
  id: string;
  name: string;
  nameKh: string;
  type: 'PERCENT' | 'FIXED' | 'HAPPY_HOUR' | 'BOGO';
  value: number; // percentage or fixed amount in USD
  categoryIds?: string[]; // applicable categories or empty for all
  startHour?: number; // 24-hr format (e.g. 14 for 2 PM)
  endHour?: number; // 24-hr format (e.g. 17 for 5 PM)
  daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]
  minSpend?: number;
  isActive: boolean;
  description: string;
  descriptionKh: string;
  badge: string;
}

const STORAGE_KEY = 'coffee_pos_promotions';

export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-happy-hour',
    name: 'Afternoon Happy Hour (20% Off)',
    nameKh: 'Happy Hour រសៀល បញ្ចុះតម្លៃ ២០%',
    type: 'HAPPY_HOUR',
    value: 20,
    categoryIds: ['cat-1', 'cat-2', 'cat-3'], // Coffee, Cold Brew, Specials
    startHour: 14, // 2:00 PM
    endHour: 17,   // 5:00 PM
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    isActive: true,
    description: '20% off all artisan coffees & cold brews between 2:00 PM and 5:00 PM Mon-Fri',
    descriptionKh: 'បញ្ចុះតម្លៃ ២០% លើកាហ្វេ និង Cold Brew ទាំងអស់ ចន្លោះម៉ោង ២:០០ ដល់ ៥:០០ រសៀល',
    badge: '⚡ 2:00 - 5:00 PM',
  },
  {
    id: 'promo-bakery-combo',
    name: 'Morning Bakery & Coffee Combo ($1.00 OFF)',
    nameKh: 'ឈុតនំបុ័ងពេលព្រឹក និងកាហ្វេ បញ្ចុះ $1.00',
    type: 'FIXED',
    value: 1.00,
    minSpend: 6.00,
    isActive: true,
    description: 'Get $1.00 off when ordering breakfast combos over $6.00',
    descriptionKh: 'បញ្ចុះតម្លៃ $1.00 ភ្លាមៗរាល់ពេលកុម្ម៉ង់លើសពី $6.00',
    badge: '🥐 Breakfast Combo',
  },
  {
    id: 'promo-frappe-weekend',
    name: 'Weekend Frappes & Smoothies 15% Off',
    nameKh: 'ចុងសប្តាហ៍ ហ្វ្រេបប៉េ & ស្រ្មូទី បញ្ចុះ ១៥%',
    type: 'PERCENT',
    value: 15,
    categoryIds: ['cat-5'], // Frappes & Smoothies
    daysOfWeek: [0, 6], // Saturday and Sunday
    isActive: true,
    description: '15% discount on ice-blended frappes and healthy smoothies every Saturday & Sunday',
    descriptionKh: 'បញ្ចុះតម្លៃ ១៥% រៀងរាល់ថ្ងៃសៅរ៍ និងថ្ងៃអាទិត្យ លើភេសជ្ជៈក្រឡុកទាំងអស់',
    badge: '🍹 Weekend Splash',
  },
  {
    id: 'promo-vip-member',
    name: 'VIP / Regular Guest Perk 10%',
    nameKh: 'ភ្ញៀវកិត្តិយស VIP បញ្ចុះតម្លៃ ១០%',
    type: 'PERCENT',
    value: 10,
    isActive: true,
    description: 'Store-wide 10% discount for registered VIP loyalty cardholders',
    descriptionKh: 'បញ្ចុះតម្លៃ ១០% លើវិក្កយបត្រសរុបសម្រាប់សមាជិក VIP',
    badge: '👑 VIP Loyalty',
  },
];

export const getPromotions = (): Promotion[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse promotions', e);
  }
  return INITIAL_PROMOTIONS;
};

export const savePromotions = (promotions: Promotion[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
};

export const togglePromotion = (id: string): Promotion[] => {
  const list = getPromotions();
  const updated = list.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
  savePromotions(updated);
  return updated;
};

export const isPromotionTimeActive = (promo: Promotion, date: Date = new Date()): boolean => {
  if (!promo.isActive) return false;

  // Day of week check
  if (promo.daysOfWeek && promo.daysOfWeek.length > 0) {
    const day = date.getDay();
    if (!promo.daysOfWeek.includes(day)) return false;
  }

  // Time window check
  if (promo.startHour !== undefined && promo.endHour !== undefined) {
    const currentHour = date.getHours() + date.getMinutes() / 60;
    if (currentHour < promo.startHour || currentHour >= promo.endHour) {
      return false;
    }
  }

  return true;
};
