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
const { sendTemplate } = require("../services/emailService");

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

    // Normalize image paths
    const sanitizedCars = cars.map(car => {
      // Only sanitize if it looks like a local filesystem path and is NOT a URL
      if (car.image && !car.image.startsWith('http') && (car.image.includes(':') || car.image.includes('\\'))) {
        const filename = car.image.split(/[\\/]/).pop();
        car.image = `/uploads/${filename}`;
      }
      if (car.images && car.images.length > 0) {
        car.images = car.images.map(img => {
          if (img && !img.startsWith('http') && (img.includes(':') || img.includes('\\'))) {
            return `/uploads/${img.split(/[\\/]/).pop()}`;
          }
          return img;
        });
      }
      return car;
    });

    res.json(sanitizedCars);
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

    if (car.image && !car.image.startsWith('http') && (car.image.includes(':') || car.image.includes('\\'))) {
      const filename = car.image.split(/[\\/]/).pop();
      car.image = `/uploads/${filename}`;
    }
    if (car.images && car.images.length > 0) {
      car.images = car.images.map(img => {
        if (img && !img.startsWith('http') && (img.includes(':') || img.includes('\\'))) {
          return `/uploads/${img.split(/[\\/]/).pop()}`;
        }
        return img;
      });
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
    // Check maintenance mode
    const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (settings?.maintenanceMode) {
      return res.status(503).json({ error: "System is currently under maintenance. Adding new cars is temporarily disabled." });
    }

    const { name, brand, type, year, price, condition, seats, transmission, fuel, location, lat, lng, ownerName, ownerEmail, ownerContact } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access detected." });
    }

    if (req.user.role === "ADMIN") {
      return res.status(403).json({ error: "Admins cannot list cars. Please use a personal account." });
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
        ownerName, ownerEmail, ownerContact,
        image: displayImage,
        images: images,
        rcDocument: rcDocument,
        ownerId: ownerId,
      }
    });

    // Auto-upgrade user role to OWNER if they are not already an OWNER or ADMIN
    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: ownerId },
        data: { role: "OWNER" }
      });
    }

    res.status(201).json(car);
  } catch (error) {
    console.error("CREATE CAR ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateCar = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, type, year, price, condition, seats, transmission, fuel, location, lat, lng, ownerName, ownerEmail, ownerContact } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access detected." });
    }

    const carAuth = await prisma.car.findUnique({ where: { id: Number(id) } });
    if (!carAuth || carAuth.ownerId !== Number(req.user.id)) {
      return res.status(403).json({ error: "Forbidden: Not the owner" });
    }

    let updateData = {
      name, brand, type, condition, transmission, fuel, location,
      ownerName, ownerEmail, ownerContact,
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
    const wasAwaitingChanges = carAuth.listingStatus === "CHANGES_REQUESTED" || carAuth.listingStatus === "REJECTED";
    if (wasAwaitingChanges) {
      updateData.listingStatus = "PENDING_APPROVAL";
    }

    const updatedCar = await prisma.car.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // ── EMAIL → Admin when owner resubmits after CHANGES_REQUESTED or REJECTED ──
    if (wasAwaitingChanges && process.env.ADMIN_EMAIL) {
      const owner = await prisma.user.findUnique({
        where:  { id: Number(req.user.id) },
        select: { name: true, email: true },
      });
      sendTemplate({
        to:       process.env.ADMIN_EMAIL,
        subject:  `[Re-submitted] ${updatedCar.name} — Listing #${updatedCar.id} is ready for re-review`,
        template: "car-resubmitted",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#1a1a2e">🔁 Listing Re-submitted for Review</h2>
            <p>The owner has updated their listing and it is ready for re-review.</p>
            <ul>
              <li><b>Listing ID:</b> #${updatedCar.id}</li>
              <li><b>Car:</b> ${updatedCar.name}</li>
              <li><b>Owner:</b> ${owner?.name || "N/A"} (${owner?.email || "N/A"})</li>
              <li><b>Previous Status:</b> ${carAuth.listingStatus}</li>
            </ul>
            <p>Please log in to the admin dashboard to review.</p>
          </div>
        `,
      });
    }
    // ────────────────────────────────────────────────────────────────────────

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

exports.deleteCar = async (req, res) => {
  try {
    const { id } = req.params;

    const carAuth = await prisma.car.findUnique({ where: { id: Number(id) } });
    if (!carAuth) {
      return res.status(404).json({ error: "Car not found" });
    }

    // Admins or the owner can delete the car
    if (req.user.role !== "ADMIN" && carAuth.ownerId !== Number(req.user.id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Setup cloudinary to delete images
    const cloudinary = require("cloudinary").v2;
    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== "demo") {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const deleteFromCloudinary = async (url) => {
        if (!url || !url.includes("cloudinary.com")) return;
        try {
          // Extract public ID from Cloudinary URL
          // e.g. https://res.cloudinary.com/demo/image/upload/v1234567/car-rental/cars/xyz.jpg
          const parts = url.split("/");
          const uploadIndex = parts.findIndex(p => p === "upload");
          if (uploadIndex !== -1) {
            const publicIdWithExt = parts.slice(uploadIndex + 2).join("/"); // skip version
            const publicId = publicIdWithExt.split(".")[0];
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (err) {
          console.error("Cloudinary deletion error:", err);
        }
      };

      if (carAuth.image) await deleteFromCloudinary(carAuth.image);
      if (carAuth.images && Array.isArray(carAuth.images)) {
        for (const img of carAuth.images) {
          await deleteFromCloudinary(img);
        }
      }
      if (carAuth.rcDocument) await deleteFromCloudinary(carAuth.rcDocument);
    }

    // Delete bookings related to the car first (due to foreign key constraint)
    await prisma.booking.deleteMany({
      where: { carId: Number(id) }
    });

    // Delete the car
    await prisma.car.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Car deleted successfully" });
  } catch (error) {
    console.error("DELETE CAR ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};