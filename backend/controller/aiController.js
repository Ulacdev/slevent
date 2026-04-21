import axios from 'axios';
// AI REST API — supports Gemini (AIzaSy) and Groq (gsk_)
const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No AI API key configured.');

  // Detection for Groq keys
  const isGroq = apiKey.startsWith('gsk_');

  if (isGroq) {
    console.log('[AI] Using Groq (Llama 3)...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt + "\nProvide fresh, creative, and unique suggestions that differ from common tropes." }],
        temperature: 0.9,
      }),
    });
    const data = await response.json();
    console.log(`[AI] Groq Response Received (Length: ${JSON.stringify(data).length})`);
    if (!response.ok) {
      console.error('[AI] Groq API Error:', data?.error || data);
      throw new Error(data?.error?.message || `Groq error ${response.status}`);
    }
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  } else {
    // Gemini path — uses the stable 2.5-flash model verified to be available
    const model = 'gemini-2.5-flash';
    console.log(`[AI] Using Gemini (${model})...`);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt + "\nProvide fresh, creative, and unique suggestions." }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
      }),
    });
    const data = await response.json();
    console.log(`[AI] Gemini Response Received (Length: ${JSON.stringify(data).length})`);
    if (!response.ok) {
      console.error('[AI] Gemini API Error:', data?.error || data);
      throw new Error(data?.error?.message || `Gemini error ${response.status}`);
    }
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
};

const handleErrors = (err, res) => {
  console.error('[AI] Global Error Handler Catch:', err?.message || err);
  if (err?.message?.includes('API_KEY') || err?.message?.includes('401') || err?.message?.includes('denied'))
    return res.status(503).json({ error: 'AI Access Denied. Check your API key or switch to Groq (gsk_).' });
  if (err?.message?.includes('quota') || err?.message?.includes('429'))
    return res.status(429).json({ error: 'AI quota exceeded. Please try again later.' });
  return res.status(500).json({ error: 'AI suggestion generation failed. Please try again.' });
};

/**
 * POST /api/ai/event-suggest
 * Generates 3 paired {eventName, description} suggestions.
 */
export const suggestEventContent = async (req, res) => {
  const { category, audience, format, tone, organizerName } = req.body;

  if (!process.env.GEMINI_API_KEY)
    return res.status(503).json({ error: 'AI suggestions are not configured on this server.' });
  if (!category || !audience || !format || !tone)
    return res.status(400).json({ error: 'Missing required fields: category, audience, format, tone.' });

  try {
    const orgLine = organizerName ? `The event is organized by "${organizerName}".` : '';
    const fmtLabel = format === 'ONSITE' ? 'in-person' : format === 'ONLINE' ? 'fully online/virtual' : 'hybrid (both in-person and online)';

    const prompt = `
You are an expert event marketing copywriter for the startup and business ecosystem in the Philippines.

Generate exactly 3 unique, compelling event suggestions for the following context:
- Event Category: ${category}
- Target Audience: ${audience}
- Event Format: ${fmtLabel}
- Tone / Vibe: ${tone}
${orgLine}

For each suggestion, provide:
1. A short, punchy, memorable event name (max 7 words)
2. A compelling event description (2-3 sentences, 60-90 words) that highlights the value proposition, who should attend, and what they will gain.

Respond ONLY with a valid JSON array (no markdown, no code blocks, no extra text):
[
  { "eventName": "Name 1", "description": "Description 1." },
  { "eventName": "Name 2", "description": "Description 2." },
  { "eventName": "Name 3", "description": "Description 3." }
]`;

    const jsonText = await callGemini(prompt);
    let suggestions;
    try { suggestions = JSON.parse(jsonText); } catch {
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }
    if (!Array.isArray(suggestions) || !suggestions.length)
      return res.status(500).json({ error: 'AI returned empty suggestions. Please try again.' });

    const sanitized = suggestions.slice(0, 3)
      .map(s => ({ eventName: String(s.eventName || '').trim(), description: String(s.description || '').trim() }))
      .filter(s => s.eventName && s.description);

    return res.json({ suggestions: sanitized });
  } catch (err) { return handleErrors(err, res); }
};

/**
 * POST /api/ai/field-suggest
 * Generates 3 string suggestions for a specific form field.
 * Body: { field, context, organizerName?, format? }
 * Returns: { suggestions: string[] }
 */
