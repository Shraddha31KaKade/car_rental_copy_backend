const prisma = require("../config/prisma");

exports.getDashboardData = async (req, res) => {
  try {
    const ownerId = Number(req.user.id);

    // Get basic stats
    const carsCount = await prisma.car.count({ where: { ownerId } });
    
    // Get all bookings related to cars owned by this user
    const pendingRequests = await prisma.booking.count({
      where: {
        status: 'PENDING',
        car: { ownerId }
      }
    });

    const approvedBookingsCount = await prisma.booking.count({
      where: {
        status: 'APPROVED',
        car: { ownerId }
      }
    });

    // Basic calculation of earnings (optional extension)
    // Could aggregate based on COMPLETED or APPROVED bookings.

    res.json({
      carsCount,
      pendingRequests,
      approvedBookingsCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOwnerCars = async (req, res) => {
  try {
    const ownerId = Number(req.user.id);
    const cars = await prisma.car.findMany({
      where: { ownerId },
      orderBy: { id: 'desc' }
    });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOwnerRequests = async (req, res) => {
  try {
    const ownerId = Number(req.user.id);
    const requests = await prisma.booking.findMany({
      where: {
        car: { ownerId }
      },
      include: {
        car: { select: { name: true, image: true, price: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { id: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const ownerId = Number(req.user.id);

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: { car: true }
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.car.ownerId !== ownerId) return res.status(403).json({ error: "Unauthorized" });

    // Update status mapping
    let newStatus = 'PENDING';
    if (action === 'APPROVE') newStatus = 'APPROVED';
    if (action === 'REJECT') newStatus = 'REJECTED';

    const updatedBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: newStatus }
    });

    // Fire notification to renter
    if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          message: `Your booking request for ${booking.car.name} was ${newStatus.toLowerCase()} by the host.`
        }
      });
    }

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
