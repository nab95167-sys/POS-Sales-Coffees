import { apiFetch } from './api';

export type ExpenseCategory =
  | 'Ice & Water'
  | 'Dairy & Fresh Produce'
  | 'Packaging & Cups'
  | 'Cleaning Supplies'
  | 'Maintenance & Repair'
  | 'Staff Meal / Misc';

export interface Expense {
  id: string;
  timestamp: string;
  category: ExpenseCategory;
  amount: number;
  currency: 'USD' | 'KHR';
  description: string;
  paidTo: string;
  recordedBy: string;
}

try {
  localStorage.removeItem('coffee_pos_petty_cash_expenses');
} catch {
  // Ignore storage cleanup errors
}

export async function fetchExpenses(): Promise<Expense[]> {
  const data = await apiFetch<{ expenses: Expense[] }>('/api/v1/finance/expenses');
  return data.expenses;
}

export async function createExpenseApi(payload: {
  category: ExpenseCategory;
  amount: number;
  currency: 'USD' | 'KHR';
  description: string;
  paidTo: string;
}): Promise<Expense> {
  const data = await apiFetch<{ expense: Expense }>('/api/v1/finance/expenses', {
    method: 'POST',
    body: payload,
  });
  return data.expense;
}

export async function deleteExpenseApi(id: string): Promise<void> {
  await apiFetch(`/api/v1/finance/expenses/${id}`, { method: 'DELETE' });
}

export function computeTodayExpenses(expenses: Expense[], khrRate = 4100): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  return expenses
    .filter((e) => e.timestamp.startsWith(todayStr))
    .reduce((sum, e) => sum + (e.currency === 'KHR' ? e.amount / khrRate : e.amount), 0);
}

export function computeTotalExpenses(expenses: Expense[], khrRate = 4100): number {
  return expenses.reduce(
    (sum, e) => sum + (e.currency === 'KHR' ? e.amount / khrRate : e.amount),
    0
  );
}
