// src/services/aiIntentService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Uses Gemini to semantically classify the user's intent.
 * Returns a guaranteed intent string.
 */
const classifyIntent = async (message) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "") {
      console.warn("No Gemini API key, falling back to GENERAL_CHAT for intent routing");
      return "GENERAL_CHAT";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `
You are an intent classification engine for a car rental platform.
Analyze the user's message and categorize it into EXACTLY ONE of these intents:

- CAR_SEARCH : Looking to find, show, or rent a specific type of car or budget.
- VIEW_BOOKINGS : Asking about their current trips, past history, or where their booking is.
- CANCEL_BOOKING : Wants to cancel or abort a trip.
- ROLE_ACCESS_HELP : Asking where the admin panel, owner dashboard, or profile is.
- BOOKING_FLOW : Asking for steps or procedures on how to rent/book a car.
- OWNER_HELP : Asking how to list a car, become a host, earn money, or upload an RC document.
- PAYMENT_INFO : Asking about pricing, fees, billing, cards, or refunds.
- SERVICES_HELP: Asking about chauffeur, wedding, or airport transfer services.
- BMAD_HELP: Asking about development workflows, PRDs, epics, or the BMAD method.
- GENERAL_CHAT : Anything conversational, greetings, or unclear queries.

Return ONLY a valid JSON object in this exact format, with no markdown formatting or extra text:
{ "intent": "INTENT_NAME" }
`;

    const fullPrompt = `${systemPrompt}\n\nUser Message: "${message}"\nJSON Output:`;
    
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text().trim();
    
    // Clean up markdown if Gemini accidentally added it
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(cleanJson);
    
    // Validate output
    const validIntents = [
      "CAR_SEARCH", "VIEW_BOOKINGS", "CANCEL_BOOKING", "ROLE_ACCESS_HELP", 
      "BOOKING_FLOW", "OWNER_HELP", "PAYMENT_INFO", "SERVICES_HELP", 
      "BMAD_HELP", "GENERAL_CHAT"
    ];
    
    if (parsed.intent && validIntents.includes(parsed.intent)) {
      return parsed.intent;
    }
    return "GENERAL_CHAT";

  } catch (error) {
    console.error("AI Intent Classification Error:", error);
   
    // Fallback strategy: if AI classifier fails, route to general chat which will handle graceful fallback
    return "GENERAL_CHAT"; 
  }
};

module.exports = { classifyIntent };
