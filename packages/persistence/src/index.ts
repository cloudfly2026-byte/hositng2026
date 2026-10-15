import {
  PrismaUnitOfWork,
  createInitialStorage,
} from './repositories/persistence-engine';
import { PrismaDatabaseUnitOfWork } from './repositories/prisma-database-uow';

export * from './repositories/persistence-engine';
export * from './repositories/prisma-database-uow';

export function createTestUnitOfWork(): PrismaUnitOfWork {
  return new PrismaUnitOfWork(createInitialStorage());
}

export function createPrismaUnitOfWork(): PrismaUnitOfWork {
  return new PrismaUnitOfWork();
}

export function createDatabaseUnitOfWork(prisma: any): PrismaDatabaseUnitOfWork {
  return new PrismaDatabaseUnitOfWork(prisma);
}
