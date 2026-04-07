// const service = require("../services/carService");

// exports.getCars = async (req, res) => {
//   try {
//     const cars = await service.getAllCars();
//     res.json(cars);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.createCar = async (req, res) => {
//   try {
//     const car = await service.addCar(req.body);
//     res.json(car);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };




const prisma = require("../config/prisma");

exports.getAllCars = async (req, res) => {
  try {
    const { brand, search } = req.query;
    
    let where = {};
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } }
      ];
    }

    const cars = await prisma.car.findMany({ 
      where,
      include: { owner: { select: { name: true } } }
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCarById = async (req, res) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: Number(req.params.id) },
      include: { 
        owner: { select: { name: true, email: true } },
        bookings: { include: { user: { select: { name: true } } } }
      }
    });

    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }

    res.json(car);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCar = async (req, res) => {
  try {
    const { name, brand, type, year, price, seats, transmission, fuel, location, image } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access detected." });
    }

    // Determine finalized image path
    let displayImage = image; // fallback to URL if provided
    if (req.file) {
      displayImage = `/uploads/${req.file.filename}`;
    }

    const ownerId = Number(req.user.id);
    const parsedPrice = Math.floor(Number(price || 0));
    const parsedYear = year ? Math.floor(Number(year)) : null;
    const parsedSeats = seats ? Math.floor(Number(seats)) : null;

    const car = await prisma.car.create({
      data: {
        name,
        brand,
        type,
        year: parsedYear,
        price: parsedPrice,
        seats: parsedSeats,
        transmission,
        fuel,
        location,
        image: displayImage,
        ownerId: ownerId,
      }
    });

    // Auto-upgrade user role to OWNER
    await prisma.user.update({
      where: { id: ownerId },
      data: { role: "OWNER" }
    });

    res.status(201).json(car);
  } catch (error) {
    console.error("CREATE CAR ERROR:", error);
    res.status(500).json({ error: "Asset Integration Denied: " + error.message });
  }
};