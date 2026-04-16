const prisma = require("../config/prisma");

exports.listPendingCars = async (req, res) => {
  try {
    const cars = await prisma.car.findMany({
      where: {
        listingStatus: {
          in: ["PENDING_APPROVAL", "CHANGES_REQUESTED"]
        }
      },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: cars });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCarDetailsForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await prisma.car.findUnique({
      where: { id: parseInt(id) },
      include: { owner: true }
    });
    
    if (!car) {
      return res.status(404).json({ success: false, error: "Car not found" });
    }
    
    res.json({ success: true, data: car });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reviewListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, rejectionReason } = req.body; 
    
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Unauthorized access detected." });
    }

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: {
        listingStatus: status,
        adminNotes: adminNotes || null,
        rejectionReason: rejectionReason || null,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    res.json({ success: true, message: `Car marked as ${status}`, data: updatedCar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const aiService = require("../services/aiService");

exports.analyzeCarRC = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await prisma.car.findUnique({ where: { id: parseInt(id) } });

    if (!car) return res.status(404).json({ success: false, error: "Car not found" });
    if (!car.rcDocument) return res.status(400).json({ success: false, error: "No RC document uploaded" });

    // Since we don't have actual OCR here, we mock the extracted text based on the car
    const mockExtractedText = `Vehicle RC Document
Owner: ${car.ownerId}
Make: ${car.brand}
Model: ${car.name}
Registration No: ${car.brand?.toUpperCase().substring(0,2)}-01-XX-9999
Maked Year: ${car.year || '2020'}
Fuel: ${car.fuel}`;

    const analysis = await aiService.extractRCDocument(mockExtractedText);

    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
