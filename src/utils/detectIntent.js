// src/utils/detectIntent.js

/**
 * Detects the intent of a user message with high priority on specific phrases.
 * Prevents "list car" from being confused with "find car".
 */
const detectIntent = (message) => {
  const msg = message.toLowerCase().trim();

  // 1. OWNER_HELP (High Priority - specific phrases)
  const ownerPhrases = [
    "how to list", "add my car", "upload rc", "list vehicle", 
    "list my car", "host my car", "partner with you", "earn money"
  ];
  if (ownerPhrases.some(phrase => msg.includes(phrase))) return "OWNER_HELP";
  
  const ownerKeywords = ["host", "owner dashboard", "my fleet", "listing status", "owner help"];
  if (ownerKeywords.some(kw => msg.includes(kw))) return "OWNER_HELP";

  // 2. ADMIN_HELP
  const adminPhrases = ["admin dashboard", "approve my car", "why rejected", "verification status", "review my listing"];
  if (adminPhrases.some(phrase => msg.includes(phrase))) return "ADMIN_HELP";
  
  const adminKeywords = ["admin", "moderator", "system check", "approve", "reject"];
  if (adminKeywords.some(kw => msg.includes(kw))) return "ADMIN_HELP";

  // 3. BOOKING_HELP / RENTER HELP
  const bookingPhrases = ["how to book", "where to book", "my journey", "booking status", "reserve a car", "cancel booking"];
  if (bookingPhrases.some(phrase => msg.includes(phrase))) return "BOOKING_HELP";

  // 4. ROLE_ACCESS_HELP
  const rolePhrases = ["open dashboard", "my profile", "not working", "dashboard access", "cannot access"];
  if (rolePhrases.some(phrase => msg.includes(phrase))) return "ROLE_ACCESS_HELP";

  // 5. PAYMENT_HELP
  const paymentKeywords = ["pay", "payment", "card", "billing", "charges", "refund", "transaction"];
  if (paymentKeywords.some(kw => msg.includes(kw))) return "PAYMENT_HELP";

  // 6. CAR_SEARCH (Specific criteria based)
  // Look for budget numbers (e.g. 30000) or brands/types
  const brands = ["bmw", "audi", "mercedes", "toyota", "honda", "tesla", "tata", "mahindra"];
  const categories = ["suv", "sedan", "hatchback", "automatic", "petrol", "diesel"];
  const hasBudget = /\d{4,}/.test(msg); // 4+ digits
  const hasBrandOrType = brands.some(b => msg.includes(b)) || categories.some(c => msg.includes(c));
  
  const searchTriggers = ["show", "find", "search", "available", "rent"];
  const hasSearchTrigger = searchTriggers.some(t => msg.includes(t));

  if (hasBudget || hasBrandOrType || (hasSearchTrigger && msg.includes("car"))) {
    return "CAR_SEARCH";
  }

  // 7. DEFAULT
  return "GENERAL_CHAT";
};

module.exports = { detectIntent };
