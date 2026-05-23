# Discord Daily Digest Agent

Reads configured Discord channels once per day, analyzes recent conversations with Claude, and posts a structured business intelligence digest back to a designated channel. Runs on Vercel Cron (primary) or GitHub Actions (fallback).

---

## How it works

1. Vercel Cron hits `/api/cron` at 14:00 UTC daily.
2. The bot fetches messages from your source channels (last 48h by default).
3. Claude analyzes them against the previous day's open loops and state.
4. A formatted digest is posted to your digest channel.
5. State (open loops, statuses) is persisted so the agent remembers context across days.

---

## Step 1: Create a Discord Bot

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it (e.g. `Daily Digest`)
3. Go to **Bot** in the left sidebar
4. Click **Reset Token** and copy the token — this is your `DISCORD_BOT_TOKEN`
5. Under **Privileged Gateway Intents**, enable **Message Content Intent**
   - This is required to read full message content via REST
6. Go to **OAuth2 → URL Generator**
   - Scopes: `bot`
   - Bot Permissions: `View Channels`, `Read Message History`, `Send Messages`
7. Copy the generated URL and open it in a browser to invite the bot to your server

---

## Step 2: Get Channel IDs

1. In Discord, go to **User Settings → Advanced → Enable Developer Mode**
2. Right-click any channel → **Copy Channel ID**
3. Do this for:
   - All **source channels** you want the bot to read (comma-separated list)
   - The **digest channel** where the bot will post

---

## Step 3: Get Your Server (Guild) ID

Right-click your server icon → **Copy Server ID**

---

## Step 4: Local Setup

```bash
# Clone and install
git clone <your-repo>
cd discord-agent
npm install

# Create env file from example
cp .env.example .env.local
```

Edit `.env.local` and fill in all values:

```
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DISCORD_SOURCE_CHANNEL_IDS=channel_id_1,channel_id_2
DISCORD_DIGEST_CHANNEL_ID=digest_channel_id
ANTHROPIC_API_KEY=sk-ant-...
CRON_SECRET=any_random_string_you_generate
LOOKBACK_HOURS=48
STATE_STORAGE_MODE=json
```

Generate a secure `CRON_SECRET`:
```bash
openssl rand -hex 32
```

---

## Step 5: Test Locally

```bash
npm run daily:digest
```

This runs the full pipeline: fetch → analyze → post. Check your Discord channel for the digest.

To build/type-check without running:
```bash
npm run build
```

---

## Step 6: Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel deploy --prod
```

### Option B: GitHub Integration

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Framework: **Other** (or leave blank)
4. Click **Deploy**

---

## Step 7: Add Environment Variables in Vercel

1. In your Vercel project → **Settings → Environment Variables**
2. Add every variable from `.env.example`:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
   - `DISCORD_SOURCE_CHANNEL_IDS`
   - `DISCORD_DIGEST_CHANNEL_ID`
   - `ANTHROPIC_API_KEY`
   - `CRON_SECRET`
   - `LOOKBACK_HOURS` (optional, default 48)
   - `STATE_STORAGE_MODE` (set to `json` for simple, or `upstash` for persistent)
3. **Redeploy** after adding variables (Settings → Deployments → Redeploy)

---

## Step 8: Verify Cron is Registered

1. In your Vercel project → **Cron Jobs** tab
2. You should see `/api/cron` scheduled at `0 14 * * *` (2:00 PM UTC = 8 AM EST / 7 AM CST)
3. Cron jobs only run on **Production** deployments on **Hobby** plan (once/day max)

---

## Step 9: Manually Trigger the Digest

```bash
curl -X POST https://your-vercel-app.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or with query param:
```bash
curl "https://your-vercel-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET"
```

---

## Step 10: Check Cron Logs

In Vercel dashboard → **Logs** tab → filter by `/api/cron`

You'll see entries like:
```
[digest] Fetching messages from 3 channel(s), lookback 48h
[digest] Channel 123456: 47 messages
[digest] Sending 47 messages to Claude...
[digest] Digest posted to Discord. Message ID: 9876543
```

---

## GitHub Actions Fallback

If Vercel cron fails or you want redundancy, the `.github/workflows/daily-digest.yml` workflow runs at 14:05 UTC and calls your Vercel endpoint.

### Setup

1. In your GitHub repo → **Settings → Secrets and Variables → Actions**
2. Add:
   - `VERCEL_APP_URL` = `https://your-app.vercel.app`
   - `CRON_SECRET` = same secret as Vercel

3. To trigger manually: **Actions tab → Daily Digest (Fallback) → Run workflow**

Alternatively, uncomment the `run-digest-directly` job in the workflow to run without calling Vercel — just add all env vars as GitHub secrets.

---

## State Storage

| Mode | Use case | Setup |
|---|---|---|
| `json` | Local dev, small deployments | No setup, writes `.digest-state.json` locally |
| `upstash` | Vercel + persistent state | Create free [Upstash](https://upstash.com) Redis DB, add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| `vercel-kv` | Vercel + native KV | Enable Vercel KV in your project, add `KV_REST_API_URL` + `KV_REST_API_TOKEN` |

**Recommendation for production:** Use `upstash` — free tier is more than enough, no vendor lock-in, works from GitHub Actions too.

---

## Customizing the Digest

- **Change channels:** Update `DISCORD_SOURCE_CHANNEL_IDS`
- **Change time:** Edit `vercel.json` → `"schedule": "0 14 * * *"` (UTC cron syntax)
- **Change lookback window:** Set `LOOKBACK_HOURS=72` for 3 days
- **Change Claude's analysis behavior:** Edit `src/prompt.ts` → `SYSTEM_PROMPT`
- **Change output format:** Edit the `DISCORD DIGEST FORMAT` section in `src/prompt.ts`

---

## Project Structure

```
discord-agent/
├── api/
│   └── cron.ts              # Vercel serverless endpoint
├── src/
│   ├── config.ts            # Env var loading and validation
│   ├── discord.ts           # Discord REST API client
│   ├── analyzer.ts          # Claude API integration
│   ├── state.ts             # State persistence adapters
│   ├── prompt.ts            # System prompt and user prompt builder
│   ├── runDailyDigest.ts    # Main orchestration logic
│   └── types.ts             # TypeScript types
├── .github/workflows/
│   └── daily-digest.yml     # GitHub Actions fallback
├── .env.example
├── package.json
├── tsconfig.json
└── vercel.json
```

---

## Discord Bot Permissions Summary

| Permission | Why |
|---|---|
| View Channel | See channels in the server |
| Read Message History | Fetch past messages |
| Send Messages | Post the digest |
| Message Content Intent | Read full message text (enable in Developer Portal) |

---

## Troubleshooting

**Bot can't read messages:** Make sure Message Content Intent is enabled in the Discord Developer Portal under your app's Bot settings.

**`Missing required environment variable`:** Check that all env vars are set in Vercel and that you redeployed after adding them.

**Claude returns invalid JSON:** This is logged and the run aborts cleanly — check Vercel logs. Usually means messages were too long; reduce `LOOKBACK_HOURS`.

**Cron not running:** Vercel Hobby only supports 1 cron job and it must be a Production deployment. Check the Cron Jobs tab in your project.

**State not persisting between runs on Vercel:** The `json` mode writes a local file which is ephemeral on Vercel. Switch to `upstash` or `vercel-kv` for persistent state.
