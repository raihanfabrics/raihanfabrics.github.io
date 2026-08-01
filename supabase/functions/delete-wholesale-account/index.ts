// -----------------------------------------------------------------------------
// EDGE FUNCTION: delete-wholesale-account
//
// Deleting a wholesale account properly means removing TWO things: the
// `wholesale_accounts` row, and the `auth.users` row created at signup
// (buyers authenticate via Supabase Auth — see wholesaleSignUp() in
// src/lib/supabaseApi.js). Only the second one is the hard part: deleting
// an auth.users row needs the service-role key, which must never reach
// the browser, so it can't be done directly from client-side JS with the
// anon key — same reason embed-fabric/match-fabric/generate-insights are
// Edge Functions instead of direct client calls. This function is the
// server-side piece that makes the "Delete" button in WholesaleAdmin work.
//
// Deleting the auth user CASCADES to the wholesale_accounts row
// automatically (see `auth_user_id ... references auth.users(id) on
// delete cascade` in schema.sql), so this function only needs to do one
// delete, not two.
//
// PERMISSION CHECK: this function still verifies the caller is a
// signed-in OWNER (not just staff) before deleting anything, even though
// it holds the service-role key — the service role bypasses RLS, so this
// function is the only thing standing between "any authenticated user"
// and deleting someone else's account if it didn't check. Do not remove
// this check.
//
// DEPLOYMENT: `supabase functions deploy delete-wholesale-account`. Needs
// no extra secrets beyond what Supabase provides to every Edge Function
// (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY).
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// Every response from an Edge Function called via supabase.functions.invoke()
// from the browser (which is how every call in this project happens) needs
// these headers, or the browser blocks it as a CORS violation before your
// code even gets a chance to see the response — this was the "blocked by
// CORS policy" error in the browser console. The browser also sends a
// preflight OPTIONS request first, which needs its own (empty-body) response
// with the same headers.
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
    const { wholesaleAccountId } = await req.json()
    if (!wholesaleAccountId) {
      return new Response(JSON.stringify({ error: 'wholesaleAccountId is required' }), { status: 400, headers: corsHeaders })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401, headers: corsHeaders })
    }

    // Client scoped to the CALLER's own session (anon key + their JWT) —
    // used only to find out who is calling and confirm they're an owner.
    // Deliberately NOT the service-role client, so this lookup still
    // respects RLS and can't be spoofed by passing an arbitrary user id.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401, headers: corsHeaders })
    }

    const { data: profile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileErr || profile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only the owner can delete a wholesale account.' }), { status: 403, headers: corsHeaders })
    }

    // Service-role client — the only one with permission to delete an
    // auth.users row.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: account, error: fetchErr } = await adminClient
      .from('wholesale_accounts')
      .select('auth_user_id')
      .eq('id', wholesaleAccountId)
      .single()
    if (fetchErr || !account) {
      return new Response(JSON.stringify({ error: 'Wholesale account not found.' }), { status: 404, headers: corsHeaders })
    }

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(account.auth_user_id)
    if (deleteErr) throw deleteErr
    // wholesale_accounts row is removed automatically via the ON DELETE
    // CASCADE foreign key — no second delete needed here.

    return new Response(JSON.stringify({ deleted: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: corsHeaders })
  }
})
