import { NormalizedMessage } from "./types";

const DISCORD_API = "https://discord.com/api/v10";

async function discordGet(
  path: string,
  token: string,
  params?: Record<string, string>
): Promise<unknown> {
  const url = new URL(`${DISCORD_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${token}` },
    });

    if (res.status === 429) {
      const json = await res.json() as { retry_after?: number };
      const wait = Math.ceil((json.retry_after ?? 1) * 1000) + 200;
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Discord GET ${path} returned ${res.status}: ${text}`);
    }
    return res.json();
  }
  throw new Error(`Discord GET ${path} failed after 3 attempts (rate limited)`);
}

async function discordPost(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord POST ${path} returned ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getChannelName(
  channelId: string,
  token: string
): Promise<string> {
  try {
    const channel = (await discordGet(`/channels/${channelId}`, token)) as {
      name?: string;
    };
    return channel.name ?? channelId;
  } catch {
    return channelId;
  }
}

export async function fetchMessagesFromChannel(
  channelId: string,
  token: string,
  lookbackHours: number
): Promise<NormalizedMessage[]> {
  const channelName = await getChannelName(channelId, token);
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const messages: NormalizedMessage[] = [];
  let before: string | undefined;

  const maxPages = lookbackHours > 168 ? 20 : 5; // deep scan: 2000 msgs, daily: 500
  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string> = { limit: "100" };
    if (before) params.before = before;

    const batch = (await discordGet(
      `/channels/${channelId}/messages`,
      token,
      params
    )) as Array<{
      id: string;
      author: { id: string; username: string; global_name?: string };
      content: string;
      timestamp: string;
    }>;

    if (!batch.length) break;

    let hitCutoff = false;
    for (const msg of batch) {
      const ts = new Date(msg.timestamp);
      if (ts < cutoff) {
        hitCutoff = true;
        break;
      }
      // Skip empty messages
      if (!msg.content.trim()) continue;
      // Avoid feedback loop — skip previous digest posts
      if (msg.content.includes("**DAILY BUSINESS PRIORITIES**")) continue;

      messages.push({
        channelId,
        channelName,
        messageId: msg.id,
        authorId: msg.author.id,
        authorDisplayName: msg.author.global_name ?? msg.author.username,
        timestamp: msg.timestamp,
        content: msg.content,
      });
    }

    if (hitCutoff || batch.length < 100) break;
    before = batch[batch.length - 1].id;
  }

  return messages;
}

export async function postMessage(
  channelId: string,
  token: string,
  content: string
): Promise<string> {
  const chunks = splitMessage(content, 2000);
  let lastId = "";
  for (const chunk of chunks) {
    const posted = (await discordPost(
      `/channels/${channelId}/messages`,
      token,
      { content: chunk }
    )) as { id: string };
    lastId = posted.id;
  }
  return lastId;
}

function splitMessage(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf("\n", limit);
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  return chunks;
}
