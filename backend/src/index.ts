import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000", credentials: true }));
app.use(express.json());

// Placeholder health check. Replaced once presentation/routes exists (backend phase).
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`backend listening on port ${port}`);
});
