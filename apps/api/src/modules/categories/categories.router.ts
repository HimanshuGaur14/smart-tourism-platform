import type { Category } from '@smart-tourism/contracts';
import { Router } from 'express';
import type { Db } from '../../lib/prisma.js';

export function createCategoriesService(db: Db) {
  return {
    async list(): Promise<Category[]> {
      const rows = await db.destinationCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { destinations: { where: { published: true } } } } },
      });
      return rows.map((row) => ({
        id: row.id,
        slug: row.slug as Category['slug'],
        name: row.name,
        description: row.description,
        destinationCount: row._count.destinations,
      }));
    },
  };
}

export function categoriesRouter(service: ReturnType<typeof createCategoriesService>): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300').json({ data: await service.list() });
  });
  return router;
}
