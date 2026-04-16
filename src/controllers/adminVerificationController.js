const prisma = require("../config/prisma");

// LIST ALL VERIFICATIONS
exports.listVerifications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const skip = (page - 1) * limit;

    const verifications = await prisma.verificationRequest.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, name: true, role: true } },
        vehicle: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    const total = await prisma.verificationRequest.count({ where: whereClause });

    res.json({
      success: true,
      data: verifications,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET SINGLE VERIFICATION DETAILS
exports.getVerificationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const reqId = parseInt(id);

    const verification = await prisma.verificationRequest.findUnique({
      where: { id: reqId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        vehicle: true,
        adminUser: { select: { id: true, name: true } }
      }
    });

    if (!verification) return res.status(404).json({ success: false, error: "Verification not found" });

    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ADMIN APPROVE / REJECT / REUPLOAD
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; 

    const reqId = parseInt(id);

    const verification = await prisma.verificationRequest.update({
      where: { id: reqId },
      data: { 
        status, 
        adminNotes: adminNotes || undefined,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    res.json({ success: true, message: `Verification marked as ${status}`, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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
