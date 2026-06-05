# SHINE Proxy Server

Lightweight proxy that sits between your Claude artifact and the Anthropic API.
Also includes a `/ghl-checkin` endpoint for GoHighLevel webhook integration.

---

## Deploy to Railway (free, 5 minutes)

### Step 1 — Create a GitHub repo

1. Go to https://github.com/new
2. Name it `shine-proxy`
3. Set to **Private**
4. Click **Create repository**
5. Upload these 4 files into the repo:
   - `server.js`
   - `package.json`
   - `railway.json`
   - `.gitignore`

### Step 2 — Deploy on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `shine-proxy` repo
4. Railway auto-detects Node.js and deploys — takes about 60 seconds

### Step 3 — Add your Anthropic API key

1. In Railway, click your project → **Variables** tab
2. Click **New Variable**
3. Name: `ANTHROPIC_API_KEY`
4. Value: your Anthropic API key (from https://console.anthropic.com)
5. Click **Add** — Railway redeploys automatically

### Step 4 — Get your public URL

1. In Railway, click **Settings → Networking → Generate Domain**
2. You'll get a URL like: `https://shine-proxy-production-xxxx.up.railway.app`
3. Copy it — you need it for the artifact and GHL

### Step 5 — Test it

Open your browser and visit:
```
https://your-railway-url.up.railway.app/
```
You should see:
```json
{ "status": "SHINE proxy running", "time": "..." }
```

---

## Endpoints

### POST /ai
Used by the Claude artifact.
```json
{
  "system": "You are...",
  "messages": [{ "role": "user", "content": "..." }]
}
```
Returns:
```json
{ "reply": "AI response text" }
```

### POST /ghl-checkin
Used by GoHighLevel webhook.
```json
{
  "checkin_type": "morning",
  "contact_name": "Mason",
  "form_data": { "jobs_today": "House wash Elm St", "rev_pending": 0 }
}
```
Returns:
```json
{
  "reply": "AI response for SMS",
  "prompt": "Check-in prompt text",
  "checkin_type": "morning",
  "contact_name": "Mason"
}
```

---

## GHL Webhook Setup (after deploy)

In GoHighLevel:
1. Create a workflow with a **Time of Day** trigger (set to 7:30am / 12pm / 4pm / 7pm)
2. Add a **Webhook** action → POST to `https://your-url.up.railway.app/ghl-checkin`
3. Body (JSON):
```json
{
  "checkin_type": "morning",
  "contact_name": "{{contact.first_name}}"
}
```
4. Add an **SMS** action after the webhook using `{{webhookResponse.reply}}` as the message body

That's it — GHL calls your server, your server calls Claude, Claude's reply goes out as an SMS to Mason.
