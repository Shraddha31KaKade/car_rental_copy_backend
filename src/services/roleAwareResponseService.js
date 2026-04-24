// src/services/roleAwareResponseService.js

/**
 * Handles role-based access control and specific guidance for the chatbot.
 * Ensures users only get help relevant to their role and current application state.
 */
const getRoleAwareResponse = (role, intent, message) => {
  const msg = message.toLowerCase();

  // 1. DASHBOARD & ACCESS LOGIC
  if (intent === "ROLE_ACCESS_HELP") {
    if (msg.includes("admin")) {
      if (role === "ADMIN") return "Welcome back, Admin. You can access the full management suite at /admin.";
      return "The Admin Panel (/admin) is restricted to authorized personnel. As a " + role.toLowerCase() + ", your main hub is the /dashboard.";
    }
    if (msg.includes("owner") || msg.includes("host")) {
      if (role === "OWNER") return "You can manage your fleet and view analytics at /owner/dashboard.";
      return "To list cars, you must first register as a Host. Once approved, you'll gain access to the Owner Dashboard.";
    }
    
    // If Admin/Owner asks a specific question without explicitly using the word 'admin', let Gemini handle it using its advanced context
    if (role === "ADMIN" || role === "OWNER") return null; 

    return "You can access your personalized profile and journey history at /dashboard.";
  }

  // 2. BOOKING FLOWS
  if (intent === "BOOKING_FLOW") {
    if (role === "GUEST") return "To start a booking, please sign in or create an account first. Once logged in, you can browse our fleet at /cars and request a ride.";
    return "To book your premium ride:\n1. Visit /cars to browse our fleet.\n2. Select a vehicle and check availability.\n3. Click 'Request Booking'.\n4. Once the host approves, your journey will appear in your /dashboard.";
  }

  if (intent === "VIEW_BOOKINGS") {
    if (role === "GUEST") return "Please login to view your upcoming and past journeys. The login button is in the top right.";
    return "You can find all your active bookings, requests, and past rentals in the 'My Journeys' section at /dashboard.";
  }

  if (intent === "CANCEL_BOOKING") {
    if (role === "GUEST") return "To cancel a booking, please login first to access your dashboard.";
    return "To cancel a reservation, please visit the 'My Journeys' tab in your /dashboard, select the trip, and click 'Cancel'. Please note our 24-hour cancellation policy.";
  }

  // 3. OWNER / HOSTING FLOWS
  if (intent === "OWNER_HELP") {
    if (role === "OWNER") return "To add a new car:\n1. Go to /owner/dashboard.\n2. Click 'Add New Vehicle'.\n3. Upload your RC (Registration Certificate) and vehicle photos.\n4. Submit for Admin review.";
    return "Interested in becoming a host? Log out of your current account and register using the 'Become a Host' link to start listing your premium vehicles.";
  }

  // 4. PAYMENTS & SECURITY
  if (intent === "PAYMENT_INFO") {
    return "All payments on Antigravity are handled securely through our platform. We support major credit cards and UPI. You only pay once the host has confirmed your booking request.";
  }

  // 5. SERVICES & AUTH
  if (intent === "SERVICES_HELP") {
    return "Explore our boutique services at /services, including Chauffeur-driven luxury, Wedding specials, and VIP Airport transfers.";
  }

  if (intent === "AUTH_HELP") {
    return "You can manage your account, sign up, or log out using the profile menu in the top navigation bar.";
  }

  // 6. DEVELOPER / BMAD
  if (intent === "BMAD_HELP") {
    return "I am trained in the BMAD Method (BSP, PM, CA, DS, etc.). How can I help you with the current sprint or project analysis, Shraddha?";
  }

  // 7. CLARIFICATION / FALLBACK
  if (intent === "CLARIFICATION") {
    return "I'm not completely sure what you mean. Could you please rephrase? You can ask me about booking a car, your current reservations, or how to list your vehicle.";
  }

  return null; // No direct match, proceed to Gemini fallback
};

module.exports = { getRoleAwareResponse };
