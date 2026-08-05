import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { uploadRouter } from "./routes/upload.js";
import { exportContactsRouter } from "./routes/exportContacts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use("/uploads", express.static(UPLOAD_DIR));

app.use(
  "/api/trpc",
  express.json({ limit: "2mb" }),
  createExpressMiddleware({ router: appRouter, createContext })
);

app.use("/api/upload", uploadRouter);
app.use("/api/admin/contacts/export.csv", exportContactsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Erro inesperado." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
