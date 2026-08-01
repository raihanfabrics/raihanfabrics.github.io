// -----------------------------------------------------------------------------
// EDGE FUNCTION: embed-fabric (Phase 6)
//
// Runs server-side (Supabase Edge Functions / Deno), never in the browser.
// This is where the architecture spec's requirement lives:
//   PWA → capture image → send to backend → backend generates embedding →
//   store in DB → backend does similarity search → return top matches
//
// This function handles the "generate embedding and store it" half. Given
// a fabric_id and a photo already uploaded to the fabric-photos Storage
// bucket, it calls the embedding provider and writes a fabric_embeddings
// row. The actual similarity search (comparing a new swatch photo against
// all stored embeddings) happens in a separate function — see
// match-fabric/index.ts — since that's a different operation with
// different inputs/outputs.
//
// WHY THIS HAS TO BE SERVER-SIDE, NOT IN THE BROWSER (per the original
// spec's explicit architecture requirement):
//   - The Replicate API token is a paid credential; it must never reach
//     client-side JS, where anyone could read it from network requests.
//   - Running SigLIP inference in-browser (e.g. via transformers.js) would
//     mean shipping a multi-hundred-MB model to every visitor's phone,
//     defeating the PWA's whole "fast and lightweight" design goal, and
//     wouldn't scale as the catalog grows.
//
// DEPLOYMENT: `supabase functions deploy embed-fabric` after setting the
// REPLICATE_API_TOKEN secret (`supabase secrets set REPLICATE_API_TOKEN=...`).
// See README for full setup, including why this hasn't been deployed yet
// (no real fabric photos exist in the catalog to embed).
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const EMBEDDING_MODEL_ID = 'siglip-base-patch16-224'
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions'
// See src/lib/embeddingProvider.js for why this is a placeholder — a real
// Replicate account is needed to look up the actual model version hash.
const REPLICATE_SIGLIP_VERSION = 'REPLACE_WITH_ACTUAL_REPLICATE_MODEL_VERSION'

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
    const { fabricId } = await req.json()
    if (!fabricId) {
      return new Response(JSON.stringify({ error: 'fabricId is required' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // service role, not anon — this function needs to write embeddings regardless of the calling user's RLS context, since it's invoked by trusted staff-only app code
    )

    const { data: fabric, error: fabricError } = await supabase
      .from('fabrics')
      .select('id, photo_url')
      .eq('id', fabricId)
      .single()
    if (fabricError) throw fabricError
    if (!fabric.photo_url) {
      return new Response(JSON.stringify({ error: 'This fabric has no photo uploaded yet — nothing to embed.' }), { status: 400, headers: corsHeaders })
    }

    const apiToken = Deno.env.get('REPLICATE_API_TOKEN')
    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: 'REPLICATE_API_TOKEN is not configured. See README — Phase 6 setup.' }),
        { status: 500, headers: corsHeaders }
      )
    }
    if (REPLICATE_SIGLIP_VERSION.startsWith('REPLACE_WITH')) {
      return new Response(
        JSON.stringify({ error: 'No SigLIP model version configured yet. See README — Phase 6 setup.' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Fabric photos are in a private bucket — get a signed URL so
    // Replicate's servers can fetch it.
    const path = fabric.photo_url.split('/fabric-photos/')[1] || fabric.photo_url
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('fabric-photos')
      .createSignedUrl(path, 300) // 5 minutes — plenty for the embedding call
    if (signedUrlError) throw signedUrlError

    const embedding = await generateEmbedding(signedUrlData.signedUrl, apiToken)

    const { error: upsertError } = await supabase
      .from('fabric_embeddings')
      .upsert(
        { fabric_id: fabricId, model: EMBEDDING_MODEL_ID, embedding },
        { onConflict: 'fabric_id,model' }
      )
    if (upsertError) throw upsertError

    return new Response(JSON.stringify({ success: true, model: EMBEDDING_MODEL_ID }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
  if (!createRes.ok) throw new Error(`Embedding request failed: ${createRes.status} ${await createRes.text()}`)
  const prediction = await createRes.json()

  for (let attempt = 0; attempt < 30; attempt++) {
    const pollRes = await fetch(prediction.urls.get, { headers: { Authorization: `Token ${apiToken}` } })
    const result = await pollRes.json()
    if (result.status === 'succeeded') return result.output
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`Embedding generation ${result.status}: ${result.error || 'unknown error'}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Embedding request timed out after 30 polls.')
}
