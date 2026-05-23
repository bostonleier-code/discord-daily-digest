import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDailyDigest } from "../src/runDailyDigest";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(500).json({ error: "CRON_SECRET not configured" });
    return;
  }

  const authHeader = req.headers["authorization"];
  const querySecret = req.query["secret"];

  const provided =
    authHeader?.replace("Bearer ", "") ?? querySecret;

  if (provided !== cronSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Only allow GET or POST
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  console.log("[cron] Daily digest triggered");
  const result = await runDailyDigest();

  if (result.success) {
    res.status(200).json({ ok: true, message: result.message });
  } else {
    res.status(500).json({ ok: false, error: result.message });
  }
}
