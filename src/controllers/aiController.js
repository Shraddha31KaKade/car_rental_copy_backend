const aiService = require("../services/aiService");
const prisma = require("../config/prisma");

exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user ? req.user.id : null;

    // Fetch dynamic project context (e.g. available cars)
    const cars = await prisma.car.findMany({
      where: { listingStatus: "APPROVED" },
      select: { name: true, type: true, price: true, year: true, fuel: true }
    });
    
    const context = `
AVAILABLE FLEET:
${cars.map(c => `- ${c.name} (${c.year}): ${c.type}, ${c.fuel}, ₹${c.price}/day`).join("\n")}

SERVICES:
- Chauffeur Drives
- Airport Transfers
- Corporate Leasing
- Event Concierge
- Wedding Specials
- Inter-City Travels

POLICIES:
- All drivers are verified.
- Premium insurance included.
- 24/7 technical support.
`;

    // 2. AI Intent Extraction with Advanced Fallback
    let { reply, intent } = await aiService.chatResponse(message, context);
    let recommendedCars = [];
    let searchCriteria = intent || { _intent: "search_cars", carType: null, maxBudget: null };

    // BETTER FALLBACK: If AI is offline, use manual matching
    if (!intent) {
      const msg = message.toLowerCase().replace(/,/g, ''); // Remove commas from "30,000"
      
      // Keywords for types
      if (msg.includes("suv")) searchCriteria.carType = "SUV";
      else if (msg.includes("sedan")) searchCriteria.carType = "Sedan";
      else if (msg.includes("hatchback")) searchCriteria.carType = "Hatchback";
      
      // Keywords for brands (common ones)
      const brands = ["bmw", "audi", "mercedes", "toyota", "honda", "tesla", "ford", "mahindra", "tata"];
      const foundBrand = brands.find(b => msg.includes(b));
      if (foundBrand) searchCriteria.brand = foundBrand;

      // Extract budget (looks for numbers > 1000)
      const numMatch = msg.match(/(\d{4,7})/);
      if (numMatch) searchCriteria.maxBudget = parseInt(numMatch[0]);
    }

    // Execute broad search
    let where = { listingStatus: "APPROVED" };
    if (searchCriteria.carType || searchCriteria.brand || searchCriteria.maxBudget) {
      if (searchCriteria.carType) {
        where.type = { contains: searchCriteria.carType, mode: "insensitive" };
      }
      if (searchCriteria.brand) {
        where.name = { contains: searchCriteria.brand, mode: "insensitive" };
      }
      if (searchCriteria.maxBudget) {
        where.price = { lte: parseInt(searchCriteria.maxBudget) };
      }
      
      recommendedCars = await prisma.car.findMany({ where, take: 6 });
      
      if (recommendedCars.length > 0) {
        reply = `I've found ${recommendedCars.length} elite vehicles matching your request. See them below!`;
      } else if (!intent) {
        reply = "I couldn't find any vehicles matching those specific criteria right now. Feel free to try a different budget or category!";
      }
    }

    // Save history and respond
    await prisma.chatHistory.create({
      data: { userId, sessionId: sessionId || "anon", message, isBot: false }
    });
    await prisma.chatHistory.create({
      data: { userId, sessionId: sessionId || "anon", message: reply, isBot: true, intent: searchCriteria }
    });

    res.json({ reply, intent: searchCriteria, recommendedCars });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Transmission interrupted. Please try again." });
  }
};

exports.recommend = async (req, res) => {
  try {
    const { tripType, budget, passengers } = req.body;
    const suggestedTypes = await aiService.generateRecommendations({ tripType, budget, passengers });
    
    const recommendations = await prisma.car.findMany({
      where: {
        type: { in: suggestedTypes },
        price: { lte: budget ? Number(budget) : undefined }
      },
      take: 10
    });

    res.json({ recommendations, suggestedTypes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.extractDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No document provided" });
    }
    
    // In a real scenario we would run Google Vision OCR or Tesseract 
    // to get raw text from req.file.path. For this demo, we simulate
    // extracted text to pass to LLM.
    const demoExtractedText = "Name: John Doe, License No: DL123456789, Expiry: 2028-05-20, DOB: 1990-01-01";
    
    const extractedData = await aiService.extractDocument(demoExtractedText);
    
    const document = await prisma.document.create({
      data: {
        userId: req.user ? req.user.id : 1, // fallback to 1 for demo if no auth
        type: "LICENSE",
        fileUrl: "/uploads/" + req.file.filename,
        extractedData
      }
    });

    res.json({ extractedData, documentId: document.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
