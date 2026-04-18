const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    res.json(user);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        message: "Please register first"
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        message: "Incorrect password"
      });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.json({
      message: "Login successful",
      token,
      refreshToken,
      user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ME
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  try {
    const { token: refToken } = req.body;
    if (!refToken) return res.status(401).json({ message: "Refresh token required" });

    jwt.verify(refToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid refresh token" });

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || user.refreshToken !== refToken) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const accessToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ token: accessToken });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// FORGOT PASSWORD
const { sendTemplate } = require("../services/emailService");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Always return 200 for security (don't reveal if email exists)
    if (!user) {
      return res.status(200).json({ message: "Recovery email dispatched." });
    }

    const resetToken = jwt.sign(
      { id: user.id, type: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await sendTemplate({
      to: user.email,
      subject: "Security Alert: Password Reset Requested",
      template: "password-reset",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#020617;color:#f8fafc;padding:40px;border-radius:24px;">
           <h2 style="color:#6366f1;text-transform:uppercase;letter-spacing:2px;">Security Protocol Initiation</h2>
           <p>Hi <b>${user.name}</b>,</p>
           <p>We received a request to authorize a password reset for your account. If this was you, please use the secure link below:</p>
           <div style="text-align:center;margin:40px 0;">
              <a href="${resetUrl}" style="background:#6366f1;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">Reset My Security Key</a>
           </div>
           <p style="font-size:12px;color:#94a3b8;">This link will expire in 1 hour. If you did not initiate this request, please ignore this email or contact support immediately.</p>
           <hr style="border:0;border-top:1px solid #1e293b;margin:40px 0;" />
           <p style="font-size:10px;text-align:center;color:#475569;text-transform:uppercase;letter-spacing:1px;">CarRental Global Operations • Secure Transmission</p>
        </div>
      `
    });

    res.json({ message: "Recovery email dispatched." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password required" });

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err || decoded.type !== "password-reset") {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { password: hashedPassword }
      });

      res.json({ message: "Security key updated successfully. Deployment complete." });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};