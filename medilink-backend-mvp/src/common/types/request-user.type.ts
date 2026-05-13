import { UserRole, UserStatus } from '@prisma/client';

export type RequestUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
};
