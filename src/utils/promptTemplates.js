// src/utils/promptTemplates.js

const getDocumentExtractionPrompt = (documentType) => `
You are an expert document verifier for a car rental portal. Analyze the provided ${documentType} image.
Extract the data strictly according to the following JSON schema. Do not include markdown formatting or outside text.
Return ONLY valid JSON.

Schema to extract:
1. ownerNameFound: The name of the registered owner or person.
2. vehicleNumberFound: The license plate/registration number (if applicable).
3. expiryDateFound: The expiration date of the document in YYYY-MM-DD format.
4. isReadable: Boolean, true if the text is clearly legible, false if blurry or cut off.
5. mismatchIssues: An array of strings describing any obvious red flags, tampered text, or suspicious data.
6. aiSummary: A 2-sentence summary of the document's validity.
7. riskLevel: Enum ("LOW", "MEDIUM", "HIGH") based on readability and mismatch issues.

If you cannot find a field, return null for that field.
`;

module.exports = {
  getDocumentExtractionPrompt
};
