import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql/web";
import { databaseConfig } from "./database-config.ts";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const config = databaseConfig();
const adapter = config.provider === "turso"
  ? new PrismaLibSql({ url: config.url, authToken: config.authToken })
  : new PrismaBetterSqlite3({ url: config.url });

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
