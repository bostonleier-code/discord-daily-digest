import fs from "fs";
import path from "path";
import { DigestState } from "./types";

const STATE_PATH = path.join(process.cwd(), ".digest-state.json");

const EMPTY_STATE: DigestState = {
  openLoops: [],
  recentDigestIds: [],
};

// ── Local JSON adapter ────────────────────────────────────────────────────────

function loadFromFile(): DigestState {
  try {
    if (!fs.existsSync(STATE_PATH)) return { ...EMPTY_STATE };
    const raw = fs.readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(raw) as DigestState;
  } catch {
    console.warn("[state] Could not read state file, using empty state");
    return { ...EMPTY_STATE };
  }
}

function saveToFile(state: DigestState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

// ── Upstash Redis adapter ─────────────────────────────────────────────────────
// Set STATE_STORAGE_MODE=upstash and provide UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

const UPSTASH_KEY = "discord-digest-state";

async function loadFromUpstash(): Promise<DigestState> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  const res = await fetch(`${url}/get/${UPSTASH_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { result: string | null };
  if (!json.result) return { ...EMPTY_STATE };
  return JSON.parse(json.result) as DigestState;
}

async function saveToUpstash(state: DigestState): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  await fetch(`${url}/set/${UPSTASH_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(JSON.stringify(state)),
  });
}

// ── Vercel KV adapter ─────────────────────────────────────────────────────────
// Set STATE_STORAGE_MODE=vercel-kv and provide KV_REST_API_URL + KV_REST_API_TOKEN

const VKV_KEY = "discord-digest-state";

async function loadFromVercelKV(): Promise<DigestState> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  const res = await fetch(`${url}/get/${VKV_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { result: string | null };
  if (!json.result) return { ...EMPTY_STATE };
  return JSON.parse(json.result) as DigestState;
}

async function saveToVercelKV(state: DigestState): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  await fetch(`${url}/set/${VKV_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(JSON.stringify(state)),
  });
}

// ── Public interface ──────────────────────────────────────────────────────────

export async function loadState(mode: string): Promise<DigestState> {
  if (mode === "upstash") return loadFromUpstash();
  if (mode === "vercel-kv") return loadFromVercelKV();
  return loadFromFile();
}

export async function saveState(mode: string, state: DigestState): Promise<void> {
  if (mode === "upstash") return saveToUpstash(state);
  if (mode === "vercel-kv") return saveToVercelKV(state);
  saveToFile(state);
}
