// -----------------------------------------------------------------------------
// EMBEDDING PROVIDER (Phase 6)
//
// This is the one file that should need to change if the embedding model
// or hosting approach changes later (SigLIP today, DINOv2 or a newer model
// tomorrow; a hosted API today, a self-hosted service tomorrow). Everything
// else in the app — matching.js, the UI — only calls embedImage() and
// never needs to know which model or provider produced the vector.
//
// IMPORTANT: as of writing, this project's catalog has no real fabric
// photos, only hex swatch colors (see README). This provider is real,
// working code, but has nothing meaningful to embed until product photos
// actually exist. Don't be surprised if early results look identical to
// (or worse than) plain color matching — that's the photo gap, not a bug
// in this pipeline.
//
// HOSTING: this implementation calls a hosted inference API (Replicate's
// SigLIP endpoint) because no specific hosting decision had been made yet
// when this was built — a hosted API needs zero infrastructure to try.
// Self-hosting (e.g. a small FastAPI + transformers service you deploy
// yourself) is usually cheaper at real volume and avoids a third-party
// dependency; swap it in by writing a new function with the same
// signature as embedImage() below and changing the export.
//
// MODEL IDENTIFICATION: every embedding is tagged with a `model` string
// (see fabric_embeddings.model in schema_v4_phase6.sql) so that switching
// models later doesn't silently mix incompatible vectors — old and new
// embeddings coexist until the catalog is re-embedded.
// -----------------------------------------------------------------------------

export const EMBEDDING_MODEL_ID = 'siglip-base-patch16-224'

// Replicate's hosted SigLIP endpoint. Requires a Replicate API token —
// see README for where this needs to be configured (a server-side
// environment variable, NOT exposed to the browser, since it's a paid
// per-call credential). This function is written to be called from a
// server context (e.g. a Supabase Edge Function), not directly from the
// PWA — see matching.js and README for why embedding must happen
// server-side, not in the browser.
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions'
// Model version hash would go here once a Replicate account/token exists
// to look one up — left as a placeholder rather than guessed, since a
// wrong hash fails loudly and a right-looking-but-wrong one fails
// silently with bad embeddings.
const REPLICATE_SIGLIP_VERSION = 'REPLACE_WITH_ACTUAL_REPLICATE_MODEL_VERSION'

/**
 * Generates a SigLIP embedding for an image.
 * @param {string} imageUrl - A publicly reachable URL for the image (Replicate fetches it server-side).
 * @param {string} apiToken - Replicate API token, read from a server-side env var.
 * @returns {Promise<number[]>} The embedding vector.
 */
export async function embedImage(imageUrl, apiToken) {
  if (!apiToken) {
    throw new Error(
      'No embedding API token configured. Phase 6 needs a real Replicate (or equivalent) API token — see README for setup. Until then, matching falls back to Delta-E color matching only.'
    )
  }
  if (REPLICATE_SIGLIP_VERSION.startsWith('REPLACE_WITH')) {
    throw new Error(
      'No SigLIP model version configured yet. See README — this needs a real Replicate model version hash before embeddings can be generated.'
    )
  }

  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: REPLICATE_SIGLIP_VERSION,
      input: { image: imageUrl },
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status} ${await response.text()}`)
  }

  const prediction = await response.json()
  // Replicate predictions are async — poll until the prediction completes.
  // A production version of this should use webhooks instead of polling;
  // polling is simpler to reason about for a first working version at
  // this shop's low request volume.
  return pollForEmbedding(prediction.urls.get, apiToken)
}

async function pollForEmbedding(pollUrl, apiToken, attempt = 0) {
  if (attempt > 30) throw new Error('Embedding request timed out after 30 polls.')
  const response = await fetch(pollUrl, { headers: { Authorization: `Token ${apiToken}` } })
  const result = await response.json()
  if (result.status === 'succeeded') return result.output
  if (result.status === 'failed' || result.status === 'canceled') {
    throw new Error(`Embedding generation ${result.status}: ${result.error || 'unknown error'}`)
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return pollForEmbedding(pollUrl, apiToken, attempt + 1)
}
