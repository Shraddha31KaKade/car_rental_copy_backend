const prisma = require("../config/prisma");

// LIST ALL REPORTS
exports.listReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const skip = (page - 1) * limit;

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        reportedUser: { select: { id: true, name: true, role: true } },
        aiInsight: { select: { severity: true, category: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
    });

    const total = await prisma.report.count({ where: whereClause });

    res.json({
      success: true,
      data: reports,
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

// GET SINGLE REPORT DETAILS
exports.getReportDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const reportId = parseInt(id);
    if (isNaN(reportId)) {
       return res.status(400).json({ success: false, error: "Invalid ID format" });
    }

    const reportDetails = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        reportedUser: { select: { id: true, name: true, role: true } },
        vehicle: { select: { id: true, name: true, image: true } },
        booking: { select: { id: true, startDate: true, endDate: true } },
        aiInsight: true,
      }
    });

    if (!reportDetails) return res.status(404).json({ success: false, error: "Report not found" });

    // Aggregate past reports count against the reported user
    const pastReportsCount = await prisma.report.count({
      where: { reportedUserId: reportDetails.reportedUserId }
    });

    const responseData = {
      reportId: reportDetails.id,
      status: reportDetails.status,
      createdAt: reportDetails.createdAt,
      reporter: reportDetails.reporter,
      reportedAccount: {
        ...reportDetails.reportedUser,
        pastReportsCount
      },
      context: {
        vehicle: reportDetails.vehicle,
        booking: reportDetails.booking
      },
      complaintText: reportDetails.complaintText,
      attachments: reportDetails.attachmentUrls,
      aiInsights: reportDetails.aiInsight,
      adminNotes: reportDetails.adminNotes
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE REPORT ACTION / STATUS
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; 

    const reportId = parseInt(id);

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { 
        status, 
        adminNotes: adminNotes || undefined 
      }
    });

    // If SUSPEND_ACCOUNT was an action, we might have mapped it to a status or handled separately
    // As per schema, status is ReportStatus (PENDING, UNDER_REVIEW, DISMISS, ESCALATE, RESOLVED)
    // We can handle side effects here if we want to "SUSPEND_ACCOUNT".
    // For this demonstration, we assume admin might want to pause the car or take other action.

    res.json({ success: true, message: "Action applied successfully", data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// TRIGGER AI CLASSIFICATION
exports.triggerReportAI = async (req, res) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { aiInsight: true }
    });

    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    if (report.aiInsight) {
       return res.json({ success: true, message: "Already analyzed", data: report.aiInsight });
    }

    const { analyzeReportText } = require("../services/geminiService");
    const aiResult = await analyzeReportText(report.complaintText);

    const insight = await prisma.reportAIInsight.create({
      data: {
        reportId: report.id,
        category: aiResult.category,
        severity: aiResult.severity,
        summary: aiResult.summary,
        suggestedPriority: aiResult.suggestedPriority
      }
    });

    res.json({ success: true, message: "AI Analysis complete", data: insight });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
