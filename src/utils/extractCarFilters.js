// src/utils/extractCarFilters.js

/**
 * Extracts specific car filters from a natural language message.
 * Merges new filters with existing previous context.
 */
const extractCarFilters = (message, previousFilters = {}) => {
  const msg = message.toLowerCase().replace(/,/g, '');
  const filters = { ...previousFilters };

  // 1. Max Price Extraction
  const priceMatch = msg.match(/(?:under|below|less than|budget|max|₹)?\s?(\d{4,6})/);
  if (priceMatch) {
    filters.maxPrice = parseInt(priceMatch[1]);
  }

  // 2. Brand Extraction
  const brands = ["bmw", "audi", "mercedes", "toyota", "honda", "tesla", "ford", "mahindra", "tata", "hyundai", "kia"];
  const foundBrand = brands.find(b => msg.includes(b));
  if (foundBrand) {
    filters.brand = foundBrand.charAt(0).toUpperCase() + foundBrand.slice(1);
  }

  // 3. Category Extraction
  const categories = ["suv", "sedan", "hatchback", "coupe", "convertible", "luxury"];
  const foundCategory = categories.find(c => msg.includes(c));
  if (foundCategory) {
    filters.category = foundCategory.toUpperCase();
  }

  // 4. Transmission
  if (msg.includes("automatic") || msg.includes("auto")) filters.transmission = "Automatic";
  if (msg.includes("manual")) filters.transmission = "Manual";

  // 5. Fuel Type
  if (msg.includes("petrol")) filters.fuel = "Petrol";
  if (msg.includes("diesel")) filters.fuel = "Diesel";
  if (msg.includes("electric") || msg.includes("ev")) filters.fuel = "Electric";

  return filters;
};

module.exports = { extractCarFilters };
