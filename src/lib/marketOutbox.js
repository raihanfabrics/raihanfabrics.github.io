// -----------------------------------------------------------------------------
// MARKET MODE OFFLINE OUTBOX (Phase 4)
//
// Market Mode is used while physically walking a wholesale market, where
// connectivity is often bad or absent — this is the one part of the app
// that actually needs offline-write support, unlike the rest of the admin
// screens which assume a live connection.
//
// This is deliberately a simple outbox, not a full sync library
// (ElectricSQL/RxDB etc.): queue writes in localStorage while offline,
// replay them against Supabase in order once back online, last-write-wins
// on conflicts. For a single shop's staff on one device at a time, this is
// enough — there's no meaningful concurrent-edit scenario to resolve. See
// README for why a heavier sync library was deliberately not used here.
//
// Reads (fetchShoppingSessions/fetchShoppingItems) are NOT queued or
// cached here — they just hit Supabase directly and fail naturally if
// offline. Only the mutations below go through the outbox, since those are
// what would otherwise be lost when connectivity drops mid-trip.
// -----------------------------------------------------------------------------

const OUTBOX_KEY = 'swatchbook_market_outbox'

function readOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeOutbox(queue) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue))
}

// A tiny local cache of session/item state, so the UI has something to
// render immediately after a queued (not-yet-synced) write, even before
// the real Supabase round-trip succeeds. This is intentionally separate
// from localStore.js's full local-mode data layer — it only mirrors
// Market Mode data, and only as a display cache, not a source of truth.
const CACHE_KEY = 'swatchbook_market_cache'

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : { sessions: [], items: [] }
  } catch {
    return { sessions: [], items: [] }
  }
}

function writeCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

// -----------------------------------------------------------------------------
// `navigator.onLine` only reports whether the device has *a* network
// interface up — it stays `true` on market wifi that's connected but not
// actually reaching Supabase. Combined with supabase-js queries having no
// built-in timeout, that's what caused the "stuck on loading, needs a
// refresh" reports: a request that will never resolve, with a spinner that
// waits on it forever. Every network call in Market Mode should be wrapped
// in this so a stalled request fails visibly (and can be retried) instead
// of hanging indefinitely.
// -----------------------------------------------------------------------------
export function withTimeout(promise, ms = 12000, message = 'Request timed out — check your connection and try again.') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

// Queues a mutation for later replay, and applies an optimistic update to
// the local cache so the UI reflects it immediately.
function enqueue(op, applyOptimistic) {
  const queue = readOutbox()
  queue.push({ ...op, queuedAt: new Date().toISOString() })
  writeOutbox(queue)
  if (applyOptimistic) {
    const cache = readCache()
    applyOptimistic(cache)
    writeCache(cache)
  }
}

export function getQueuedCount() {
  return readOutbox().length
}

export function getCache() {
  return readCache()
}

// Call this once connectivity returns (e.g. from a 'online' event listener
// in the Market Mode screen). Replays queued writes in order against the
// real backend; stops and keeps the remainder queued if one fails, so nothing
// is silently dropped.
export async function flushOutbox(supabaseApi) {
  const queue = readOutbox()
  if (queue.length === 0) return { flushed: 0, remaining: 0 }

  let flushed = 0
  for (const op of queue) {
    try {
      if (op.type === 'addItem') {
        await supabaseApi.addShoppingItem(op.sessionId, op.payload)
      } else if (op.type === 'updateItem') {
        await supabaseApi.updateShoppingItem(op.itemId, op.updates)
      } else if (op.type === 'updateSessionNotes') {
        await supabaseApi.updateShoppingSessionNotes(op.sessionId, op.notes)
      }
      flushed += 1
    } catch (err) {
      // Stop on first failure — keep this op and everything after it
      // queued, rather than risk replaying out of order.
      writeOutbox(queue.slice(flushed))
      return { flushed, remaining: queue.length - flushed, error: err }
    }
  }
  writeOutbox([])
  return { flushed, remaining: 0 }
}

export function queueAddItem(sessionId, payload) {
  enqueue({ type: 'addItem', sessionId, payload }, (cache) => {
    cache.items.push({ id: 'pending_' + Date.now(), sessionId, status: 'planned', ...payload, _pending: true })
  })
}

export function queueUpdateItem(itemId, updates) {
  enqueue({ type: 'updateItem', itemId, updates }, (cache) => {
    cache.items = cache.items.map((i) => (i.id === itemId ? { ...i, ...updates, _pending: true } : i))
  })
}

export function queueUpdateSessionNotes(sessionId, notes) {
  enqueue({ type: 'updateSessionNotes', sessionId, notes }, (cache) => {
    cache.sessions = cache.sessions.map((s) => (s.id === sessionId ? { ...s, notes, _pending: true } : s))
  })
}

// Either argument can be omitted (pass null/undefined) to refresh just
// the other one without wiping out what's already cached for it — used
// when a single trip's items are reloaded without re-fetching every
// session too.
export function primeCache(sessions, items) {
  const current = readCache()
  writeCache({
    sessions: sessions ?? current.sessions,
    items: items ?? current.items,
  })
}
