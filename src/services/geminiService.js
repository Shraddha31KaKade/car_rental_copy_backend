// src/services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getDocumentExtractionPrompt } = require("../utils/promptTemplates");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Downloads image from URL and converts to base64
 */
async function urlToGenerativePart(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch image from URL");
  const buffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType
    },
  };
}

const extractDocumentInfo = async (imageUrl, documentType) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = getDocumentExtractionPrompt(documentType);
    const imagePart = await urlToGenerativePart(imageUrl);

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Parse the JSON string
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    // Graceful fallback if AI parsing fails
    return {
      ownerNameFound: null,
      vehicleNumberFound: null,
      expiryDateFound: null,
      isReadable: false,
      mismatchIssues: ["AI extraction failed: " + error.message],
      aiSummary: "Could not automatically process document.",
      riskLevel: "HIGH"
    };
  }
};

module.exports = {
  extractDocumentInfo
};
