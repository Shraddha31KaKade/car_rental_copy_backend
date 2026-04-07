const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRoles() {
  try {
    const cars = await prisma.car.findMany({
      select: { ownerId: true }
    });
    
    const ownerIds = [...new Set(cars.map(c => c.ownerId).filter(Boolean))];
    
    await prisma.user.updateMany({
      where: {
        id: { in: ownerIds }
      },
      data: {
        role: "OWNER"
      }
    });

    console.log(`Successfully upgraded ${ownerIds.length} users to OWNER role.`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixRoles();
