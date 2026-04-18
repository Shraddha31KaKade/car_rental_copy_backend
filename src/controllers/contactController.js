const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.handleInquiry = async (req, res) => {
  const { name, mobile, email, message } = req.body;

  try {
    // 1. Log the inquiry (could save to a Contact model if it existed, but we'll simulate for now)
    console.log(`New Inquiry from ${name} (${mobile}): ${message}`);

    // 2. Automate price check
    // Logic: Look for car names in the message
    const cars = await prisma.car.findMany({
      where: {
        status: "APPROVED"
      }
    });

    let autoResponse = null;
    let foundCar = null;

    for (const car of cars) {
      if (message.toLowerCase().includes(car.name.toLowerCase())) {
        foundCar = car;
        break;
      }
    }

    if (foundCar) {
      autoResponse = `Hello ${name}, the daily rent for the ${foundCar.name} (${foundCar.year}) is ₹${foundCar.price}. Would you like to proceed with a booking?`;
      
      // In a real scenario, we would use Twilio here:
      /*
      const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await twilio.messages.create({
        body: autoResponse,
        from: process.env.TWILIO_NUMBER,
        to: mobile
      });
      */
      console.log(`[AUTO-SMS to ${mobile}]: ${autoResponse}`);
    }

    res.status(200).json({
      message: foundCar 
        ? `Transmission received. We've automatically sent the pricing details for the ${foundCar.name} to your mobile.`
        : "Transmission received. Our concierge will contact you shortly.",
      autoResponse
    });

  } catch (error) {
    console.error("Inquiry error:", error);
    res.status(500).json({ error: "Failed to process inquiry" });
  }
};
