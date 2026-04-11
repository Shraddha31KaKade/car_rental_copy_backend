const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure to add GEMINI_API_KEY to your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_for_now");

exports.chatResponse = async (message) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt = `
You are an intelligent Car Rental Assistant. 
When a user expresses requirements for a car, extract that into a JSON block within your response using exactly this schema, otherwise just respond conversationally:
\`\`\`json
{
  "_intent": "search_cars",
  "location": "string | null",
  "carType": "string | null (e.g. SUV, Auto, Sedan)",
  "maxBudget": "number | null"
}
\`\`\`
User Query: "${message}"
`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Attempt to extract JSON from the text
    let intent = null;
    const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        intent = JSON.parse(jsonMatch[1]);
      } catch(e) {
        console.error("Failed to parse intent JSON", e);
      }
    }

    return { reply: responseText.replace(/```json([\s\S]*?)```/, '').trim(), intent };
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw new Error("AI Chat Service Unavailable");
  }
};

exports.extractDocument = async (textContext) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt = `
You are a strict Operational Document Parser OCR. You will act on extracted text from an uploaded Driving License or ID Proof.
Analyze the following text and extract the data strictly into the following JSON format. If a field cannot be determined reliably, use null.
\`\`\`json
{
  "fullName": "...",
  "dob": "YYYY-MM-DD",
  "licenseNumber": "...",
  "expiryDate": "YYYY-MM-DD",
  "isExpired": boolean
}
\`\`\`
Return ONLY the raw JSON block.
Text Context: ${textContext}
`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let extractedData = null;
    const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/{[\s\S]*?}/);
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return extractedData;
  } catch (error) {
    console.error("AI Extract Error:", error);
    throw new Error("AI Extraction Service Unavailable");
  }
};

exports.generateRecommendations = async (params) => {
  // Logic to map parameters to car IDs using AI or rule-based logic
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt = `
Given these user parameters: ${JSON.stringify(params)}, return a single JSON array of recommended car types (e.g. ["SUV", "Sedan"]). Only the JSON array.
`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let types = [];
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      types = JSON.parse(jsonMatch[0]);
    }
    return types;
  } catch (error) {
    throw new Error("AI Recommendation Service Unavailable");
  }
};
