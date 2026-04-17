const prisma           = require("../config/prisma");
const { sendTemplate } = require("../services/emailService");

// ────────────────────────────────────────────────────────────────────────────
// LIST ALL VERIFICATIONS
exports.listVerifications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause = status ? { status } : {};
    const skip        = (page - 1) * limit;

    const verifications = await prisma.verificationRequest.findMany({
      where:   whereClause,
      include: {
        owner:   { select: { id: true, name: true, role: true } },
        vehicle: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    parseInt(skip),
      take:    parseInt(limit),
    });

    const total = await prisma.verificationRequest.count({ where: whereClause });

    res.json({
      success: true,
      data:    verifications,
      meta:    { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET SINGLE VERIFICATION DETAILS
exports.getVerificationDetails = async (req, res) => {
  try {
    const { id }   = req.params;
    const reqId    = parseInt(id);

    const verification = await prisma.verificationRequest.findUnique({
      where:   { id: reqId },
      include: {
        owner:     { select: { id: true, name: true, email: true } },
        vehicle:   true,
        adminUser: { select: { id: true, name: true } },
      },
    });

    if (!verification) return res.status(404).json({ success: false, error: "Verification not found" });

    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// ADMIN APPROVE / REJECT / REUPLOAD_REQUESTED
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { id }               = req.params;
    const { status, adminNotes } = req.body;
    const reqId                = parseInt(id);

    // Fetch BEFORE update → owner email + idempotency check
    const existing = await prisma.verificationRequest.findUnique({
      where:   { id: reqId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!existing) return res.status(404).json({ success: false, error: "Verification not found" });

    // ── IDEMPOTENCY: skip if status unchanged ─────────────────────────────────
    if (existing.status === status) {
      return res.json({ success: true, message: "Status already set", data: existing });
    }

    const verification = await prisma.verificationRequest.update({
      where: { id: reqId },
      data: {
        status,
        adminNotes: adminNotes || undefined,
      reviewedBy: req.user.id,  // already Int from DB lookup
        reviewedAt: new Date(),
      },
    });

    // ── EMAIL → owner on APPROVED / REJECTED / REUPLOAD_REQUESTED ─────────────
    const ownerEmail = existing.owner?.email;
    const ownerName  = existing.owner?.name || "Owner";
    const loginUrl   = `${process.env.APP_URL}/login`;

    if (ownerEmail) {
      if (status === "APPROVED") {
        sendTemplate({
          to:       ownerEmail,
          subject:  "Your verification has been approved ✅",
          template: "verification-approved",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">✅ Verification Approved</h2>
              <p>Hi <b>${ownerName}</b>,</p>
              <p>Great news — your verification request has been <b>approved</b> by our admin team.</p>
              <p>You can now list and manage your vehicles on the CarRental platform.</p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      } else if (status === "REJECTED") {
        sendTemplate({
          to:       ownerEmail,
          subject:  "Your verification was not approved",
          template: "verification-rejected",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">❌ Verification Not Approved</h2>
              <p>Hi <b>${ownerName}</b>,</p>
              <p>Unfortunately, your verification request was <b>rejected</b> after review.</p>
              ${adminNotes ? `<p><b>Reason:</b> ${adminNotes}</p>` : ""}
              <p>Please contact our support team for further assistance.</p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      } else if (status === "REUPLOAD_REQUIRED") {
        sendTemplate({
          to:       ownerEmail,
          subject:  "Action required: Please re-upload your verification documents",
          template: "verification-reupload",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#1a1a2e">📤 Document Re-upload Required</h2>
              <p>Hi <b>${ownerName}</b>,</p>
              <p>The admin has reviewed your verification documents and requires you to <b>re-upload</b> them.</p>
              ${adminNotes ? `<p><b>Changes required:</b> ${adminNotes}</p>` : ""}
              <p>
                Please
                <a href="${loginUrl}" style="color:#4f46e5;font-weight:bold">log in here</a>
                and navigate to <b>Dashboard → Verification</b> to view the required changes and re-upload your documents.
              </p>
              <p style="color:#888;font-size:13px;margin-top:24px">— CarRental Team</p>
            </div>
          `,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({ success: true, message: `Verification marked as ${status}`, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// TRIGGER GEMINI ANALYSIS MANUALLY
exports.triggerVerificationAI = async (req, res) => {
  try {
    const { id } = req.params;
    // placeholder for gemini logic
    res.json({ success: true, message: "Gemini Analysis triggered (mocked)" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
