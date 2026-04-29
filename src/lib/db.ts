import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import type { Config } from '@libsql/client'

// Determine DATABASE_URL with fallback
const databaseUrl = process.env.DATABASE_URL || 'file:/tmp/xuperstream.db'

// Global singleton to prevent multiple Prisma instances in dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('file://')) {
    // Use libSQL adapter (supports both Turso cloud and local SQLite)
    const libsqlConfig: Config = { url: databaseUrl }
    const adapter = new PrismaLibSql(libsqlConfig)
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
    })
  }

  // Fallback: native Prisma SQLite (legacy / unexpected URL format)
  process.env.DATABASE_URL = databaseUrl
  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
