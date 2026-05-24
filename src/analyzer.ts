import { NormalizedMessage, DigestState, ClaudeDigestOutput } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export async function analyzeMessages(
  apiKey: string,
  messages: NormalizedMessage[],
  previousState: DigestState
): Promise<ClaudeDigestOutput> {
  const today = new Date().toISOString().split("T")[0];
  const userPrompt = buildUserPrompt(messages, previousState, today);

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  const json = await res.json() as any;

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`);
  }

  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseOutput(raw);
}

function parseOutput(raw: string): ClaudeDigestOutput {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: ClaudeDigestOutput;
  try {
    parsed = JSON.parse(cleaned) as ClaudeDigestOutput;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Gemini did not return valid JSON. Raw output:\n${raw.slice(0, 500)}`);
    }
    try {
      parsed = JSON.parse(match[0]) as ClaudeDigestOutput;
    } catch {
      throw new Error(`Could not parse JSON even after extraction. Raw:\n${raw.slice(0, 500)}`);
    }
  }

  const required: (keyof ClaudeDigestOutput)[] = ["discordDigest", "openLoops", "topPriorities"];
  for (const field of required) {
    if (!(field in parsed)) {
      throw new Error(`Output missing required field: ${field}`);
    }
  }

  return parsed;
}
