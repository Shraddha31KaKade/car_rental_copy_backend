// src/services/carSearchService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Mock data as fallback or for reference
const MOCK_CARS = [
  { brand: "BMW", name: "BMW X1", type: "SUV", price: 28000, fuel: "Petrol", transmission: "Automatic" },
  { brand: "Audi", name: "Audi A4", type: "SEDAN", price: 32000, fuel: "Diesel", transmission: "Automatic" },
  { brand: "Toyota", name: "Toyota Fortuner", type: "SUV", price: 35000, fuel: "Diesel", transmission: "Manual" },
  { brand: "Tata", name: "Tata Nexon", type: "SUV", price: 15000, fuel: "Electric", transmission: "Automatic" },
  { brand: "Honda", name: "Honda City", type: "SEDAN", price: 18000, fuel: "Petrol", transmission: "Automatic" }
];

/**
 * Searches for cars based on filters.
 * Returns results from DB or Mock as fallback.
 */
const searchCars = async (filters) => {
  try {
    let where = { listingStatus: "APPROVED" };

    if (filters.brand) {
      where.name = { contains: filters.brand, mode: "insensitive" };
    }
    if (filters.category) {
      where.type = { contains: filters.category, mode: "insensitive" };
    }
    if (filters.maxPrice) {
      where.price = { lte: filters.maxPrice };
    }
    if (filters.transmission) {
      where.transmission = { contains: filters.transmission, mode: "insensitive" };
    }
    if (filters.fuel) {
      where.fuel = { contains: filters.fuel, mode: "insensitive" };
    }

    const results = await prisma.car.findMany({
      where,
      take: 6,
      orderBy: { price: "asc" }
    });

    // If DB is empty, use Mock for demo
    if (results.length === 0 && Object.keys(where).length === 1) {
       return MOCK_CARS.slice(0, 5); 
    }

    return results;
  } catch (error) {
    console.error("CarSearchService Error:", error.message);
    return MOCK_CARS.filter(car => {
      if (filters.maxPrice && car.price > filters.maxPrice) return false;
      if (filters.category && car.type !== filters.category) return false;
      return true;
    });
  }
};

module.exports = { searchCars };
