const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "demo",
  api_secret: process.env.CLOUDINARY_API_SECRET || "demo",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = "car-rental/general";
    if (file.fieldname === "rcDocument") folderName = "car-rental/docs";
    if (file.fieldname === "images" || file.fieldname === "image") folderName = "car-rental/cars";
    
    // allow pdf for rc documents
    const allowedFormats = file.fieldname === "rcDocument" ? ["jpg", "png", "jpeg", "pdf"] : ["jpg", "png", "jpeg", "webp"];

    return {
      folder: folderName,
      allowed_formats: allowedFormats,
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
