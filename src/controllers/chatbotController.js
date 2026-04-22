// src/controllers/chatbotController.js
const { classifyIntent } = require("../services/aiIntentService");
const { extractCarFilters } = require("../utils/extractCarFilters");
const { searchCars } = require("../services/carSearchService");
const { getGeminiResponse } = require("../services/geminiService");
const { getRoleAwareResponse } = require("../services/roleAwareResponseService");

// In-memory session store (Isolated by userId)
const chatSessions = new Map();

exports.handleChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const user = req.user || {}; // Assuming authMiddleware sets req.user
    const userId = user.id || "anon";
    const userRole = user.role || "GUEST"; // CUSTOMER, OWNER, ADMIN

    // 1. SESSION ISOLATION: Get or Create context strictly by user.id
    const sessionKey = userId === "anon" ? `anon-${sessionId || "default"}` : `user-${userId}`;
    const session = chatSessions.get(sessionKey) || {
      lastIntent: null,
      filters: {},
      history: []
    };

    // 2. AI INTENT CLASSIFICATION
    const intent = await classifyIntent(message);

    // 3. ROLE-AWARE RESPONSE LAYER (First Priority)
    let reply = getRoleAwareResponse(userRole, intent, message);

    // 4. ROUTING LOGIC
    let recommendedCars = [];

    if (!reply) {
      // CASE: CAR SEARCH or REFINE
      if (intent === "CAR_SEARCH" || (intent === "GENERAL_CHAT" && session.lastIntent === "CAR_SEARCH")) {
        // Extract and Merge Filters
        const currentFilters = extractCarFilters(message, session.filters);
        session.filters = currentFilters;
        session.lastIntent = "CAR_SEARCH";

        // Query Database (Strictly uses DB logic)
        recommendedCars = await searchCars(currentFilters);

        if (recommendedCars.length > 0) {
          reply = `I found ${recommendedCars.length} cars matching your search. Check them out below!`;
        } else {
          reply = "I couldn't find any premium vehicles matching those specific criteria right now.";
        }
      } 
      // CASE: HELP or GENERAL CHAT (Route to Gemini with context)
      else {
        reply = await getGeminiResponse(message, intent, session.history, userRole);
        session.lastIntent = intent;
      }
    }

    // 5. UPDATE HISTORY (Limited to current user session)
    session.history.push({ text: message, isBot: false });
    session.history.push({ text: reply, isBot: true });
    if (session.history.length > 10) session.history.shift();
    
    chatSessions.set(sessionKey, session);

    // 6. OUTPUT RESPOND
    res.json({
      reply,
      intent,
      recommendedCars,
      role: userRole,
      activeFilters: session.filters
    });

  } catch (error) {
    console.error("Chatbot Controller Error:", error);
    res.status(500).json({ error: "Intelligence core interrupted. Please try again." });
  }
};
