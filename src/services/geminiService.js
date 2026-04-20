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
Context: You are the CarRental Elite Expert.
Rules: 
1. RENTERS: Browse at /cars.
2. OWNERS: List at /list-cars.
3. ADMINS: Dash at /admin.
Tone: Short & Helpful.
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
