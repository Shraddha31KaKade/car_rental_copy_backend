const prisma = require("../config/prisma");
const { sendTemplate } = require("../services/emailService");

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toDateString();
}

// ────────────────────────────────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { carId, startDate, endDate } = req.body;

    const start = new Date(startDate);
    const end   = new Date(endDate);
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
        status: { in: ["APPROVED", "PAYMENT_PENDING", "CONFIRMED", "ACTIVE", "PENDING"] },
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
    });

    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        carId: Number(carId),
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
    });

    if (overlappingBookings.length > 0 || blockedDates.length > 0) {
      return res.status(400).json({ error: "Car is not available for the selected dates." });
    }

    // Calculate dynamic totalAmount
    const days        = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    const totalAmount = car.price * days;

    const booking = await prisma.booking.create({
      data: {
        carId:       Number(carId),
        userId:      Number(req.user.id),
        startDate:   start,
        endDate:     end,
        totalAmount: totalAmount,
        status:      "PENDING",
      },
      include: { car: true },
    });

    // ── In-app notification → car owner ──────────────────────────────────────
    if (car.ownerId) {
      await prisma.notification.create({
        data: {
          userId:  car.ownerId,
          message: `New booking request received for your ${car.name}.`,
        },
      });
    }

    // ── EMAIL → Admin mailbox only (notification-style, no approve/reject links)
    const renter = await prisma.user.findUnique({
      where:  { id: Number(req.user.id) },
      select: { name: true, email: true },
    });

    sendTemplate({
      to:       process.env.ADMIN_EMAIL,
      subject:  `[New Booking] ${car.name} — ID #${booking.id}`,
      template: "booking-created",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#1a1a2e">📋 New Booking Received</h2>
          <p>A new booking has been submitted and is <b>pending review</b>.</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0"><b>Booking ID:</b></td><td>#${booking.id}</td></tr>
            <tr><td style="padding:6px 0"><b>Car:</b></td><td>${car.name}</td></tr>
            <tr><td style="padding:6px 0"><b>Renter:</b></td><td>${renter?.name || "N/A"} (${renter?.email || "N/A"})</td></tr>
            <tr><td style="padding:6px 0"><b>Dates:</b></td><td>${fmtDate(start)} → ${fmtDate(end)}</td></tr>
            <tr><td style="padding:6px 0"><b>Duration:</b></td><td>${days} day(s)</td></tr>
            <tr><td style="padding:6px 0"><b>Total:</b></td><td>₹${totalAmount}</td></tr>
          </table>
          <p style="margin-top:16px">Log in to the admin dashboard to review this booking.</p>
        </div>
      `,
    });
    // ─────────────────────────────────────────────────────────────────────────

    res.status(201).json(booking);
  } catch (error) {
    console.error("BOOKING ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where:   { userId: Number(req.user.id) },
      include: { car: { include: { owner: { select: { name: true } } } } },
      orderBy: { startDate: "desc" },
    });
    res.json(bookings);
  } catch (error) {
    console.error("FETCH BOOKINGS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.deleteBooking = async (req, res) => {
  try {
    const { id }      = req.params;
    const bookingId   = Number(id);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== Number(req.user.id)) {
      return res.status(403).json({ error: "Unauthorized to cancel this booking" });
    }

    await prisma.booking.delete({ where: { id: bookingId } });

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("DELETE BOOKING ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.approveBooking = async (req, res) => {
  try {
    const { id }  = req.params;
    const booking = await prisma.booking.findUnique({
      where:   { id: Number(id) },
      include: { car: true, user: true },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.car.ownerId !== Number(req.user.id)) return res.status(403).json({ error: "Forbidden" });
    if (booking.status !== "PENDING") return res.status(400).json({ error: "Only PENDING bookings can be approved." });

    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data:  { status: "APPROVED" },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.rejectBooking = async (req, res) => {
  try {
    const { id }    = req.params;
    const { reason } = req.body;
    const booking   = await prisma.booking.findUnique({
      where:   { id: Number(id) },
      include: { car: true, user: true },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.car.ownerId !== Number(req.user.id)) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data:  { status: "REJECTED", rejectionReason: reason || "No reason provided." },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.payBooking = async (req, res) => {
  try {
    const { id }  = req.params;
    const booking = await prisma.booking.findUnique({
      where:   { id: Number(id) },
      include: { car: { include: { owner: true } } },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== Number(req.user.id)) return res.status(403).json({ error: "Forbidden" });
    if (booking.status !== "APPROVED") return res.status(400).json({ error: "Booking is not in APPROVED state." });

    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data:  { status: "CONFIRMED", paymentId: `mock_st_${Date.now()}` },
    });

    res.json({
      message: "Payment successful. Booking CONFIRMED.",
      booking: updated,
      ownerContact: {
        phone:          booking.car.owner.phone || "Not provided",
        email:          booking.car.owner.email,
        pickupLocation: booking.car.location,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};