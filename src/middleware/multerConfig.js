const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

let storage;

if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== "demo") {
  // Use Cloudinary if keys are provided
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let folderName = "car-rental/general";
      if (file.fieldname === "rcDocument") folderName = "car-rental/docs";
      if (file.fieldname === "images" || file.fieldname === "image") folderName = "car-rental/cars";
      
      return {
        folder: folderName,
        resource_type: "auto"
      };
    },
  });
} else {
  // Fallback to local storage if no Cloudinary keys
  const fs = require('fs');
  const path = require('path');
  
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = upload;
