import { PrismaPg } from "@prisma/adapter-pg";
// Reuses the same generated client as the main app — one Prisma schema,
// one source of truth for the DB shape, this service just consumes it.
import { PrismaClient } from "../../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
