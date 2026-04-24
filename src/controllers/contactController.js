const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const twilio = require("twilio");

// Optional: Twilio client initialization
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
}

exports.handleInquiry = async (req, res) => {
  const { name, mobile, email, message } = req.body;

  try {
    // 1. Log the inquiry
    console.log(`[INQUIRY] ${name} (${mobile}): ${message}`);

    // 2. Automate price check - find all approved cars
    const cars = await prisma.car.findMany({
      where: { listingStatus: "APPROVED" }
    });

    let autoResponse = null;
    let matchedCar = null;

    // Use a more flexible matching (e.g. "BMW" matches "BMW X5")
    for (const car of cars) {
      const carWords = car.name.toLowerCase().split(/\s+/);
      const messageLower = message.toLowerCase();
      
      // If the full car name is in the message, or at least two words match
      if (messageLower.includes(car.name.toLowerCase())) {
        matchedCar = car;
        break;
      }
      
      // Secondary check: individual words if the car name is long
      const matches = carWords.filter(word => word.length > 2 && messageLower.includes(word));
      if (matches.length >= 2) {
        matchedCar = car;
        break;
      }
    }

    if (matchedCar) {
      autoResponse = `Hello ${name}! The daily rental for the ${matchedCar.name} (${matchedCar.year}) is ₹${matchedCar.price}. Reply YES to book or call us for details. - CarRental Elite`;
      
      // 3. Send SMS via Twilio if configured
      if (twilioClient && process.env.TWILIO_NUMBER) {
        try {
          await twilioClient.messages.create({
            body: autoResponse,
            from: process.env.TWILIO_NUMBER,
            to: mobile
          });
          console.log(`[SMS SUCCESS] Sent price for ${matchedCar.name} to ${mobile}`);
        } catch (twilioErr) {
          console.error("Twilio SMS send failed:", twilioErr.message);
        }
      } else {
        console.log(`[SMS MOCK] To ${mobile}: ${autoResponse} (Configure TWILIO_SID/TOKEN/NUMBER in .env to send real SMS)`);
      }
    }

    // Save inquiry to database
    await prisma.inquiry.create({
      data: {
        name,
        email,
        mobile,
        message,
        autoReply: autoResponse
      }
    });

    res.status(200).json({
      message: matchedCar 
        ? `Transmission received. We've automatically sent the pricing details for the ${matchedCar.name} as an SMS to ${mobile}.`
        : "Transmission received. Our concierge will review your message and contact you via SMS shortly.",
      autoResponse
    });

  } catch (error) {
    console.error("Inquiry processing error:", error);
    res.status(500).json({ error: "Failed to process inquiry transmission." });
  }
};
