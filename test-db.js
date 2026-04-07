const prisma = require('./src/config/prisma');

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:', users);
  const cars = await prisma.car.findMany();
  console.log('Cars:', cars);
}

main().catch(console.error).finally(() => prisma.$disconnect());
