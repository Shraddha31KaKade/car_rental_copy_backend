// src/controllers/verificationController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const verificationService = require("../services/verificationService");

// List all verification requests (with optional status filter)
exports.listRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const requests = await prisma.verificationRequest.findMany({
      where: filter,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, name: true, brand: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("List Requests Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
};

// Get details of a specific request
exports.getRequestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.verificationRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true } },
        adminUser: { select: { id: true, name: true } }
      }
    });

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    
    res.json({ success: true, request });
  } catch (error) {
    console.error("Get Request Details Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch details" });
  }
};

// Trigger AI extraction manually
exports.triggerAIExtraction = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRequest = await verificationService.extractDocumentInfo(parseInt(id));
    res.json({ success: true, message: "AI extraction completed", request: updatedRequest });
  } catch (error) {
    console.error("Trigger AI Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit an admin decision
exports.submitDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user.id; // From auth middleware

    if (!["APPROVED", "REJECTED", "REUPLOAD_REQUIRED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updatedRequest = await verificationService.processAdminDecision(id, adminId, status, adminNotes);
    
    res.json({ success: true, message: "Decision recorded", data: updatedRequest });
  } catch (error) {
    console.error("Submit Decision Error:", error);
    res.status(500).json({ success: false, message: "Failed to submit decision" });
  }
};
