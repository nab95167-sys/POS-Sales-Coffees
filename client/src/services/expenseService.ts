export interface Expense {
  id: string;
  timestamp: string;
  category: 'Ice & Water' | 'Dairy & Fresh Produce' | 'Packaging & Cups' | 'Cleaning Supplies' | 'Maintenance & Repair' | 'Staff Meal / Misc';
  amount: number;
  currency: 'USD' | 'KHR';
  description: string;
  paidTo: string;
  recordedBy: string;
}

const STORAGE_KEY = 'coffee_pos_expenses';

export const getExpenses = (): Expense[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse expenses', e);
  }

  // Initial mock expenses for today
  return [
    {
      id: 'exp-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      category: 'Ice & Water',
      amount: 4.50,
      currency: 'USD',
      description: 'Morning purified tube ice delivery (3 bags)',
      paidTo: 'Phnom Penh Pure Ice Co.',
      recordedBy: 'Sokha Ly',
    },
    {
      id: 'exp-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      category: 'Dairy & Fresh Produce',
      amount: 8.00,
      currency: 'USD',
      description: 'Emergency fresh whole milk top-up (4L)',
      paidTo: 'Lucky Supermarket',
      recordedBy: 'Alex Wright',
    },
  ];
};

export const addExpense = (expense: Omit<Expense, 'id' | 'timestamp'>): Expense => {
  const current = getExpenses();
  const newExp: Expense = {
    ...expense,
    id: `exp-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newExp, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newExp;
};

export const deleteExpense = (id: string) => {
  const current = getExpenses();
  const updated = current.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getTotalExpensesToday = (): number => {
  const expenses = getExpenses();
  const todayStr = new Date().toDateString();
  return expenses
    .filter((e) => new Date(e.timestamp).toDateString() === todayStr)
    .reduce((sum, e) => sum + (e.currency === 'KHR' ? e.amount / 4100 : e.amount), 0);
};
