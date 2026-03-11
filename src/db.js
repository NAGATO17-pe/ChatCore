import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function getOrCreateUser(username) {
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: { username }
  });
}
