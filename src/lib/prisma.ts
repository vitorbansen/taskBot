import { PrismaClient } from '@prisma/client';

declare global {
  // Declarar a propriedade prisma no objeto global para evitar múltiplas instâncias
  // Isso é padrão em Next.js para evitar erro com hot reload
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient({
  log: ['query'], // pode remover se quiser
});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
