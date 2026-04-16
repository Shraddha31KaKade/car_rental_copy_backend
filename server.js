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

const app = express();

app.use(cors()); // ✅ allow all origins
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/admin", adminRoutes);

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