// -----------------------------------------------------------------------------
// EDGE FUNCTION: generate-insights (Phase 7)
//
// Turns a small set of ALREADY-COMPUTED, ALREADY-VERIFIED facts into
// readable sentences. This function does not compute anything itself and
// does not see raw sales data — it only receives a `facts` array (see
// src/lib/insightFacts.js for how those are built) and asks an LLM to
// phrase them naturally. This is deliberate: the app's own tested math
// (Phases 1 and 5) decides what's true; the LLM only decides how to say
// it. If the LLM invented trends from scratch, a hallucinated "demand is
// rising" could go straight into a merchant's purchasing decisions — that
// risk lives in Phase 6/7's territory generally, and this design is the
// mitigation for it here specifically.
//
// If `facts` is empty (which will genuinely happen for a shop with little
// sales history — see Phase 5's notes on this), this returns an empty
// insights list rather than asking the LLM to invent something to say.
//
// MODEL: calls the Anthropic Claude API directly via fetch (no SDK, to
// keep this Edge Function dependency-free like the Phase 6 functions).
// Requires an ANTHROPIC_API_KEY secret — see README, Phase 7 setup.
// -----------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6' // per project instructions: always use this model string for API calls made on this project's behalf

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
    const { facts } = await req.json()
    if (!Array.isArray(facts)) {
      return new Response(JSON.stringify({ error: 'facts array is required' }), { status: 400, headers: corsHeaders })
    }
    if (facts.length === 0) {
      // Nothing to say — see file header. Returning early also means no
      // API cost is spent on an empty request.
      return new Response(JSON.stringify({ insights: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured. See README — Phase 7 setup.' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const factList = facts.map((f, i) => `${i + 1}. ${f}`).join('\n')

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system:
          'You rewrite a list of pre-verified business facts about a textile shop as short, plain-language sentences for a merchant to read on a dashboard. ' +
          'Rules: rewrite ONLY the facts given — never add a number, trend, or claim that is not already in the fact list. ' +
          'Never speculate about causes unless the fact itself states one. ' +
          'One sentence per fact, in the same order. Keep each sentence under 20 words. No preamble, no headers, no bullet markers — ' +
          'respond with exactly one sentence per line and nothing else.',
        messages: [{ role: 'user', content: factList }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Insight generation failed: ${response.status} ${await response.text()}`)
    }

    const result = await response.json()
    const text = result.content?.find((block) => block.type === 'text')?.text || ''
    const insights = text.split('\n').map((line) => line.trim()).filter(Boolean)

    // Sanity check: the model should return roughly one line per fact. If
    // it returns wildly more (e.g. it added commentary despite
    // instructions), something's off — fail loudly rather than show
    // possibly-fabricated extra lines to a merchant.
    if (insights.length > facts.length + 2) {
      throw new Error('Insight generation returned unexpected output — showing plain facts instead.')
    }

    return new Response(JSON.stringify({ insights }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: corsHeaders })
  }
})
