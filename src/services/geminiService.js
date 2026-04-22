// src/services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Handles guidance and QA using Gemini with full project context.
 */
const getGeminiResponse = async (message, intent, history = [], userRole = "GUEST") => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "") {
      return "GEMINI_API_KEY is missing. Please check your backend .env file.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
    You are the "Antigravity Assistant", a hybrid expert powered by the BMAD Method.
    You serve the Car Rental platform while also acting as a technical co-pilot for the developer, **Shraddha**.

    ### NAVIGATION & ROUTES:
    - User Dashboard: "/dashboard" (Where users find "My Journeys")
    - Car Fleet: "/cars" (Browse all vehicles)
    - Services: "/services" (Premium offerings)
    - Owner Panel: "/owner/dashboard" (For hosts to manage fleets)
    - Admin Panel: "/admin" (System management - restricted)
    - Support: "/contact"
    - Profile: "/profile"

    ### CORE BUSINESS LOGIC:
    1. **Renters**: 
       - Must browse at /cars.
       - Steps: Request > Host Approval > Ride.
       - View bookings at "/dashboard".
    2. **Hosts (Owners)**:
       - Management hub is /owner/dashboard.
       - To list: /owner/dashboard > My Cars > Add New.
       - Requirements: ID Proof & RC Document.
    3. **Admin**:
       - Management hub is /admin.
       - Handles approvals and system health.

    ### STYLE:
    - Professional, premium, and concise.
    - If a user asks "where is my booking", redirect them to /dashboard.
    - If an unauthorized user asks for /admin, explain the restriction politely.
    `;

    // Construct history for context (last 5 messages)
    const historyText = history.slice(-5).map(h => `${h.isBot ? "Assistant" : "User"}: ${h.text}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nRecent History:\n${historyText}\n\nUser Question: ${message}\nAnswer (keep it under 150 words):`;

    const result = await model.generateContent(fullPrompt);
    return result.response.text();

  } catch (error) {
    console.error("Gemini Error Detail:", error);
    return "I hit a small bumps in the road while processing that. Please try rephrasing your question, or browse our premium fleet at /cars in the meantime.";
  }
};

module.exports = { getGeminiResponse };
