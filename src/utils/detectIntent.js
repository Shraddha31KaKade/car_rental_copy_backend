// src/utils/detectIntent.js

/**
 * Detects the intent of a user message with high priority on specific phrases.
 * Supports the Hybrid "Strategic Waterfall" model.
 */
const detectIntent = (message) => {
  const msg = message.toLowerCase().trim();

  // 1. CRITICAL ACTIONS (Cancellations, Admin Reviews)
  if (msg.includes("cancel") && (msg.includes("booking") || msg.includes("reserve"))) return "CANCEL_BOOKING";
  if (msg.includes("pending") || msg.includes("review")) return "VIEW_PENDING";
  if (msg.includes("rc") || msg.includes("document") || msg.includes("license")) return "VIEW_DOCUMENTS";

  // 2. ROLE-SPECIFIC ACCESS (Dashboard, Profile)
  const rolePhrases = ["dashboard", "my profile", "admin panel", "owner hub", "host dashboard", "admin access"];
  if (rolePhrases.some(phrase => msg.includes(phrase))) return "ROLE_ACCESS_HELP";

  // 3. BOOKING FLOW (How to book)
  const bookingPhrases = [
    "how to book", "where to book", "steps to book", "process for booking", 
    "how can i rent", "start booking", "booking flow", "booking procedure", "reserve a car"
  ];
  if (bookingPhrases.some(phrase => msg.includes(phrase))) return "BOOKING_FLOW";

  // 4. VIEW STATUS (My Bookings)
  if (msg.includes("where") && (msg.includes("booking") || msg.includes("rent") || msg.includes("order"))) return "VIEW_BOOKINGS";
  if (msg.includes("show my bookings") || msg.includes("my active rentals") || msg.includes("my journey")) return "VIEW_BOOKINGS";

  // 5. OWNER HELP (Listing a car)
  const ownerPhrases = [
    "how to list", "add my car", "upload rc", "list vehicle", 
    "list my car", "host my car", "partner with you", "earn money", "become host"
  ];
  if (ownerPhrases.some(phrase => msg.includes(phrase))) return "OWNER_HELP";

  // 6. PAYMENT & PRICING
  const paymentKeywords = ["pay", "payment", "card", "billing", "charges", "refund", "transaction", "pricing", "fees", "cost"];
  if (paymentKeywords.some(kw => msg.includes(kw))) return "PAYMENT_INFO";

  // 7. PLATFORM SERVICES
  if (msg.includes("service") || msg.includes("offer") || msg.includes("package") || msg.includes("wedding") || msg.includes("chauffeur")) return "SERVICES_HELP";

  // 8. AUTH (Login/Logout)
  if (msg.includes("login") || msg.includes("logout") || msg.includes("sign up") || msg.includes("register")) return "AUTH_HELP";

  // 9. CAR SEARCH (Database Query Triggers)
  const brands = ["bmw", "audi", "mercedes", "toyota", "honda", "tesla", "tata", "mahindra"];
  const categories = ["suv", "sedan", "hatchback", "automatic", "petrol", "diesel"];
  const hasBudget = /\d{4,}/.test(msg);
  const hasBrandOrType = brands.some(b => msg.includes(b)) || categories.some(c => msg.includes(c));
  const searchTriggers = ["show", "find", "search", "available", "rent"];
  
  if (hasBudget || hasBrandOrType || (searchTriggers.some(t => msg.includes(t)) && msg.includes("car"))) {
    return "CAR_SEARCH";
  }

  // 10. BMAD / DEVELOPMENT
  const bmadKeywords = ["bmad", "prd", "sprint", "epic", "story", "architecture", "brainstorming"];
  if (bmadKeywords.some(kw => msg.includes(kw))) return "BMAD_HELP";

  return "GENERAL_CHAT";
};

module.exports = { detectIntent };
