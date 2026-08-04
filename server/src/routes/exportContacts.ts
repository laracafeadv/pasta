import { Router } from "express";
import { desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { db, schema } from "../db/index.js";

export const exportContactsRouter = Router();

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

exportContactsRouter.get("/", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(schema.contactSubmissions)
    .orderBy(desc(schema.contactSubmissions.createdAt));

  const header = ["Nome", "E-mail", "Telefone", "Mensagem", "Lido", "Data"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.email,
        row.phone,
        row.message,
        row.read ? "Sim" : "Não",
        row.createdAt.toISOString(),
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    );
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="contatos.csv"');
  res.send("﻿" + lines.join("\n"));
});
