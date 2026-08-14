import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Expense, ExpenseCategory, PaymentStatus } from '@/types/expense';
import { ExpenseRepository } from '@/repositories/interfaces/expenseRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getOptionalString,
  getRequiredNumber,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const expensesCollection = 'expenses';

const validCategories = Object.values(ExpenseCategory) as readonly Expense['category'][];
const validPaymentStatuses = Object.values(PaymentStatus) as readonly Expense['paymentStatus'][];

const mapExpenseToFirestore = (expense: Expense): Record<string, unknown> => ({
  id: expense.id,
  eventId: expense.eventId,
  title: expense.title,
  category: expense.category,
  amount: expense.amount,
  paymentStatus: expense.paymentStatus,
  paidAmount: expense.paidAmount,
  paymentDate: expense.paymentDate,
  notes: expense.notes,
  createdBy: expense.createdBy,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt
});

const mapFirestoreToExpense = (expenseId: string, data: Record<string, unknown>): Expense => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid expense document.');
  }

  return {
    id: expenseId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    title: getRequiredString(data.title, 'title'),
    category: getValidatedEnum(data.category, 'category', validCategories),
    amount: getRequiredNumber(data.amount, 'amount'),
    paymentStatus: getValidatedEnum(data.paymentStatus, 'paymentStatus', validPaymentStatuses),
    paidAmount: getRequiredNumber(data.paidAmount, 'paidAmount'),
    paymentDate: getOptionalString(data.paymentDate),
    notes: getOptionalString(data.notes),
    createdBy: getRequiredString(data.createdBy, 'createdBy'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed ExpenseRepository. `expenses/{expenseId}` — a flat
 * top-level collection carrying an `eventId` field, matching guests/
 * functions rather than an `events/{eventId}/expenses` subcollection.
 *
 * `create`/`update`/`delete` exist for interface completeness (matching
 * the other repositories) but are never called by application code —
 * Firestore rules deny all client writes to `expenses`; the trusted Cloud
 * Functions (createExpense, updateExpense, deleteExpense) are the only
 * writers.
 */
export class FirebaseExpenseRepository implements ExpenseRepository {
  private collectionPath = collection(firestore, expensesCollection);

  async getById(expenseId: string): Promise<Expense | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, expenseId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToExpense(expenseId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load expense.');
    }
  }

  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    try {
      const ref = doc(this.collectionPath);
      const created: Expense = { ...expense, id: ref.id };
      await setDoc(ref, mapExpenseToFirestore(created));
      return created;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create expense.');
    }
  }

  async update(expense: Expense): Promise<Expense> {
    try {
      const ref = doc(this.collectionPath, expense.id);
      await updateDoc(ref, mapExpenseToFirestore(expense));
      return expense;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update expense.');
    }
  }

  async delete(expenseId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, expenseId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete expense.');
    }
  }

  async listByEvent(eventId: string): Promise<Expense[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToExpense(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list expenses.');
    }
  }
}
