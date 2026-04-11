const aiService = require("../services/aiService");
const prisma = require("../config/prisma");

exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user ? req.user.id : null;

    const { reply, intent } = await aiService.chatResponse(message);

    const chatHistory = await prisma.chatHistory.create({
      data: {
        userId,
        sessionId: sessionId || "anonymous-" + Date.now(),
        message,
        isBot: false
      }
    });

    await prisma.chatHistory.create({
      data: {
        userId,
        sessionId: sessionId || "anonymous-" + Date.now(),
        message: reply,
        isBot: true,
        intent
      }
    });

    let recommendedCars = [];
    if (intent && intent._intent === "search_cars") {
      let where = {};
      if (intent.carType) {
         where.type = { contains: intent.carType, mode: "insensitive" };
      }
      if (intent.maxBudget) {
         const budgetNum = Number(intent.maxBudget.toString().replace(/[^0-9]/g, ''));
         if (budgetNum) where.price = { lte: budgetNum };
      }
      recommendedCars = await prisma.car.findMany({ where, take: 5 });
    }

    res.json({ reply, intent, recommendedCars });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
