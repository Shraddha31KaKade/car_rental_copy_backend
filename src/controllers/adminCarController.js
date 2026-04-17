const prisma           = require("../config/prisma");
const { sendTemplate } = require("../services/emailService");
const aiService        = require("../services/aiService");

// Listing statuses that trigger an owner email
const EMAIL_STATUSES = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"];

// ────────────────────────────────────────────────────────────────────────────
exports.listPendingCars = async (req, res) => {
  try {
    const cars = await prisma.car.findMany({
      where:   { listingStatus: { in: ["PENDING_APPROVAL", "CHANGES_REQUESTED"] } },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { id: "asc" },
    });
    res.json({ success: true, data: cars });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.getCarDetailsForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const car    = await prisma.car.findUnique({
      where:   { id: parseInt(id) },
      include: { owner: true },
    });

    if (!car) return res.status(404).json({ success: false, error: "Car not found" });

    res.json({ success: true, data: car });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.reviewListing = async (req, res) => {
  try {
    const { id }                              = req.params;
    const { status, adminNotes, rejectionReason } = req.body;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Unauthorized access detected." });
    }

    // Fetch BEFORE update → used for idempotency check + owner email
    const existingCar = await prisma.car.findUnique({
      where:   { id: parseInt(id) },
      include: { owner: { select: { name: true, email: true } } },
    });

    if (!existingCar) {
      return res.status(404).json({ success: false, error: "Car not found" });
    }

    // ── IDEMPOTENCY: skip if status unchanged ─────────────────────────────────
    if (existingCar.listingStatus === status) {
      return res.json({ success: true, message: "Status already set", data: existingCar });
    }

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: {
        listingStatus:   status,
        adminNotes:      adminNotes      || null,
        rejectionReason: rejectionReason || null,
        reviewedBy:      req.user.id,
        reviewedAt:      new Date(),
      },
    });

    // ── EMAIL → car owner on APPROVED / REJECTED / CHANGES_REQUESTED ──────────
    if (EMAIL_STATUSES.includes(status) && existingCar.owner?.email) {
      const ownerName = existingCar.owner.name || "Owner";
      const carName   = existingCar.name;
      const loginUrl  = `${process.env.APP_URL}/login`;

      if (status === "APPROVED") {
        sendTemplate({
          to:       existingCar.owner.email,
          subject:  `Your listing for "${carName}" has been approved! 🎉`,
          template: "car-listing-approved",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">✅ Listing Approved</h2>
              <p>Hi <b>${ownerName}</b>,</p>
              <p>Your car listing for <b>${carName}</b> has been reviewed and <b>approved</b> by our admin team.</p>
              <p>Your listing is now live and visible to renters on the platform.</p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      } else if (status === "REJECTED") {
        sendTemplate({
          to:       existingCar.owner.email,
          subject:  `Your listing for "${carName}" was not approved`,
          template: "car-listing-rejected",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">❌ Listing Not Approved</h2>
              <p>Hi <b>${ownerName}</b>,</p>
              <p>Your car listing for <b>${carName}</b> was <b>not approved</b> after review.</p>
              ${rejectionReason ? `<p><b>Reason:</b> ${rejectionReason}</p>` : ""}
              ${adminNotes      ? `<p><b>Admin Notes:</b> ${adminNotes}</p>`  : ""}
              <p>If you have questions, please contact our support team.</p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      } else if (status === "CHANGES_REQUESTED") {
        sendTemplate({
          to:       existingCar.owner.email,
          subject:  `Changes requested for your listing: "${carName}"`,
          template: "car-listing-changes",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">📝 Changes Requested</h2>
              <p>Hi <b>${ownerName}</b>,</p>
              <p>The admin has reviewed your car listing for <b>${carName}</b> and requires some changes before it can be approved.</p>
              ${adminNotes ? `<p><b>Required changes:</b> ${adminNotes}</p>` : ""}
              <p>
                Please <a href="${loginUrl}" style="color:#4f46e5;font-weight:bold">log in here</a>
                and navigate to <b>Dashboard → My Listings</b> to view the full details and update your listing.
              </p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({ success: true, message: `Car marked as ${status}`, data: updatedCar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
exports.analyzeCarRC = async (req, res) => {
  try {
    const { id } = req.params;
    const car    = await prisma.car.findUnique({ where: { id: parseInt(id) } });

    if (!car)          return res.status(404).json({ success: false, error: "Car not found" });
    if (!car.rcDocument) return res.status(400).json({ success: false, error: "No RC document uploaded" });

    const mockExtractedText = `Vehicle RC Document
Owner: ${car.ownerId}
Make: ${car.brand}
Model: ${car.name}
Registration No: ${car.brand?.toUpperCase().substring(0, 2)}-01-XX-9999
Made Year: ${car.year || "2020"}
Fuel: ${car.fuel}`;

    const analysis = await aiService.extractRCDocument(mockExtractedText);

    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
