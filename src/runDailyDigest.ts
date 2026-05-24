import { loadConfig } from "./config";
import { fetchMessagesFromChannel, postMessage } from "./discord";
import { analyzeMessages } from "./analyzer";
import { loadState, saveState } from "./state";
import { NormalizedMessage, DigestState } from "./types";

export async function runDailyDigest(): Promise<{ success: boolean; message: string }> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    const msg = `[digest] Config error: ${(err as Error).message}`;
    console.error(msg);
    return { success: false, message: msg };
  }

  console.log(
    `[digest] Fetching messages from ${config.discordSourceChannelIds.length} channel(s), lookback ${config.lookbackHours}h`
  );

  const allMessages: NormalizedMessage[] = [];
  for (const channelId of config.discordSourceChannelIds) {
    try {
      const msgs = await fetchMessagesFromChannel(
        channelId,
        config.discordBotToken,
        config.lookbackHours
      );
      console.log(`[digest] Channel ${channelId}: ${msgs.length} messages`);
      allMessages.push(...msgs);
    } catch (err) {
      console.error(`[digest] Failed to fetch channel ${channelId}:`, (err as Error).message);
    }
  }

  if (allMessages.length === 0) {
    console.log("[digest] No messages in lookback window. Skipping.");
    return { success: true, message: "No messages to process." };
  }

  allMessages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let previousState: DigestState;
  try {
    previousState = await loadState("json");
    console.log(`[digest] Loaded state: ${previousState.openLoops.length} open loops`);
  } catch {
    previousState = { openLoops: [], recentDigestIds: [] };
  }

  console.log(`[digest] Sending ${allMessages.length} messages to Gemini...`);
  let output;
  try {
    output = await analyzeMessages(config.geminiApiKey, allMessages, previousState);
    console.log("[digest] Analysis complete.");
  } catch (err) {
    const msg = `[digest] Analysis failed: ${(err as Error).message}`;
    console.error(msg);
    return { success: false, message: msg };
  }

  const newState: DigestState = {
    openLoops: output.openLoops ?? previousState.openLoops,
    lastRunAt: new Date().toISOString(),
    recentDigestIds: previousState.recentDigestIds ?? [],
  };

  try {
    await saveState("json", newState);
    console.log("[digest] State saved.");
  } catch (err) {
    console.warn("[digest] Could not save state:", (err as Error).message);
  }

  try {
    const postedId = await postMessage(
      config.discordDigestChannelId,
      config.discordBotToken,
      output.discordDigest
    );
    newState.recentDigestIds = [postedId, ...(newState.recentDigestIds ?? [])].slice(0, 10);
    await saveState("json", newState);
    console.log(`[digest] Posted to Discord. Message ID: ${postedId}`);
    return { success: true, message: `Digest posted. Message ID: ${postedId}` };
  } catch (err) {
    const msg = `[digest] Failed to post to Discord: ${(err as Error).message}`;
    console.error(msg);
    return { success: false, message: msg };
  }
}

// Allow running directly: tsx src/runDailyDigest.ts
runDailyDigest().then((result) => {
  console.log(result.message);
  process.exit(result.success ? 0 : 1);
});
