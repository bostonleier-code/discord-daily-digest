import { GoogleGenerativeAI } from "@google/generative-ai";
import { NormalizedMessage, DigestState, ClaudeDigestOutput } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export async function analyzeMessages(
  apiKey: string,
  messages: NormalizedMessage[],
  previousState: DigestState
): Promise<ClaudeDigestOutput> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const today = new Date().toISOString().split("T")[0];
  const userPrompt = buildUserPrompt(messages, previousState, today);

  const TIMEOUT_MS = 60_000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Gemini API timed out after 60s")), TIMEOUT_MS)
  );

  const result = await Promise.race([
    model.generateContent(userPrompt),
    timeoutPromise,
  ]);
  const raw = result.response.text();

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
      throw new Error(
        `Gemini did not return valid JSON. Raw output:\n${raw.slice(0, 500)}`
      );
    }
    try {
      parsed = JSON.parse(match[0]) as ClaudeDigestOutput;
    } catch {
      throw new Error(
        `Could not parse JSON even after extraction. Raw:\n${raw.slice(0, 500)}`
      );
    }
  }

  const required: (keyof ClaudeDigestOutput)[] = [
    "discordDigest",
    "openLoops",
    "topPriorities",
  ];
  for (const field of required) {
    if (!(field in parsed)) {
      throw new Error(`Output missing required field: ${field}`);
    }
  }

  return parsed;
}
