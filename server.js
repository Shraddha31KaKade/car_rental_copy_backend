// require("dotenv").config();
// const express = require("express");

// const app = express();

// app.use(express.json());
// app.use(cors());


// const authRoutes = require("./src/routes/authRoutes");
// app.use("/api/auth", authRoutes);

// app.listen(5000, () => {
//   console.log("Server running on port 5000");
// });


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./src/routes/authRoutes");
const carRoutes = require("./src/routes/carRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");

const ownerRoutes = require("./src/routes/ownerRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const verificationRoutes = require("./src/routes/verificationRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const contactRoutes = require("./src/routes/contactRoutes");
const marketplaceRoutes = require("./src/routes/marketplaceRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const cron = require("node-cron");
const { settleExpiredBookings, processQueuedPayouts } = require("./src/services/marketplaceService");
const prisma = require("./src/config/prisma");

const app = express();

app.use(cors()); // ✅ allow all origins

// Razorpay Webhook MUST preserve raw body for signature verification
app.use("/api/payments/webhook", require("express").text({ type: "application/json" }), require("./src/controllers/paymentController").razorpayWebhook);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/payments", paymentRoutes);

// Endpoint for frontend to fetch settings (marquee & maintenance)
app.get("/api/settings", async (req, res) => {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 1 } });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for admins to update settings
app.patch("/api/settings", async (req, res) => {
  try {
    const { maintenanceMode, globalAnnouncement } = req.body;
    let settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 1 } });
    }
    const updated = await prisma.systemSettings.update({
      where: { id: 1 },
      data: {
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : settings.maintenanceMode,
        globalAnnouncement: globalAnnouncement !== undefined ? globalAnnouncement : settings.globalAnnouncement,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Nightly Cron Jobs (Running every night at midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("[CRON] Running nightly settlement...");
  await settleExpiredBookings();
  console.log("[CRON] Running nightly payouts...");
  await processQueuedPayouts();
});

app.get("/", (req, res) => {
  res.send("Car Rental API running");
});

// Global error handler to prevent HTML responses
app.use((err, req, res, next) => {
  console.error("Global Error Handler Caught:", err);
  if (err && err.message) {
    return res.status(500).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});