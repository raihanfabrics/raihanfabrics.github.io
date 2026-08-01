import { supabaseConfigured } from './supabaseClient'
import { localApi } from './localStore'
import { supabaseApi } from './supabaseApi'

// ---------------------------------------------------------------------------
// UNIFIED API — the rest of the app imports only from here and never needs
// to know whether Supabase is configured. If VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are set (see .env.example), every call goes to the
// real Supabase backend. Otherwise everything runs against the local
// (localStorage) data layer, which is also what keeps the app fully
// functional offline as a PWA once Supabase is added — see README.
// ---------------------------------------------------------------------------

const backend = supabaseConfigured ? supabaseApi : localApi

export const isBackendLive = supabaseConfigured

// Resolves to the shop's single warehouse. Cached after the first lookup —
// this doesn't change during a session, and it's called from several
// forms (record sale, log request, close shopping trip). See CHANGES
// readme: the "wh1" literal this replaces isn't a valid ID in Supabase
// mode (it's a real uuid column) and was the reason those three actions
// were silently failing.
let _defaultWarehouseIdCache = null
export async function getDefaultWarehouseId() {
  if (_defaultWarehouseIdCache) return _defaultWarehouseIdCache
  _defaultWarehouseIdCache = await backend.getDefaultWarehouseId()
  return _defaultWarehouseIdCache
}

export async function getSession() {
  return backend.getSession()
}

export async function clearSession() {
  return backend.clearSession()
}

export async function staffSignIn(username, password) {
  return backend.staffSignIn(username, password)
}

export async function wholesaleSignUp(payload) {
  return backend.wholesaleSignUp(payload)
}

export async function wholesaleSignIn(phone, password) {
  return backend.wholesaleSignIn(phone, password)
}

export async function fetchProducts() {
  return backend.fetchProducts()
}

export async function addProduct(product) {
  return backend.addProduct(product)
}

export async function updateProduct(id, updates) {
  return backend.updateProduct(id, updates)
}

// Resolves to { archived: true } if the fabric had sale/purchase history and
// was archived instead of deleted, or { archived: false } if it was actually
// removed — see supabaseApi.js's deleteProduct for why.
export async function deleteProduct(id) {
  return backend.deleteProduct(id)
}

export async function restoreProduct(id) {
  return backend.restoreProduct(id)
}

// Calls onChange whenever any of the given tables change, so the UI can
// refetch without the person needing to reload the page. Returns an
// unsubscribe function. No-op (returns a no-op unsubscribe) in local mode.
export function subscribeToTableChanges(tables, onChange) {
  return backend.subscribeToTableChanges(tables, onChange)
}

export async function fetchWholesaleAccounts() {
  return backend.fetchWholesaleAccounts()
}

export async function setWholesaleStatus(id, status) {
  return backend.setWholesaleStatus(id, status)
}

// Owner-only — see WholesaleAdmin (canManage gate) and the
// delete-wholesale-account Edge Function in Supabase mode.
export async function deleteWholesaleAccount(id) {
  return backend.deleteWholesaleAccount(id)
}

export async function fetchAccountTransactions() {
  return backend.fetchAccountTransactions()
}

export async function logAccountTransaction(wholesaleAccountId, options) {
  return backend.logAccountTransaction(wholesaleAccountId, options)
}

export async function deleteAccountTransactionsForAccount(wholesaleAccountId) {
  return backend.deleteAccountTransactionsForAccount(wholesaleAccountId)
}

// ---- sales (Phase 1: BI foundation) ----
export async function recordSale(sale) {
  return backend.recordSale(sale)
}

export async function fetchDashboardMetrics() {
  return backend.fetchDashboardMetrics()
}

// ---- customer requests (Phase 2: Demand Intelligence) ----
export async function uploadRequestPhoto(file) {
  return backend.uploadRequestPhoto(file)
}

export async function getRequestPhotoUrl(path) {
  return backend.getRequestPhotoUrl(path)
}

export async function recordCustomerRequest(request) {
  return backend.recordCustomerRequest(request)
}

export async function fetchCustomerRequests() {
  return backend.fetchCustomerRequests()
}

export async function setCustomerRequestStatus(id, status) {
  return backend.setCustomerRequestStatus(id, status)
}

