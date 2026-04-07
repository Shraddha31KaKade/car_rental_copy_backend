const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getAllCars = async () => {
  return await prisma.cars.findMany();
};

exports.addCar = async (data) => {
  return await prisma.cars.create({
    data: data
  });
};