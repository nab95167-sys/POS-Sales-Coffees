export interface BroadcastMessage {
  id: string;
  messageKh: string;
  messageEn: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  author: string;
  createdAt: string;
  isActive: boolean;
}

const STORAGE_KEY = 'coffee_pos_store_broadcast';

export const INITIAL_BROADCASTS: BroadcastMessage[] = [
  {
    id: 'broadcast-1',
    messageKh: '☕ ស្វាគមន៍មកកាន់សាខា #001: ភេសជ្ជៈពិសេសប្រចាំថ្ងៃគឺ Salted Cream Cold Brew! សូមបុគ្គលិកត្រួតពិនិត្យស្តុកទឹកដោះគោនៅម៉ោង 3 រសៀល។',
    messageEn: 'Welcome to Branch #001: Today\'s Special is Salted Cream Cold Brew! Staff please inspect fresh dairy stock at 3:00 PM.',
    priority: 'HIGH',
    author: 'Store General Manager',
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: 'broadcast-2',
    messageKh: '💵 ការរំលឹកអត្រាប្តូរប្រាក់: អត្រាប្តូរប្រាក់ផ្លូវការថ្ងៃនេះគឺ $1.00 = 4,100 ៛ (រៀល)។ ហាមទទួលលុយរហែក ឬក្លែងក្លាយ។',
    messageEn: 'Currency Policy: Dual-currency exchange rate locked at $1.00 = 4,100 KHR. Inspect all high-denomination banknotes.',
    priority: 'NORMAL',
    author: 'Finance Lead',
    createdAt: new Date().toISOString(),
    isActive: false,
  },
];

export const getBroadcasts = (): BroadcastMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse broadcasts', e);
  }
  return INITIAL_BROADCASTS;
};

export const saveBroadcasts = (broadcasts: BroadcastMessage[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(broadcasts));
};

export const getActiveBroadcast = (): BroadcastMessage | null => {
  const all = getBroadcasts();
  return all.find((b) => b.isActive) || null;
};

export const setActiveBroadcast = (id: string): void => {
  const all = getBroadcasts();
  const updated = all.map((b) => ({
    ...b,
    isActive: b.id === id,
  }));
  saveBroadcasts(updated);
};

export const addBroadcast = (
  messageKh: string,
  messageEn: string,
  priority: 'NORMAL' | 'HIGH' | 'URGENT',
  author: string
): BroadcastMessage => {
  const all = getBroadcasts();
  const newMsg: BroadcastMessage = {
    id: `bc-${Date.now()}`,
    messageKh,
    messageEn,
    priority,
    author,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  // Deactivate others if this is set active
  const updated = [newMsg, ...all.map((b) => ({ ...b, isActive: false }))];
  saveBroadcasts(updated);
  return newMsg;
};

export const toggleBroadcast = (id: string): void => {
  const all = getBroadcasts();
  const updated = all.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b));
  saveBroadcasts(updated);
};
