import { User } from '@/types/user';

export interface UserRepository {
  getById(userId: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
}
