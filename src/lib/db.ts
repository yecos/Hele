import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Configure WebSocket for Neon serverless
if (typeof WebSocket === 'undefined') {
  // @ts-expect-error ws is a WebSocket polyfill for serverless environments
  globalThis.WebSocket = ws;
  neonConfig.webSocketConstructor = ws;
}

// Check if we're using Neon (PostgreSQL with connection pool URL)
const isNeon = process.env.DATABASE_URL?.includes('neon.tech') || false;

function createPrismaClient() {
  if (isNeon && process.env.DATABASE_URL) {
    // Neon serverless: use connection pooling via Prisma adapter
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
  }

  // Standard PostgreSQL or local SQLite
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
