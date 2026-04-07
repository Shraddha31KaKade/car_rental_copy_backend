const prisma = require("../config/prisma");

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

    const booking = await prisma.booking.create({
      data: {
        carId: Number(carId),
        userId: Number(req.user.id),
        startDate: start,
        endDate: end,
        status: "RESERVED"
      },
      include: { car: true }
    });

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

    await prisma.booking.delete({
      where: { id: bookingId }
    });

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("DELETE BOOKING ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};