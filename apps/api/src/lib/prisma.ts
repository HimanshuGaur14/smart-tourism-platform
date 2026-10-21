import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type Db = InstanceType<typeof PrismaClient>;

/** Creates a Prisma client using the node-postgres driver adapter (Prisma 7). */
export function createPrismaClient(databaseUrl: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
