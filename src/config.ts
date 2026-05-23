function require_env(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional_env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadConfig() {
  return {
    discordBotToken: require_env("DISCORD_BOT_TOKEN"),
    discordGuildId: require_env("DISCORD_GUILD_ID"),
    discordSourceChannelIds: require_env("DISCORD_SOURCE_CHANNEL_IDS")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    discordDigestChannelId: require_env("DISCORD_DIGEST_CHANNEL_ID"),
    anthropicApiKey: require_env("ANTHROPIC_API_KEY"),
    cronSecret: require_env("CRON_SECRET"),
    lookbackHours: parseInt(optional_env("LOOKBACK_HOURS", "48"), 10),
    storageMode: optional_env("STATE_STORAGE_MODE", "json") as
      | "json"
      | "upstash"
      | "vercel-kv",
  };
}

export type Config = ReturnType<typeof loadConfig>;
