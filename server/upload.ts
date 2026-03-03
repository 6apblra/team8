import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "server", "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images (check both mimetype and extension)
const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

const imageFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  }
};

// Create multer instance for avatar uploads
export const avatarUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max (for animated GIFs)
  },
});

// Get public URL for an uploaded file
export function getUploadUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
