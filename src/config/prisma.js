//so we can use database connection everywhere
// Imports generated Prisma Client
// Makes it reusable everywhere

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

module.exports = prisma;