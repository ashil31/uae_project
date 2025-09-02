// In your multer configuration file (e.g., upload.js)
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  const allowedVideoTypes = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 
    'video/webm', 'video/mkv', 'video/m4v', 'video/3gp', 'video/quicktime'
  ];
  
  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

// Use .any() to accept any files regardless of field names
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // limits: {
  //   fileSize: 10 * 1024 * 1024 // 10MB
  // }
});

// Middleware to handle product uploads
// export const handleProductUpload = upload.any();

export default upload;