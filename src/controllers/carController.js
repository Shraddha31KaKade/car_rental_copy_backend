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

// Helper for Geo-spatial calculation (Haversine formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}


exports.getAllCars = async (req, res) => {
  try {
    const { brand, search, lat, lng, radius = 50, startDate, endDate, ownerId } = req.query;
    
    let where = { isPaused: false };
    if (ownerId) {
      where.ownerId = Number(ownerId);
      delete where.isPaused; // owner can see their paused cars
    } else {
      where.listingStatus = 'APPROVED'; // strictly only public approved listings
    }
    
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
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      where.bookings = {
        none: {
          status: { in: ['APPROVED', 'ACTIVE', 'PENDING'] },
          OR: [
             { startDate: { lte: end }, endDate: { gte: start } }
          ]
        }
      };
    }

    let cars = await prisma.car.findMany({ 
      where,
      include: { owner: { select: { name: true } } },
      orderBy: { id: 'desc' }
    });

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = parseFloat(radius);
      
      cars = cars.filter(car => {
        if (!car.lat || !car.lng) return false;
        const dist = getDistanceFromLatLonInKm(userLat, userLng, car.lat, car.lng);
        return dist <= maxRadius;
      });
    }

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

exports.getCarAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await prisma.booking.findMany({
      where: {
        carId: Number(id),
        status: { in: ['APPROVED', 'ACTIVE', 'PENDING'] },
        endDate: { gte: new Date() } // Only future or current
      },
      select: { startDate: true, endDate: true }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCar = async (req, res) => {
  try {
    const { name, brand, type, year, price, condition, seats, transmission, fuel, location, lat, lng } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access detected." });
    }

    let displayImage = null;
    let images = [];
    let rcDocument = null;

    const getFileUrl = (f) => {
      if (f.path.startsWith("http") || f.path.startsWith("https")) return f.path;
      return "/uploads/" + f.filename;
    };

    if (req.files) {
      if (req.files['images']) {
         images = req.files['images'].map(f => getFileUrl(f));
         displayImage = images[0]; // first image is the display image
      } else if (req.files['image']) {
         displayImage = getFileUrl(req.files['image'][0]);
         images = [displayImage];
      }
      if (req.files['rcDocument']) {
         rcDocument = getFileUrl(req.files['rcDocument'][0]);
      }
    }

    const ownerId = Number(req.user.id);
    const parsedPrice = Math.floor(Number(price || 0));
    const parsedYear = year ? Math.floor(Number(year)) : null;
    const parsedSeats = seats ? Math.floor(Number(seats)) : null;

    const car = await prisma.car.create({
      data: {
        name, brand, type, condition,
        year: parsedYear,
        price: parsedPrice,
        seats: parsedSeats,
        transmission, fuel, location,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        image: displayImage,
        images: images,
        rcDocument: rcDocument,
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
    res.status(500).json({ error: error.message });
  }
};

exports.updateCar = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, type, year, price, condition, seats, transmission, fuel, location, lat, lng } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access detected." });
    }

    const carAuth = await prisma.car.findUnique({ where: { id: Number(id) } });
    if (!carAuth || carAuth.ownerId !== Number(req.user.id)) {
      return res.status(403).json({ error: "Forbidden: Not the owner" });
    }

    let updateData = {
      name, brand, type, condition, transmission, fuel, location,
      year: year ? Math.floor(Number(year)) : undefined,
      price: price ? Math.floor(Number(price)) : undefined,
      seats: seats ? Math.floor(Number(seats)) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    };

    const getFileUrl = (f) => {
      if (f.path.startsWith("http") || f.path.startsWith("https")) return f.path;
      return "/uploads/" + f.filename;
    };

    if (req.files) {
      if (req.files['images']) {
         updateData.images = req.files['images'].map(f => getFileUrl(f));
         updateData.image = updateData.images[0];
      }
      if (req.files['rcDocument']) {
         updateData.rcDocument = getFileUrl(req.files['rcDocument'][0]);
      }
    }

    // Clean up undefined properties
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // Automatically set status back to pending if they had changes requested or were rejected
    if (carAuth.listingStatus === "CHANGES_REQUESTED" || carAuth.listingStatus === "REJECTED") {
      updateData.listingStatus = "PENDING_APPROVAL";
    }

    const updatedCar = await prisma.car.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(updatedCar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.pauseCar = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaused } = req.body;

    const carAuth = await prisma.car.findUnique({ where: { id: Number(id) } });
    if (!carAuth || carAuth.ownerId !== Number(req.user.id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedCar = await prisma.car.update({
      where: { id: Number(id) },
      data: { isPaused: Boolean(isPaused) }
    });

    res.json(updatedCar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};