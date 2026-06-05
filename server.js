const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'SHINE proxy running', time: new Date().toISOString() });
});

// Main AI proxy endpoint — artifact calls this
app.post('/ai', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  }

  const { system, messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system || '',
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const text = data.content?.[0]?.text || '';
    res.json({ reply: text });

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy fetch failed: ' + err.message });
  }
});

// GHL webhook endpoint — GoHighLevel calls this to trigger an AI response
// and get back text it can send as an SMS
app.post('/ghl-checkin', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set.' });
  }

  // GHL sends contact info + custom fields in the webhook body
  const { checkin_type, form_data, contact_name } = req.body;
  const name = contact_name || 'Mason';
  const type = checkin_type || 'midday';

  const INTROS = {
    morning:   `Good morning ${name}. What jobs are you hitting today and is there any outstanding revenue from yesterday?`,
    midday:    `Midday check-in ${name}. How much have you collected so far, and what jobs are still ahead of you?`,
    afternoon: `Afternoon update ${name}. What's your running revenue total and how many quotes have you sent today?`,
    eod:       `End of day ${name}. Lock in your final numbers — total collected, jobs done, quotes sent, and any expenses.`
  };

  const systemPrompt = `You are the SHINE Revenue Assistant. Mason runs SHINE Services, a solo pressure washing business in the Chicago suburbs. Read the submitted form data and reply in 2-3 sentences: acknowledge the numbers, note anything important, and give one action item. Be direct and human. No bullet points.`;

  const userMsg = form_data
    ? `Check-in type: ${type}\nForm data:\n${JSON.stringify(form_data, null, 2)}`
    : `Check-in type: ${type}\nNo form data submitted yet.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || INTROS[type];

    // Return both the AI reply and the check-in prompt
    // GHL can use {{reply}} in an SMS action
    res.json({
      reply,
      prompt: INTROS[type],
      checkin_type: type,
      contact_name: name
    });

  } catch (err) {
    // Fallback to static prompt if AI fails
    res.json({ reply: INTROS[type], checkin_type: type });
  }
});

app.listen(PORT, () => {
  console.log(`SHINE proxy listening on port ${PORT}`);
});
