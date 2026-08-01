import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If env vars aren't set, `configured` is false and the app falls back to
// the local (offline-capable) data layer in localStore.js — see api.js.
// This means the app runs immediately without any Supabase setup, and
// switches to the real backend automatically once you add your project's
// URL and anon key to .env (see .env.example).
export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured ? createClient(url, anonKey) : null
