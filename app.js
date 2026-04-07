const express = require("express");
const app = express();

app.use(express.json());

const carRoutes = require("./routes/carRoutes");

app.use("/cars", carRoutes);

module.exports = app;