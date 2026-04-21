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
    if (msg.includes("owner dashboard") || msg.includes("list my car") || intent === "OWNER_HELP") {
      return "As a renter, you cannot list cars directly. If you want to become a host:\n1. Log out of your current account.\n2. Complete the 'Become a Host' registration.\n3. Once approved, you can access the Owner Dashboard to list your vehicles.";
    }
  }

  if (role === "OWNER") {
    if (msg.includes("admin dashboard") || intent === "ADMIN_HELP") {
      return "The Admin Dashboard is restricted to site administrators. As an owner, you have access to your Host Dashboard to manage your fleet.";
    }
  }

  // 2. SPECIFIC ACTION GUIDANCE
  if (intent === "CANCEL_BOOKING") {
    return "To cancel your booking:\n1. Go to your Dashboard.\n2. Locate the 'Bookings' or 'My Journeys' section.\n3. Find the specific booking and click 'Cancel Request'.\nNote: Cancellations may be subject to the owner's policy.";
  }

  if (intent === "OWNER_HELP" && role === "OWNER") {
    return "To add your car to the fleet, follow these steps:\n1. Go to Owner Dashboard -> 'My Cars'.\n2. Click the 'Add New Vehicle' button.\n3. Fill in details: Brand, Model, Year, and Fuel Type.\n4. Upload high-quality images of the vehicle.\n5. Upload your RC (Registration Certificate) document for verification.\n6. Submit for Admin Review.";
  }

  if (intent === "VIEW_PENDING" && role === "ADMIN") {
    return "To see pending reviews:\n1. Enter Admin Panel.\n2. Go to 'Listing Reviews' or 'Pending Approvals' tab.\n3. You will see a list of cars and documents awaiting your decision.";
  }

  if (intent === "VIEW_DOCUMENTS" && role === "ADMIN") {
    return "To manage RC books and documents:\n1. Navigate to 'User Verification' in the Admin Panel.\n2. Select a specific user or vehicle listing.\n3. Click 'View Documents' to see uploaded RC books and identity proofs.";
  }

  if (intent === "SERVICES_HELP") {
    return "Explore our premium services at the '/services' page, including Chauffeur Drives, Wedding Specials, and Airport Transfers.";
  }

  if (intent === "AUTH_HELP") {
    return "You can find Login and Sign Up options in the top navigation bar. If you're already logged in, the Logout button is located in your profile dropdown menu.";
  }

  // 3. ROLE-SPECIFIC GUIDANCE TIPS (Helpful context)
  if (role === "CUSTOMER" && intent === "BOOKING_HELP") {
    return "To book a car:\n1. Browse '/cars' fleet.\n2. Select your preferred vehicle.\n3. Choose your dates and click 'Request Booking'.\n4. Wait for the owner's confirmation to proceed.";
  }

  return null; // No specific override, continue to Gemini/Search
};

module.exports = { getRoleAwareResponse };
