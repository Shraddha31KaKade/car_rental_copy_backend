// src/utils/detectIntent.js

/**
 * Detects the intent of a user message with high priority on specific phrases.
 * Prevents "list car" from being confused with "find car".
 */
const detectIntent = (message) => {
  const msg = message.toLowerCase().trim();

  // 1. CANCEL_BOOKING
  if (msg.includes("cancel") && (msg.includes("booking") || msg.includes("reserve"))) return "CANCEL_BOOKING";

  // 2. ADMIN_REVIEWS / DOCUMENTS
  if (msg.includes("pending") || msg.includes("review")) return "VIEW_PENDING";
  if (msg.includes("rc") || msg.includes("document") || msg.includes("license")) return "VIEW_DOCUMENTS";

  // 3. OWNER_HELP (High Priority - specific phrases)
  const ownerPhrases = [
    "how to list", "add my car", "upload rc", "list vehicle", 
    "list my car", "host my car", "partner with you", "earn money"
  ];
  if (ownerPhrases.some(phrase => msg.includes(phrase))) return "OWNER_HELP";
  
  const ownerKeywords = ["host", "owner dashboard", "my fleet", "listing status", "owner help"];
  if (ownerKeywords.some(kw => msg.includes(kw))) return "OWNER_HELP";

  // 4. ADMIN_HELP
  const adminPhrases = ["admin dashboard", "approve my car", "why rejected", "verification status", "review my listing", "show admin dashboard"];
  if (adminPhrases.some(phrase => msg.includes(phrase))) return "ADMIN_HELP";
  
  const adminKeywords = ["admin", "moderator", "system check", "approve", "reject"];
  if (adminKeywords.some(kw => msg.includes(kw))) return "ADMIN_HELP";

  // 5. SERVICES_HELP
  if (msg.includes("service") || msg.includes("offer") || msg.includes("package")) return "SERVICES_HELP";

  // 6. AUTH_HELP
  if (msg.includes("login") || msg.includes("logout") || msg.includes("sign up") || msg.includes("register")) return "AUTH_HELP";

  // 7. BOOKING_HELP / RENTER HELP
  const bookingPhrases = ["how to book", "where to book", "my journey", "booking status", "reserve a car"];
  if (bookingPhrases.some(phrase => msg.includes(phrase))) return "BOOKING_HELP";

  // 8. ROLE_ACCESS_HELP
  const rolePhrases = ["open dashboard", "my profile", "not working", "dashboard access", "cannot access"];
  if (rolePhrases.some(phrase => msg.includes(phrase))) return "ROLE_ACCESS_HELP";

  // 9. PAYMENT_HELP
  const paymentKeywords = ["pay", "payment", "card", "billing", "charges", "refund", "transaction"];
  if (paymentKeywords.some(kw => msg.includes(kw))) return "PAYMENT_HELP";

  // 10. CAR_SEARCH
  const brands = ["bmw", "audi", "mercedes", "toyota", "honda", "tesla", "tata", "mahindra"];
  const categories = ["suv", "sedan", "hatchback", "automatic", "petrol", "diesel"];
  const hasBudget = /\d{4,}/.test(msg); // 4+ digits
  const hasBrandOrType = brands.some(b => msg.includes(b)) || categories.some(c => msg.includes(c));
  
  const searchTriggers = ["show", "find", "search", "available", "rent"];
  const hasSearchTrigger = searchTriggers.some(t => msg.includes(t));

  if (hasBudget || hasBrandOrType || (hasSearchTrigger && msg.includes("car"))) {
    return "CAR_SEARCH";
  }

  // DEFAULT
  return "GENERAL_CHAT";
};

module.exports = { detectIntent };
