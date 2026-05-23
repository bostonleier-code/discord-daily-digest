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

  // 1. Fetch messages from all source channels
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
      console.error(`[digest] Failed to fetch from channel ${channelId}:`, (err as Error).message);
    }
  }

  if (allMessages.length === 0) {
    console.log("[digest] No messages found in lookback window. Skipping.");
    return { success: true, message: "No messages to process." };
  }

  // Sort by timestamp ascending
  allMessages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 2. Load previous state
  let previousState: DigestState;
  try {
    previousState = await loadState(config.storageMode);
    console.log(
      `[digest] Loaded state with ${previousState.openLoops.length} open loops`
    );
  } catch (err) {
    console.warn("[digest] Could not load previous state, using empty:", (err as Error).message);
    previousState = { openLoops: [], recentDigestIds: [] };
  }

  // 3. Analyze with Claude
  console.log(`[digest] Sending ${allMessages.length} messages to Claude...`);
  let output;
  try {
    output = await analyzeMessages(config.anthropicApiKey, allMessages, previousState);
    console.log("[digest] Claude analysis complete.");
  } catch (err) {
    const msg = `[digest] Claude analysis failed: ${(err as Error).message}`;
    console.error(msg);
    return { success: false, message: msg };
  }

  // 4. Save updated state
  const newState: DigestState = {
    openLoops: output.openLoops ?? previousState.openLoops,
    lastRunAt: new Date().toISOString(),
    recentDigestIds: previousState.recentDigestIds ?? [],
  };

  try {
    await saveState(config.storageMode, newState);
    console.log("[digest] State saved.");
  } catch (err) {
    console.warn("[digest] Could not save state:", (err as Error).message);
  }

  // 5. Post to Discord
  try {
    const postedId = await postMessage(
      config.discordDigestChannelId,
      config.discordBotToken,
      output.discordDigest
    );
    newState.recentDigestIds = [
      postedId,
      ...(newState.recentDigestIds ?? []),
    ].slice(0, 10);
    await saveState(config.storageMode, newState);
    console.log(`[digest] Digest posted to Discord. Message ID: ${postedId}`);
    return { success: true, message: `Digest posted. Message ID: ${postedId}` };
  } catch (err) {
    const msg = `[digest] Failed to post to Discord: ${(err as Error).message}`;
    console.error(msg);
    return { success: false, message: msg };
  }
}
