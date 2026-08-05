import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { requireAdmin } from "../middleware/requireAdmin.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      cb(new Error("Formato de imagem não suportado."));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

uploadRouter.post("/", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});
