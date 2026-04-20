// src/services/roleAwareResponseService.js

/**
 * Handles role-based access control and specific guidance for the chatbot.
 * Ensures users only get help relevant to their role.
 */
const getRoleAwareResponse = (role, intent, message) => {
  const msg = message.toLowerCase();

  // 1. ACCESS DENIAL LOGIC (Renter/Owner/Admin)
  if (role === "CUSTOMER") {
    if (msg.includes("admin dashboard") || intent === "ADMIN_HELP") {
      return "You are currently logged in as a renter. The Admin Dashboard is restricted to administrative personnel only.";
    }
    if (msg.includes("owner dashboard") || msg.includes("list my car")) {
      return "You are currently logged in as a renter, so Owner dashboard features like car listing are not available. To become a host, you would need to register as an owner.";
    }
  }

  if (role === "OWNER") {
    if (msg.includes("admin dashboard") || intent === "ADMIN_HELP") {
      return "The Admin Dashboard is restricted to site administrators. As an owner, you have access to your Host Dashboard to manage your fleet.";
    }
  }

  // 2. ROLE-SPECIFIC GUIDANCE TIPS (Helpful context)
  if (role === "CUSTOMER" && intent === "BOOKING_HELP") {
    return "To book a car, browse the fleet at '/cars', select your vehicle, and submit a request. Remember, the owner must approve it before you can pay.";
  }

  if (role === "OWNER" && intent === "OWNER_HELP") {
    return "To list a car, go to your dashboard, click 'List Your Car', and ensure you have your RC (Registration Certificate) ready for upload.";
  }

  if (role === "ADMIN" && intent === "ADMIN_HELP") {
    return "As an admin, you can review all pending car listings and user documents from the admin control panel.";
  }

  return null; // No specific override, continue to Gemini/Search
};

module.exports = { getRoleAwareResponse };
