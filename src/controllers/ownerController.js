const prisma        = require("../config/prisma");
const { sendTemplate } = require("../services/emailService");

// ────────────────────────────────────────────────────────────────────────────
exports.getDashboardData = async (req, res) => {
  try {
    const ownerId = Number(req.user.id);

    const carsCount = await prisma.car.count({ where: { ownerId } });

    const pendingRequests = await prisma.booking.count({
      where: { status: "PENDING", car: { ownerId } },
    });

    const approvedBookingsCount = await prisma.booking.count({
      where: { status: "APPROVED", car: { ownerId } },
    });

    res.json({ carsCount, pendingRequests, approvedBookingsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.getOwnerCars = async (req, res) => {
  try {
    const ownerId = Number(req.user.id);
    const cars    = await prisma.car.findMany({
      where:   { ownerId },
      orderBy: { id: "desc" },
    });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.getOwnerRequests = async (req, res) => {
  try {
    const ownerId  = Number(req.user.id);
    const requests = await prisma.booking.findMany({
      where:   { car: { ownerId } },
      include: {
        car:  { select: { name: true, image: true, price: true } },
        user: { select: { name: true, email: true } },
        escrow: true, // INCLUDE ESCROW FOR BREAKDOWN
      },
      orderBy: { id: "desc" },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id }    = req.params;
    const { action } = req.body; // "APPROVE" | "REJECT"
    const ownerId   = Number(req.user.id);

    // Fetch booking with renter info
    const booking = await prisma.booking.findUnique({
      where:   { id: Number(id) },
      include: {
        car:  true,
        user: { select: { name: true, email: true } }, // renter
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.car.ownerId !== ownerId) return res.status(403).json({ error: "Unauthorized" });

    const actionMap = { APPROVE: "APPROVED", REJECT: "REJECTED" };
    const newStatus = actionMap[action];
    if (!newStatus) return res.status(400).json({ error: "Invalid action. Use APPROVE or REJECT." });

    // ── IDEMPOTENCY: skip if status already set ───────────────────────────────
    if (booking.status === newStatus) {
      return res.json({ message: "Status already set", booking });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data:  { status: newStatus },
    });

    // ── In-app notification → renter (keep existing behaviour) ───────────────
    await prisma.notification.create({
      data: {
        userId:  booking.userId,
        message: `Your booking request for ${booking.car.name} was ${newStatus.toLowerCase()} by the host.`,
      },
    });

    // ── EMAIL → renter on APPROVED or REJECTED (NO approve-option link) ───────
    if (booking.user?.email) {
      if (newStatus === "APPROVED") {
        sendTemplate({
          to:       booking.user.email,
          subject:  `Your booking request for ${booking.car.name} has been approved`,
          template: "owner-request-approved",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">✅ Booking Request Approved</h2>
              <p>Hi <b>${booking.user.name}</b>,</p>
              <p>Great news! Your booking request for <b>${booking.car.name}</b> has been approved by the host.</p>
              <p>Log in to your dashboard to view the booking details.</p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      } else {
        sendTemplate({
          to:       booking.user.email,
          subject:  `Your booking request for ${booking.car.name} was not approved`,
          template: "owner-request-rejected",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">❌ Booking Request Not Approved</h2>
              <p>Hi <b>${booking.user.name}</b>,</p>
              <p>Unfortunately, your booking request for <b>${booking.car.name}</b> was not approved by the host.</p>
              <p>Please search for another available vehicle on our platform.</p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const userId        = Number(req.user.id);
    const notifications = await prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    20,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true },
    });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const ownerId = Number(req.user.id);

    const earnings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED", "SETTLED"] },
        car:    { ownerId },
      },
      include: { escrow: true },
    });

    let grossEarnings = 0;
    let platformFees = 0;

    const totalEarnings = earnings.reduce((sum, b) => {
      grossEarnings += b.totalAmount;
      if (b.escrow) {
        platformFees += b.escrow.platformFee;
        return sum + b.escrow.ownerShare;
      }
      const fee = b.totalAmount * 0.15;
      platformFees += fee;
      return sum + (b.totalAmount * 0.85); // fallback if no escrow yet
    }, 0);

    const cars = await prisma.car.findMany({
      where:   { ownerId },
      include: {
        bookings: {
          where:  { status: { in: ["CONFIRMED", "COMPLETED", "ACTIVE"] } },
          select: { totalAmount: true },
        },
      },
    });

    const earningsPerCar = cars.map((car) => ({
      carId:  car.id,
      carName: car.name,
      earned: car.bookings.reduce((sum, b) => sum + (b.escrow ? b.escrow.ownerShare : b.totalAmount * 0.85), 0),
    }));

    const allValidBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED", "SETTLED"] },
        car:    { ownerId },
      },
      include: { escrow: true },
    });

    let earningsPerMonth = {};
    const currYear = new Date().getFullYear();
    for (let i = 0; i < 12; i++) {
      earningsPerMonth[`${currYear}-${(i + 1).toString().padStart(2, "0")}`] = 0;
    }

    allValidBookings.forEach((b) => {
      const d = new Date(b.startDate);
      if (d.getFullYear() === currYear) {
        const m = `${currYear}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        const amount = b.escrow ? b.escrow.ownerShare : b.totalAmount * 0.85;
        earningsPerMonth[m] += amount;
      }
    });

    res.json({ totalEarnings, grossEarnings, platformFees, earningsPerCar, earningsPerMonth, history: allValidBookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
