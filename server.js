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

const app = express();

app.use(cors()); // ✅ allow all origins
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/bookings", bookingRoutes);

app.get("/", (req, res) => {
  res.send("Car Rental API running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});