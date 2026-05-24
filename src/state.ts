import fs from "fs";
import path from "path";
import { DigestState } from "./types";

// Store state next to the script so it persists on the Pi across reboots
const STATE_PATH = path.join(
  process.env.STATE_DIR ?? process.cwd(),
  ".digest-state.json"
);

const EMPTY_STATE: DigestState = {
  openLoops: [],
  recentDigestIds: [],
};

export async function loadState(_mode: string): Promise<DigestState> {
  try {
    if (!fs.existsSync(STATE_PATH)) return { ...EMPTY_STATE };
    const raw = fs.readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(raw) as DigestState;
  } catch {
    console.warn("[state] Could not read state file, using empty state");
    return { ...EMPTY_STATE };
  }
}

export async function saveState(_mode: string, state: DigestState): Promise<void> {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}
