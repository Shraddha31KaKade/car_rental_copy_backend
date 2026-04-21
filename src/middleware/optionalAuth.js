const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: { id: true, name: true, email: true, role: true }
    });

    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Silently fail and treat as guest
    console.log("Optional Auth: Invalid token, proceeding as guest");
  }
  next();
};
