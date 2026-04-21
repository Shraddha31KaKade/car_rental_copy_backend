// src/services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Handles guidance and QA using Gemini with full project context.
 */
const getGeminiResponse = async (message, intent, history = []) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "") {
      return "GEMINI_API_KEY is missing. Please check your backend .env file.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
    You are the "CarRental Elite AI Expert". You provide professional assistance for a premium car rental platform.
    
    ### CONTEXT & KNOWLEDGE:
    - **Renters**: Can browse '/cars', book journeys, and view statuses in their Dashboard.
    - **Owners**: Manage fleets in the Owner Dashboard. To add a car: Dashboard > My Cars > Add New Vehicle > Upload Photos & RC Document.
    - **Admins**: Review listings and verifications in the Admin Panel. They handle "Pending Reviews" and "RC Documents".
    - **Services**: We offer Chauffeur Drives, Wedding Specials, and Airport Transfers on the '/services' page.
    - **Authentication**: Login/Register are in the top nav; Logout is in the profile dropdown.
    - **Currency**: All prices are in INR (₹).

    ### GUIDELINES:
    1. **Role-Awareness**: If a user asks to "list a car" but is a CUSTOMER, explain they need to register as a Host first.
    2. **Step-by-Step**: Always provide numbered steps for complex actions (like booking or listing).
    3. **Tone**: Premium, helpful, and concise. Use emojis sparingly (🏎️, 📍, ✅).
    4. **Safety**: Do not reveal private owner contact info until a booking is authorized.
  `;

    // Construct a single string prompt with history
    const historyText = history.slice(-3).map(h => `${h.isBot ? "Assistant" : "User"}: ${h.text}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nRecent History:\n${historyText}\n\nUser Question: ${message}\nAnswer:`;

    const result = await model.generateContent(fullPrompt);
    return result.response.text();

  } catch (error) {
    console.error("Gemini Error Detail:", error);
    return "I’m unable to answer that right now, but I can still help with car search, booking flow, owner dashboard guidance, and admin access rules.";
  }
};

module.exports = { getGeminiResponse };
