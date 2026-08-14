import { Task } from '@/types/task';

export interface TaskRepository {
  getById(taskId: string): Promise<Task | null>;
  create(task: Omit<Task, 'id'>): Promise<Task>;
  update(task: Task): Promise<Task>;
  delete(taskId: string): Promise<void>;
  listByEvent(eventId: string): Promise<Task[]>;
}
