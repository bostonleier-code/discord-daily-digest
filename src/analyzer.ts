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
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const today = new Date().toISOString().split("T")[0];
  const userPrompt = buildUserPrompt(messages, previousState, today);

  const result = await model.generateContent(userPrompt);
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
