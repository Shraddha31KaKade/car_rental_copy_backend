// src/utils/detectIntent.js

/**
 * Normalizes text by lowercasing, removing punctuation, and standardizing synonyms.
 */
const normalizeText = (text) => {
  let normalized = text.toLowerCase().trim();
  // Remove basic punctuation
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  
  // Synonym mapping
  const synonyms = {
    "reservation": "booking",
    "trip": "booking",
    "journey": "booking",
    "rentals": "booking",
    "dashboard": "panel",
    "hub": "panel",
    "host": "owner",
    "cost": "price",
    "fee": "price",
    "charges": "price"
  };

  const words = normalized.split(/\s+/);
  const mappedWords = words.map(w => synonyms[w] || w);
  return mappedWords.join(" ");
};

/**
 * Intent definition with scoring weights.
 * Primary keywords give high scores (3), secondary give medium (2), context give low (1).
 */
const intents = [
  {
    name: "VIEW_BOOKINGS",
    keywords: { "where": 1, "see": 1, "check": 1, "show": 1, "booking": 3, "history": 2, "my": 1, "active": 2 }
  },
  {
    name: "CANCEL_BOOKING",
    keywords: { "cancel": 3, "abort": 3, "stop": 2, "booking": 2, "refund": 1 }
  },
  {
    name: "ROLE_ACCESS_HELP",
    keywords: { "admin": 3, "panel": 3, "access": 2, "owner": 3, "profile": 2, "where": 1 }
  },
  {
    name: "PAYMENT_INFO",
    keywords: { "pay": 3, "payment": 3, "card": 2, "price": 2, "transaction": 2, "billing": 2, "how much": 2 }
  },
  {
    name: "OWNER_HELP",
    keywords: { "add": 2, "list": 3, "car": 2, "owner": 3, "earn": 2, "money": 1, "upload": 2, "rc": 3 }
  },
  {
    name: "BOOKING_FLOW",
    keywords: { "how": 2, "book": 3, "steps": 2, "process": 2, "rent": 3, "start": 2, "reserve": 3, "car": 1 }
  },
  {
    name: "CLARIFICATION",
    keywords: { "what": 2, "help": 2, "confused": 3, "don't understand": 3, "stuck": 3, "error": 2 }
  }
];

/**
 * Detects intent using a keyword scoring system.
 */
const detectIntent = (message) => {
  const normalizedMsg = normalizeText(message);
  const words = normalizedMsg.split(/\s+/);
  
  // 1. CAR_SEARCH Priority check (Database query triggers)
  const brands = ["bmw", "audi", "mercedes", "toyota", "honda", "tesla", "tata", "mahindra"];
  const categories = ["suv", "sedan", "hatchback", "automatic", "petrol", "diesel"];
  const hasBudget = /\d{4,}/.test(normalizedMsg);
  const hasBrandOrType = brands.some(b => words.includes(b)) || categories.some(c => words.includes(c));
  const searchTriggers = ["show", "find", "search", "available", "rent"];
  
  if (hasBudget || hasBrandOrType || (searchTriggers.some(t => words.includes(t)) && words.includes("car"))) {
    return "CAR_SEARCH";
  }

  // 2. Score Intents
  let bestIntent = "GENERAL_CHAT";
  let maxScore = 0;
  const THRESHOLD = 3; // Minimum score to trigger an intent

  for (const intent of intents) {
    let score = 0;
    
    // Check exact phrases first for immediate high score (optional, but good for common patterns)
    if (intent.name === "VIEW_BOOKINGS" && normalizedMsg.includes("where is my booking")) score += 5;
    
    // Score based on keywords
    for (const word of words) {
      if (intent.keywords[word]) {
        score += intent.keywords[word];
      }
    }
    
    // Check multi-word keywords (e.g. "don't understand")
    for (const kw in intent.keywords) {
      if (kw.includes(" ") && normalizedMsg.includes(kw)) {
         score += intent.keywords[kw];
      }
    }

    if (score > maxScore && score >= THRESHOLD) {
      maxScore = score;
      bestIntent = intent.name;
    }
  }

  return bestIntent;
};

module.exports = { detectIntent, normalizeText };