// ---- suppliers & procurement (Phase 3) ----
export async function fetchSuppliers() {
  return backend.fetchSuppliers()
}

export async function addSupplier(supplier) {
  return backend.addSupplier(supplier)
}

export async function updateSupplier(id, supplier) {
  return backend.updateSupplier(id, supplier)
}

export async function deleteSupplier(id) {
  return backend.deleteSupplier(id)
}

export async function fetchSupplierOrders() {
  return backend.fetchSupplierOrders()
}

export async function logSupplierOrder(supplierId, options) {
  return backend.logSupplierOrder(supplierId, options)
}

export async function markSupplierOrderReceived(orderId) {
  return backend.markSupplierOrderReceived(orderId)
}

export async function fetchProcurementData() {
  return backend.fetchProcurementData()
}

// ---- market mode (Phase 4) ----
// Note: these go straight to the backend with no offline handling here —
// the offline outbox (marketOutbox.js) wraps these specifically inside the
// Market Mode screen, since that's the one place in the app where a
// dropped connection mid-task is expected, not just possible.
export async function fetchShoppingSessions() {
  return backend.fetchShoppingSessions()
}

export async function createShoppingSession(session) {
  return backend.createShoppingSession(session)
}

export async function fetchShoppingItems(sessionId) {
  return backend.fetchShoppingItems(sessionId)
}

export async function addShoppingItem(sessionId, item) {
  return backend.addShoppingItem(sessionId, item)
}

export async function updateShoppingItem(id, updates) {
  return backend.updateShoppingItem(id, updates)
}

export async function updateShoppingSessionNotes(id, notes) {
  return backend.updateShoppingSessionNotes(id, notes)
}

export async function closeShoppingSession(sessionId, options) {
  return backend.closeShoppingSession(sessionId, options)
}

// ---- AI fabric matching (Phase 6) ----
// uploadFabricPhoto's signature differs slightly by backend (local mode
// only needs the file; Supabase mode also needs the fabric id to build a
// storage path) — both are always passed here so either backend can use
// what it needs and ignore the rest.
export async function uploadFabricPhoto(file, fabricId) {
  return backend.uploadFabricPhoto(file, fabricId)
}

export async function embedFabricPhoto(fabricId) {
  return backend.embedFabricPhoto(fabricId)
}

// matchFabric's inputs differ by backend for a real reason, not an
// oversight: the match-fabric Edge Function fetches the fabric catalog
// itself server-side, but local mode has no server to do that fetch from,
// so it needs the already-loaded `products` list passed in directly.
export async function matchFabric({ queryImageUrl, queryHex, fabricTypeHint, inStockOnly, products }) {
  if (isBackendLive) {
    return backend.matchFabric({ queryImageUrl, queryHex, fabricTypeHint, inStockOnly })
  }
  return backend.matchFabric({ queryHex, fabricTypeHint, inStockOnly, products })
}

export async function recordMatchFeedback(feedback) {
  return backend.recordMatchFeedback(feedback)
}

// ---- AI business insights (Phase 7) ----
// Fact extraction (buildInsightFacts) is pure arithmetic on data already
// fetched via fetchDashboardMetrics — identical regardless of backend, so
// it lives once in insightFacts.js rather than duplicated per backend.
// Only the actual LLM phrasing call is backend-specific: Supabase mode
// calls the generate-insights Edge Function; local mode has no server to
// call an LLM from, so it returns the facts as plain sentences with
// aiPhrased: false, same honest-fallback pattern as Phase 6's matching.
export async function generateInsights(facts) {
  if (facts.length === 0) {
    return { insights: [], aiPhrased: false }
  }
  if (isBackendLive) {
    try {
      const { data, error } = await backend.generateInsights(facts)
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return { insights: data.insights, aiPhrased: true }
    } catch (err) {
      // LLM phrasing failed or isn't configured — fall back to the plain
      // facts rather than showing nothing. The facts themselves are
      // already verified true; only their wording is degraded.
      return { insights: facts, aiPhrased: false, error: err.message }
    }
  }
  return { insights: facts, aiPhrased: false }
}

// Exposes the raw backend so marketOutbox.flushOutbox can call the real
// Supabase functions directly when replaying queued writes (it needs the
// actual backend, not this wrapper, to avoid re-queueing during a flush).
export const rawBackend = backend
