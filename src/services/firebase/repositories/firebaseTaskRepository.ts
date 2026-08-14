import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from '@/services/firebase/firestore';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { TaskRepository } from '@/repositories/interfaces/taskRepository';
import { RepositoryDataError, RepositoryInfrastructureError } from '@/repositories/errors';
import {
  getOptionalString,
  getRequiredString,
  getValidatedEnum
} from '@/services/firebase/repositories/firestoreMapping';

const tasksCollection = 'tasks';

const validStatuses = Object.values(TaskStatus) as readonly Task['status'][];
const validPriorities = Object.values(TaskPriority) as readonly Task['priority'][];

const mapTaskToFirestore = (task: Task): Record<string, unknown> => ({
  id: task.id,
  eventId: task.eventId,
  title: task.title,
  description: task.description,
  dueDate: task.dueDate,
  status: task.status,
  priority: task.priority,
  assignedTo: task.assignedTo,
  createdBy: task.createdBy,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

const mapFirestoreToTask = (taskId: string, data: Record<string, unknown>): Task => {
  if (!data || typeof data !== 'object') {
    throw new RepositoryDataError('Invalid task document.');
  }

  return {
    id: taskId,
    eventId: getRequiredString(data.eventId, 'eventId'),
    title: getRequiredString(data.title, 'title'),
    description: getOptionalString(data.description),
    dueDate: getOptionalString(data.dueDate),
    status: getValidatedEnum(data.status, 'status', validStatuses),
    priority: getValidatedEnum(data.priority, 'priority', validPriorities),
    assignedTo: getOptionalString(data.assignedTo),
    createdBy: getRequiredString(data.createdBy, 'createdBy'),
    createdAt: getRequiredString(data.createdAt, 'createdAt'),
    updatedAt: getRequiredString(data.updatedAt, 'updatedAt')
  };
};

/**
 * Firestore-backed TaskRepository. `tasks/{taskId}` — a flat top-level
 * collection carrying an `eventId` field, matching guests/functions/
 * expenses/vendors rather than an `events/{eventId}/tasks` subcollection.
 *
 * `create`/`update`/`delete` exist for interface completeness (matching
 * the other repositories) but are never called by application code —
 * Firestore rules deny all client writes to `tasks`; the trusted Cloud
 * Functions (createTask, updateTask, deleteTask) are the only writers.
 */
export class FirebaseTaskRepository implements TaskRepository {
  private collectionPath = collection(firestore, tasksCollection);

  async getById(taskId: string): Promise<Task | null> {
    try {
      const snapshot = await getDoc(doc(this.collectionPath, taskId));
      if (!snapshot.exists()) {
        return null;
      }
      return mapFirestoreToTask(taskId, snapshot.data());
    } catch {
      throw new RepositoryInfrastructureError('Failed to load task.');
    }
  }

  async create(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      const ref = doc(this.collectionPath);
      const created: Task = { ...task, id: ref.id };
      await setDoc(ref, mapTaskToFirestore(created));
      return created;
    } catch {
      throw new RepositoryInfrastructureError('Failed to create task.');
    }
  }

  async update(task: Task): Promise<Task> {
    try {
      const ref = doc(this.collectionPath, task.id);
      await updateDoc(ref, mapTaskToFirestore(task));
      return task;
    } catch {
      throw new RepositoryInfrastructureError('Failed to update task.');
    }
  }

  async delete(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionPath, taskId));
    } catch {
      throw new RepositoryInfrastructureError('Failed to delete task.');
    }
  }

  async listByEvent(eventId: string): Promise<Task[]> {
    try {
      const q = query(this.collectionPath, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnapshot) => mapFirestoreToTask(docSnapshot.id, docSnapshot.data()));
    } catch {
      throw new RepositoryInfrastructureError('Failed to list tasks.');
    }
  }
}
