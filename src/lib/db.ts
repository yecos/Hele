import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

// Determine DATABASE_URL with fallback for local development.
const databaseUrl = process.env.DATABASE_URL || 'file:/tmp/xuperstream.db'

// Global singleton to prevent multiple Prisma instances in dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('file://')) {
    const adapter = new PrismaLibSQL({
      url: databaseUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
    })
  }

  // Native Prisma SQLite for file: URLs such as file:./db/dev.db.
  process.env.DATABASE_URL = databaseUrl

  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
