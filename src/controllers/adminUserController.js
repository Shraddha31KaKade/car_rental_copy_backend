const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
      }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listInquiries = async (req, res) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
