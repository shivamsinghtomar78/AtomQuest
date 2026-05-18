import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const generateFallbackDatabaseUrl =
  "postgresql://user:password@localhost:5432/atomquest?schema=public";

const isGenerateCommand = process.argv.includes("generate");
const databaseUrl =
  process.env.DATABASE_URL ??
  (isGenerateCommand ? generateFallbackDatabaseUrl : env("DATABASE_URL"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
