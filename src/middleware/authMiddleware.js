const jwt     = require("jsonwebtoken");
const prisma  = require("../config/prisma");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch live user from DB so we always have up-to-date role
    // (JWT only contains { id } — role is not embedded in token)
    const user = await prisma.user.findUnique({
      where:  { id: Number(decoded.id) },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // { id: Int, name, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};