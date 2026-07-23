// providers/GeminiProvider.js
//
// Concrete AI provider backing AIService.verifyName() when
// AI_PROVIDER=gemini (the default — free developer tier). Talks to the
// Gemini API directly over fetch, no SDK dependency, so adding this
// provider never pulls in @anthropic-ai/sdk or any other vendor package.
//
// Env:
//   GEMINI_API_KEY=...
//   GEMINI_MODEL=gemini-1.5-flash   (optional, defaults below)
//
// Contract expected by services/AIService.js:
//   isConfigured(): boolean
//   verifyName(extractedText, fullName): Promise<{ nameMatch: boolean, notes?: string }>

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Asks Gemini whether `fullName` plausibly appears in `extractedText`,
 * tolerating OCR noise, script mixing (English/Hindi), and minor
 * spelling variance. Only called by documentVerifier.js as a fallback
 * when PaddleOCR's own extraction wasn't confident enough — see
 * documentVerifier.js's confidence-gating logic.
 *
 * @param {string} extractedText
 * @param {string} fullName
 * @returns {Promise<{ nameMatch: boolean, notes?: string }>}
 * @throws on network/parse failure — AIService.verifyName() catches this
 *         and converts it to a `null` result, so callers never need
 *         their own try/catch here.
 */
async function verifyName(extractedText, fullName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const prompt =
    `Document OCR text (may contain noise/typos, and may mix English and Hindi):\n` +
    `"""${extractedText.slice(0, 2500)}"""\n\n` +
    `Student's full name as entered on the form: "${fullName}"\n\n` +
    `Does this name plausibly appear on the document, allowing for OCR noise, ` +
    `name-order differences, transliteration between English and Hindi, and minor ` +
    `spelling variation? Respond with ONLY raw JSON, no markdown fences, no prose: ` +
    `{"nameMatch": true or false, "notes": "short reason"}`;

  const resp = await fetch(`${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API responded ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const raw =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}';

  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    nameMatch: Boolean(parsed.nameMatch),
    notes: parsed.notes || undefined,
  };
}

module.exports = { isConfigured, verifyName };
