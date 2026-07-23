// services/AIService.js
//
// Provider-agnostic facade used by documentVerifier.js. Nothing outside
// this file (and the providers/ folder) should know or care which AI
// vendor is actually behind verifyName() — that's the whole point of
// this layer.
//
// Provider selection is driven entirely by env:
//   AI_PROVIDER=gemini   (default)
//   AI_PROVIDER=openai   (once providers/OpenAIProvider.js exists)
//   AI_PROVIDER=anthropic
//   AI_PROVIDER=azure
//
// Adding a new vendor later means: drop a providers/XyzProvider.js that
// exports a verifyName(extractedText, fullName) function, register it in
// PROVIDERS below, and set AI_PROVIDER=xyz. documentVerifier.js never
// changes.
//
// If no provider is configured or the configured provider has no API
// key set, AIService.verifyName() resolves to `null` rather than
// throwing — callers treat `null` as "no AI opinion available, fall
// back to rule-based checks only."

const PROVIDERS = {
  gemini: () => require('../providers/GeminiProvider'),
  // openai: () => require('../providers/OpenAIProvider'),
  // anthropic: () => require('../providers/AnthropicProvider'),
  // azure: () => require('../providers/AzureProvider'),
};

function resolveProvider() {
  const key = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  const loader = PROVIDERS[key];

  if (!loader) {
    console.warn(`AIService: unknown AI_PROVIDER "${key}", AI verification disabled.`);
    return null;
  }

  try {
    return loader();
  } catch (err) {
    console.warn(`AIService: failed to load provider "${key}": ${err.message}`);
    return null;
  }
}

/**
 * Ask the configured AI provider whether `fullName` plausibly appears in
 * `extractedText` (allowing for OCR noise / name-order / spelling
 * variance). Used by documentVerifier.js only as a tie-breaker on a
 * rule-based name mismatch — never on the hot path for every document.
 *
 * @param {string} extractedText
 * @param {string} fullName
 * @returns {Promise<{ nameMatch: boolean, notes?: string } | null>}
 *          null means "no AI opinion" (no provider configured, no API
 *          key, or the call failed) — never throws.
 */
async function verifyName(extractedText, fullName) {
  const provider = resolveProvider();
  if (!provider) return null;

  if (typeof provider.isConfigured === 'function' && !provider.isConfigured()) {
    // e.g. no API key set for the selected provider — silently skip AI,
    // rule-based checks in documentVerifier.js still apply.
    return null;
  }

  try {
    return await provider.verifyName(extractedText, fullName);
  } catch (err) {
    console.error(`AIService: provider "${process.env.AI_PROVIDER || 'gemini'}" verifyName failed:`, err.message);
    return null;
  }
}

/**
 * @returns {boolean} whether the currently selected AI_PROVIDER is
 * loadable AND has its credentials set. Lets callers (or health checks)
 * cheaply ask "is AI verification available right now?" without making
 * a network call.
 */
function isConfigured() {
  const provider = resolveProvider();
  if (!provider) return false;
  return typeof provider.isConfigured === 'function' ? provider.isConfigured() : true;
}

module.exports = { verifyName, isConfigured };