export const suggestFieldContent = async (req, res) => {
  const { field, context, organizerName, format } = req.body;

  if (!process.env.GEMINI_API_KEY)
    return res.status(503).json({ error: 'AI suggestions are not configured on this server.' });
  if (!field || !context?.trim())
    return res.status(400).json({ error: 'Missing required fields: field, context.' });

  const orgLine = organizerName ? `Organized by: ${organizerName}.` : '';
  const fmtLabel = format === 'ONLINE' ? 'online/virtual' : format === 'HYBRID' ? 'hybrid' : 'in-person';

  console.log(`[AI Controller] FIELD-SUGGEST: Field="${field}" Context="${context.substring(0, 50)}..."`);

  const PROMPTS = {
    eventName: `
You are an expert event branding specialist for the Philippine business and startup scene.
Context: "${context}"
${orgLine}
Event format: ${fmtLabel}.

Generate exactly 3 distinct, punchy event title options:
- Max 7 words each
- Style variety: one formal/corporate, one bold/energetic, one creative/memorable
- Relevant to Philippine startup/business context

Respond ONLY with a JSON array of 3 strings (no markdown):
["Title 1", "Title 2", "Title 3"]
`,
    description: `
You are an expert event marketing copywriter for the Philippine startup ecosystem.
Context: "${context}"
${orgLine}
Event format: ${fmtLabel}.

Generate exactly 3 compelling event description paragraphs:
- 60–90 words each
- Cover: value proposition, target audience, key takeaways
- Tone variety: one professional, one inspirational, one casual/engaging

Respond ONLY with a JSON array of 3 strings (no markdown):
["Description 1", "Description 2", "Description 3"]
`,
    location: `
You are helping plan a ${fmtLabel} business event in the Philippines.
Venue context: "${context}"

Suggest exactly 3 realistic Philippine venue name/address options:
- Format: "Venue Name, District/City" (e.g. "One Ayala Tower, Makati CBD")
- Professional, appropriate for business/startup events
- Vary between areas like BGC, Makati, Ortigas based on context

Respond ONLY with a JSON array of 3 strings (no markdown):
["Venue 1", "Venue 2", "Venue 3"]
`,
    streamingPlatform: `
Context for streaming setup: "${context}"

Suggest exactly 3 suitable streaming/video conferencing platform names for a ${fmtLabel} event.
Options: YouTube Live, Facebook Live, Zoom Webinar, Google Meet, StreamYard, Hopin, Microsoft Teams, Airmeet, Whova, Vimeo Live, Restream

Respond ONLY with a JSON array of 3 platform name strings (no markdown):
["Platform 1", "Platform 2", "Platform 3"]
`,
    promoCode: `
Event promo context: "${context}"

Generate exactly 3 creative discount promo codes:
- 5–10 characters, ALL CAPS, letters and numbers only
- Memorable and thematically relevant to the event
- Style examples: "LAUNCH25", "EARLYBIRD", "SUMMIT50"

Respond ONLY with a JSON array of 3 strings (no markdown):
["CODE1", "CODE2", "CODE3"]
`,
  };

  const prompt = PROMPTS[field];
  if (!prompt) return res.status(400).json({ error: `Unsupported field: ${field}` });

  try {
    const jsonText = await callGemini(prompt);
    let suggestions;
    try { suggestions = JSON.parse(jsonText); } catch {
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }
    if (!Array.isArray(suggestions) || !suggestions.length)
      return res.status(500).json({ error: 'AI returned empty suggestions. Please try again.' });

    const sanitized = suggestions.slice(0, 3).map(s => String(s).trim()).filter(Boolean);
    console.log(`[AI Controller] SUCCESS: Generated ${sanitized.length} suggestions for "${field}"`);
    return res.json({ suggestions: sanitized });
  } catch (err) { return handleErrors(err, res); }
};


/**
 * GET /api/ai/proxy-image?prompt=...&seed=...
 * Proxies the Pollinations image request through the backend.
 * Uses the 'turbo' model (~5-10s) instead of 'flux' (30-45s).
 * Includes auto-retry with a fresh seed if the first attempt fails.
 */
export const proxyImage = async (req, res) => {
  const { prompt, seed } = req.query;
  if (!prompt) return res.status(400).send('Prompt is required');

  const seedNum = parseInt(seed, 10) || Math.floor(Math.random() * 1000000);

  // turbo model is 4-6x faster than flux — switches from 45s avg → 5-10s avg
  const buildUrl = (s) =>
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&seed=${s}&model=turbo&nologo=true&enhance=true`;

  const tryFetch = async (s, attempt) => {
    try {
      // Rotate models and optimize parameters on retry
      const model = attempt === 1 ? 'turbo' : 'flux';
      const width = attempt === 1 ? 1024 : 800;
      const height = attempt === 1 ? 576 : 450;
      // Disable 'enhance' on retry to speed up generation and reduce server load
      const enhance = attempt === 1 ? 'true' : 'false';

      const modelLabel = model.toUpperCase();
      console.log(`[AI Proxy] Attempt ${attempt} (${modelLabel}, seed ${s}, ${width}x${height})...`);

      const response = await axios({
        method: 'get',
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${s}&model=${model}&nologo=true&enhance=${enhance}`,
        timeout: 25000,
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'User-Agent': `Mozilla/5.0 StartupLab-AI-Proxy/${modelLabel}`,
        }
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        console.warn(`[AI Proxy] ${modelLabel} failed: Non-image content-type "${contentType}"`);
        return { success: false, error: 'Non-image response' };
      }
      return { success: true, response };
    } catch (err) {
      const errorMsg = err.response ? `Status ${err.response.status}` : err.message;
      console.warn(`[AI Proxy] Attempt ${attempt} error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  };

  console.log(`[AI Proxy] Generating with turbo: "${prompt.substring(0, 40)}..." seed=${seedNum}`);

  try {
    // Attempt 1
    let result = await tryFetch(seedNum, 1);

    // Attempt 2 (Retry)
    if (!result.success) {
      const retrySeed = Math.floor(Math.random() * 1000000);
      console.log(`[AI Proxy] Retrying with fresh seed: ${retrySeed}`);
      result = await tryFetch(retrySeed, 2);
    }

    if (!result.success) {
      console.error(`[AI Proxy] Both attempts failed. Final error: ${result.error}`);
      const status = result.error.includes('timeout') ? 504 : 502;
      return res.status(status).json({ error: `AI generation failed: ${result.error}. Try again.` });
    }

    const { response } = result;
    const contentType = response.headers['content-type'] || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    console.log(`[AI Proxy] SUCCESS: ${response.data.byteLength} bytes delivered.`);
    return res.send(Buffer.from(response.data));

  } catch (err) {
    console.error('[AI Proxy] FATAL ERROR:', err.message);
    return res.status(500).json({ error: 'Internal proxy error.' });
  }
};
