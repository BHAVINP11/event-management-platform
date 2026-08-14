import { Expense } from '@/types/expense';

export interface ExpenseRepository {
  getById(expenseId: string): Promise<Expense | null>;
  create(expense: Omit<Expense, 'id'>): Promise<Expense>;
  update(expense: Expense): Promise<Expense>;
  delete(expenseId: string): Promise<void>;
  listByEvent(eventId: string): Promise<Expense[]>;
}
