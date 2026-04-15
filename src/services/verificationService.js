// src/services/verificationService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const geminiService = require("./geminiService");

/**
 * Trigger AI extraction for an existing verification request.
 */
const extractDocumentInfo = async (requestId) => {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) throw new Error("Verification request not found");

  // Call Gemini to extract JSON
  const aiAnalysis = await geminiService.extractDocumentInfo(
    request.documentUrl,
    request.documentType
  );

  // Update request with AI data
  return await prisma.verificationRequest.update({
    where: { id: requestId },
    data: { aiAnalysis }
  });
};

/**
 * Handle admin decision on a verification request.
 */
const processAdminDecision = async (requestId, adminId, status, adminNotes) => {
  const updatedRequest = await prisma.verificationRequest.update({
    where: { id: parseInt(requestId) },
    data: {
      status,
      adminNotes,
      reviewedBy: adminId,
      reviewedAt: new Date()
    }
  });

  // Example Downstream logic
  // If RC is approved, we could toggle `isVerified` on Car
  if (status === "APPROVED" && updatedRequest.vehicleId) {
    await prisma.car.update({
      where: { id: updatedRequest.vehicleId },
      data: {
        // Assume you have a similar field or logic for car verification
      }
    });
  } else if (status === "APPROVED" && !updatedRequest.vehicleId) {
    // If it's Owner ID
    await prisma.user.update({
      where: { id: updatedRequest.ownerId },
      data: { isVerified: true }
    });
  }

  return updatedRequest;
};

module.exports = {
  extractDocumentInfo,
  processAdminDecision
};
