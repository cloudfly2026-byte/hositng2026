import {
  PrismaUnitOfWork,
  createInitialStorage,
} from './repositories/persistence-engine';

export * from './repositories/persistence-engine';

export function createTestUnitOfWork(): PrismaUnitOfWork {
  return new PrismaUnitOfWork(createInitialStorage());
}

export function createPrismaUnitOfWork(): PrismaUnitOfWork {
  return new PrismaUnitOfWork();
}
