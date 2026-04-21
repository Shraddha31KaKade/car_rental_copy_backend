const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkCars() {
  try {
    const total = await prisma.car.count();
    const approvedCars = await prisma.car.findMany({ where: { listingStatus: "APPROVED" } });
    console.log("Approved Cars Details:");
    approvedCars.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, isPaused: ${c.isPaused}, Image: ${c.image}`);
    });
    
    const sample = await prisma.car.findFirst();
    if (sample) {
      console.log("Sample Car:", JSON.stringify(sample, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkCars();
