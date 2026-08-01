// -----------------------------------------------------------------------------
// EDGE FUNCTION: match-fabric (Phase 6)
//
// Given a query swatch photo (a customer's or staff's uploaded/captured
// image) and its Delta-E hex color, this:
//   1. Embeds the query photo server-side (same embedding provider as
//      embed-fabric)
//   2. Compares it against every stored fabric_embeddings row via cosine
//      similarity (brute-force, in-memory — see schema_v4_phase6.sql for
//      why this is fine at this shop's scale, no vector index needed)
//   3. Blends that with Delta-E color similarity and basic metadata into
//      one hybrid score, per the original spec's weighting:
//        70% AI visual similarity (SigLIP)
//        20% Delta-E color similarity
//        10% metadata (same fabric_type as a hint)
//   4. Returns the top 5-10 candidates for the PWA to display
//
// FALLBACK: if a fabric has no stored embedding yet (which — as of this
// writing — is every fabric, since the catalog has no real photos), that
// fabric is ranked using Delta-E color similarity alone, with its AI
// score treated as absent rather than zero. This keeps existing
// Delta-E-only matching working exactly as before for any fabric that
// hasn't been embedded, rather than silently penalizing it for missing
// data it was never given a chance to have.
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const EMBEDDING_MODEL_ID = 'siglip-base-patch16-224'
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions'
const REPLICATE_SIGLIP_VERSION = 'REPLACE_WITH_ACTUAL_REPLICATE_MODEL_VERSION'

// Hybrid ranking weights, per the original spec. Named constants so
// they're easy to find and tune after real-world testing, as the spec
// itself anticipates ("these weights can be adjusted after testing").
const WEIGHT_AI_VISUAL = 0.7
const WEIGHT_COLOR = 0.2
const WEIGHT_METADATA = 0.1

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { queryImageUrl, queryHex, fabricTypeHint, inStockOnly } = await req.json()
    if (!queryImageUrl && !queryHex) {
      return new Response(JSON.stringify({ error: 'queryImageUrl or queryHex is required' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: fabrics, error: fabricsError } = await supabase
      .from('fabrics')
      .select('id, fabric_type, color_name, hex, width, gsm, stock_meters, sku, photo_url')
    if (fabricsError) throw fabricsError

    const { data: embeddings, error: embError } = await supabase
      .from('fabric_embeddings')
      .select('fabric_id, embedding')
      .eq('model', EMBEDDING_MODEL_ID)
    if (embError) throw embError
    const embeddingByFabric = Object.fromEntries(embeddings.map((e) => [e.fabric_id, e.embedding]))

    // Only attempt the AI embedding step if there's actually an image and
    // a configured provider — otherwise skip straight to Delta-E-only
    // ranking. This is the honest fallback for the catalog's current
    // "no real photos yet" state.
    let queryEmbedding = null
    const apiToken = Deno.env.get('REPLICATE_API_TOKEN')
    if (queryImageUrl && apiToken && !REPLICATE_SIGLIP_VERSION.startsWith('REPLACE_WITH')) {
      try {
        queryEmbedding = await generateEmbedding(queryImageUrl, apiToken)
      } catch (err) {
        // Don't fail the whole match request just because embedding
        // failed — fall back to color-only ranking and say so.
        console.error('Embedding generation failed, falling back to color-only matching:', err)
      }
    }

    const candidates = fabrics
      .filter((f) => !inStockOnly || f.stock_meters > 0)
      .map((f) => {
        const colorScore = queryHex ? 1 - Math.min(1, deltaE(hexToLab(queryHex), hexToLab(f.hex)) / 100) : null
        const fabricEmbedding = embeddingByFabric[f.id]
        const aiScore = queryEmbedding && fabricEmbedding ? cosineSimilarity(queryEmbedding, fabricEmbedding) : null
        const metadataScore = fabricTypeHint && f.fabric_type === fabricTypeHint ? 1 : 0

        let hybridScore, usedAi;
        if (aiScore !== null) {
          hybridScore = aiScore * WEIGHT_AI_VISUAL + (colorScore ?? 0) * WEIGHT_COLOR + metadataScore * WEIGHT_METADATA
          usedAi = true
        } else {
          // No embedding available for this fabric (or no query embedding
          // at all) — fall back to color + metadata only, renormalized so
          // the missing AI weight doesn't just suppress every score.
          const fallbackTotal = WEIGHT_COLOR + WEIGHT_METADATA
          hybridScore = ((colorScore ?? 0) * WEIGHT_COLOR + metadataScore * WEIGHT_METADATA) / fallbackTotal
          usedAi = false
        }

        return {
          fabricId: f.id,
          fabricType: f.fabric_type,
          colorName: f.color_name,
          hex: f.hex,
          width: f.width,
          gsm: f.gsm,
          stockMeters: f.stock_meters,
          sku: f.sku,
          photoUrl: f.photo_url,
          score: hybridScore,
          usedAi,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    return new Response(
      JSON.stringify({
        results: candidates,
        aiAvailable: queryEmbedding !== null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: corsHeaders })
  }
})

async function generateEmbedding(imageUrl, apiToken) {
  const createRes = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: { Authorization: `Token ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: REPLICATE_SIGLIP_VERSION, input: { image: imageUrl } }),
  })
  if (!createRes.ok) throw new Error(`Embedding request failed: ${createRes.status}`)
  const prediction = await createRes.json()

  for (let attempt = 0; attempt < 30; attempt++) {
    const pollRes = await fetch(prediction.urls.get, { headers: { Authorization: `Token ${apiToken}` } })
    const result = await pollRes.json()
    if (result.status === 'succeeded') return result.output
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`Embedding generation ${result.status}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Embedding request timed out.')
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Same Delta-E / LAB math as the existing client-side matcher (see
// src/TextileApp.jsx's deltaE/hexToLab), duplicated here rather than
// shared, since this Edge Function runs in Deno and can't import from the
// React app bundle. Kept deliberately identical so results are consistent
// whether matching happens with or without AI available.
function hexToLab(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.0
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

function deltaE(lab1, lab2) {
  return Math.sqrt((lab1.l - lab2.l) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2)
}
