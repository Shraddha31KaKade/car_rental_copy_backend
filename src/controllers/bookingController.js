const prisma = require("../config/prisma");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.createBooking = async (req, res) => {
  try {
    const { carId, startDate, endDate } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
       return res.status(400).json({ error: "Start date cannot be in the past." });
    }
    if (end < start) {
       return res.status(400).json({ error: "End date cannot be before start date." });
    }

    // Check if car exists
    const car = await prisma.car.findUnique({ where: { id: Number(carId) } });
    if (!car) return res.status(404).json({ error: "Car not found" });

    // Check availability overlapping
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        carId: Number(carId),
        status: { in: ['APPROVED', 'ACTIVE', 'PENDING'] },
        OR: [
           { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (overlappingBookings.length > 0) {
      return res.status(400).json({ error: "Car is not available for the selected dates." });
    }

    // Calculate dynamic totalAmount
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    const totalAmount = car.price * days;

    const booking = await prisma.booking.create({
      data: {
        carId: Number(carId),
        userId: Number(req.user.id),
        startDate: start,
        endDate: end,
        totalAmount: totalAmount,
        status: "PENDING"
      },
      include: { car: true }
    });


    // Notify car owner
    if (car.ownerId) {
      await prisma.notification.create({
        data: {
          userId: car.ownerId,
          message: `New booking request received for your ${car.name}.`
        }
      });
    }

    // Send email to customer (renter)
    const user = await prisma.user.findUnique({ where: { id: Number(req.user.id) } });
    if (user && user.email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Booking Confirmation for ${car.name}`,
        text: `Hello ${user.name},\n\nYour booking for ${car.name} from ${start.toDateString()} to ${end.toDateString()} has been received and is currently PENDING approval.\n\nThank you for choosing CarRental!`
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Error sending booking email:", error);
        else console.log("Booking email sent:", info.response);
      });
    }

    res.status(201).json(booking);


  } catch (error) {
    console.error("BOOKING ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: Number(req.user.id) },
      include: { 
        car: { 
          include: { owner: { select: { name: true } } } 
        } 
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error("FETCH BOOKINGS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = Number(id);

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== Number(req.user.id)) {
      return res.status(403).json({ error: "Unauthorized to cancel this booking" });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(req.user.id) } });

    await prisma.booking.delete({
      where: { id: bookingId }
    });

    res.json({ message: "Booking cancelled successfully" });

    // Send cancellation email
    if (user && user.email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Booking Cancelled`,
        text: `Hello ${user.name},\n\nYour booking (ID: ${bookingId}) has been successfully cancelled as requested.\n\nThank you for choosing CarRental.`
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Error sending cancellation email:", error);
        else console.log("Cancellation email sent:", info.response);
      });
    }
  } catch (error) {
    console.error("DELETE BOOKING ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};