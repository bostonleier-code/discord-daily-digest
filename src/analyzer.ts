import Anthropic from "@anthropic-ai/sdk";
import { NormalizedMessage, DigestState, ClaudeDigestOutput } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export async function analyzeMessages(
  apiKey: string,
  messages: NormalizedMessage[],
  previousState: DigestState
): Promise<ClaudeDigestOutput> {
  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().split("T")[0];
  const userPrompt = buildUserPrompt(messages, previousState, today);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return parseClaudeOutput(raw);
}

function parseClaudeOutput(raw: string): ClaudeDigestOutput {
  // Strip markdown code fences if Claude wrapped the JSON
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: ClaudeDigestOutput;
  try {
    parsed = JSON.parse(cleaned) as ClaudeDigestOutput;
  } catch (err) {
    // Try to extract JSON object from the string in case there's surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(
        `Claude did not return valid JSON. Raw output:\n${raw.slice(0, 500)}`
      );
    }
    try {
      parsed = JSON.parse(match[0]) as ClaudeDigestOutput;
    } catch {
      throw new Error(
        `Could not parse Claude JSON even after extraction. Raw:\n${raw.slice(0, 500)}`
      );
    }
  }

  // Validate required fields exist
  const required: (keyof ClaudeDigestOutput)[] = [
    "discordDigest",
    "openLoops",
    "topPriorities",
  ];
  for (const field of required) {
    if (!(field in parsed)) {
      throw new Error(`Claude output missing required field: ${field}`);
    }
  }

  return parsed;
}
