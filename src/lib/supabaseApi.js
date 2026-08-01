import { supabase } from './supabaseClient'

// ---------------------------------------------------------------------------
// SUPABASE DATA LAYER — mirrors localStore.js's function shapes exactly, so
// api.js can swap between them without the rest of the app knowing.
//
// AUTH NOTE: Supabase Auth's password login is built for email addresses.
// To keep staff usernames and wholesale phone-number logins free (no SMS/
// Twilio cost), both are mapped to a synthetic internal email address
// behind the scenes — e.g. phone "+93 70 123 4567" becomes
// "93701234567@buyer.swatchbook.local". The person never sees this; they
// only ever type their phone number or username. This is a common,
// legitimate pattern for using Supabase's free email+password auth without
// requiring a real email address from the user.
// ---------------------------------------------------------------------------

function digitsOnly(str) {
  return str.replace(/\D/g, '')
}

function staffEmail(username) {
  return `${username.trim().toLowerCase()}@staff.swatchbook.local`
}

function wholesaleEmail(phone) {
  return `${digitsOnly(phone)}@buyer.swatchbook.local`
}

// Converts a DB row (snake_case) to the app's product shape (camelCase).
function rowToProduct(row) {
  return {
    id: row.id,
    fabricType: row.fabric_type,
    colorName: row.color_name,
    hex: row.hex,
    width: row.width,
    gsm: row.gsm,
    retailPrice: row.retail_price,
    wholesalePrice: row.wholesale_price ?? null, // null when RLS hides it (unauthorized viewer)
    stockMeters: row.stock_meters,
    sku: row.sku,
    photoUrl: row.photo_url ?? null, // real fabric photo for AI matching (Phase 6) — separate from hex
    // Archived fabrics (is_active = false) couldn't be hard-deleted because they
    // have sale/purchase history — see deleteProduct below. Defaults to true for
    // rows read before the migration adding this column has been run.
    isActive: row.is_active ?? true,
  }
}

function productToRow(product) {
  return {
    fabric_type: product.fabricType,
    color_name: product.colorName,
    hex: product.hex,
    width: product.width,
    gsm: product.gsm,
    retail_price: product.retailPrice,
    wholesale_price: product.wholesalePrice,
    stock_meters: product.stockMeters,
    sku: product.sku,
    photo_url: product.photoUrl ?? null,
    is_active: product.isActive,
  }
}

function rowToAccount(row) {
  return {
    id: row.id,
    status: row.status,
    businessName: row.business_name,
    ownerName: row.owner_name,
    phone: row.phone,
    address: { line: row.address_line, landmark: row.landmark, lat: row.lat, lng: row.lng },
    requestedAt: row.requested_at,
  }
}

export const supabaseApi = {
  // ---- session ----
  async getSession() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name, username')
      .eq('id', data.session.user.id)
      .maybeSingle()
    if (profile) {
      return { type: 'staff', user: { id: data.session.user.id, username: profile.username, role: profile.role, name: profile.name } }
    }
    const { data: account } = await supabase
      .from('wholesale_accounts')
      .select('*')
      .eq('auth_user_id', data.session.user.id)
      .maybeSingle()
    if (account) {
      return { type: 'wholesale', user: rowToAccount(account) }
    }
    return null
  },

  async clearSession() {
    await supabase.auth.signOut()
  },

  // Resolves the shop's single warehouse row (see schema_v2_phase0.sql,
  // which seeds exactly one row with is_default = true). Falls back to
  // "whichever warehouse exists" if, for some reason, none is flagged
  // default, rather than failing outright.
  async getDefaultWarehouseId() {
    const { data, error } = await supabase
      .from('warehouses')
      .select('id')
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (data) return data.id
    const { data: any, error: anyError } = await supabase
      .from('warehouses')
      .select('id')
      .limit(1)
      .maybeSingle()
    if (anyError) throw anyError
    if (!any) throw new Error('no_warehouse_configured')
    return any.id
  },

  // ---- staff auth ----
  // Staff accounts are created directly in the Supabase dashboard (Auth →
  // Users) plus a matching row in `profiles` — see supabase/schema.sql for
  // the exact steps. This keeps staff creation an owner-only, out-of-band
  // action rather than something reachable from the public app.
  async staffSignIn(username, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: staffEmail(username),
      password,
    })
    if (error) throw new Error('invalid_credentials')
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name, username')
      .eq('id', data.user.id)
      .maybeSingle()
    if (!profile) throw new Error('invalid_credentials')
    return { id: data.user.id, username: profile.username, role: profile.role, name: profile.name }
  },

  // ---- wholesale auth ----
  async wholesaleSignUp({ businessName, ownerName, phone, password, address }) {
    const { data, error } = await supabase.auth.signUp({
      email: wholesaleEmail(phone),
      password,
    })
    if (error) throw new Error(error.message.includes('already') ? 'phone_already_registered' : 'signup_failed')

    const { data: row, error: insertError } = await supabase
      .from('wholesale_accounts')
      .insert({
        auth_user_id: data.user.id,
        status: 'pending',
        business_name: businessName,
        owner_name: ownerName,
        phone,
        address_line: address.line,
        landmark: address.landmark,
        lat: address.lat,
        lng: address.lng,
      })
      .select()
      .single()
    if (insertError) throw new Error('signup_failed')
    return rowToAccount(row)
  },

  async wholesaleSignIn(phone, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: wholesaleEmail(phone),
      password,
    })
    if (error) throw new Error('invalid_credentials')
    const { data: row } = await supabase
      .from('wholesale_accounts')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle()
    if (!row) throw new Error('invalid_credentials')
    return rowToAccount(row)
  },

  // ---- products ----
  // Reads go through `fabrics_secure`, a view that nulls out wholesale_price
  // for anyone who isn't staff or an approved wholesale buyer — enforced by
  // Postgres itself, not by the app hiding a UI element. See schema.sql.
  async fetchProducts() {
    const { data, error } = await supabase.from('fabrics_secure').select('*').order('fabric_type')
    if (error) throw error
    return data.map(rowToProduct)
  },
  async addProduct(product) {
    const patch = productToRow(product)
    const openingStock = Number(product.stockMeters) || 0
    delete patch.stock_meters // established via adjustFabricStock below, same reasoning as updateProduct

    const { data, error } = await supabase.from('fabrics').insert(patch).select().single()
    if (error) throw error

    if (openingStock > 0) {
      await this.adjustFabricStock(data.id, openingStock, { note: 'Opening stock' })
      const { data: refreshed, error: refetchError } = await supabase.from('fabrics').select('*').eq('id', data.id).single()
      if (refetchError) throw refetchError
      return rowToProduct(refreshed)
    }

    return rowToProduct(data)
  },
  async updateProduct(id, updates) {
    const patch = productToRow(updates)
    // stock_meters is NEVER written directly here — see adjustFabricStock
    // below. fabrics.stock_meters is kept in sync by a DB trigger that
    // recomputes it as sum(stock_batches.meters_remaining) every time a
    // batch changes (migration_2026-07-26-stock-sync.sql). Writing 35 here
    // directly used to "work" for a moment, but the next stock_batches
    // change — a Market Mode purchase, a sale, anything — made the trigger
    // recompute from the batches (which still summed to the old 50) and
    // silently threw the manual edit away, then added the new purchase on
    // top of the stale number (50 + 20 = 70 instead of 55). Routing every
    // manual stock change through a real batch adjustment instead means
    // the trigger's recomputation always includes it, permanently.
    const hasStockChange = 'stockMeters' in updates && updates.stockMeters !== undefined && updates.stockMeters !== null && updates.stockMeters !== ''
    delete patch.stock_meters

    const { data, error } = await supabase.from('fabrics').update(patch).eq('id', id).select().single()
    if (error) throw error

    if (hasStockChange) {
      await this.adjustFabricStock(id, Number(updates.stockMeters), { note: 'Manual inventory edit' })
      const { data: refreshed, error: refetchError } = await supabase.from('fabrics').select('*').eq('id', id).single()
      if (refetchError) throw refetchError
      return rowToProduct(refreshed)
    }

    return rowToProduct(data)
  },

  // Reconciles a fabric's real stock level (as shown/edited in Inventory)
  // with stock_batches — the table the sync trigger actually reads from —
  // instead of writing fabrics.stock_meters directly, which would just get
  // overwritten by the trigger on the next unrelated batch change (see
  // updateProduct above). Works both directions:
  //   - target > current sum: opens a new zero-cost "adjustment" batch for
  //     the difference, so the extra meters have somewhere to live without
  //     distorting FIFO cost-of-goods for the fabric's real purchases.
  //   - target < current sum: draws the difference down from existing
  //     batches oldest-first (same FIFO order used for sales), so the
  //     correction eats into the oldest stock first.
  // Every adjustment is also logged as a stock_movements row (movement_type
  // 'adjustment') for the audit trail.
  async adjustFabricStock(fabricId, targetMeters, { warehouseId, note } = {}) {
    const target = Number(targetMeters)
    if (!Number.isFinite(target) || target < 0) return { delta: 0 }

    const { data: batches, error: batchesError } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('fabric_id', fabricId)
      .order('purchased_at', { ascending: true })
    if (batchesError) throw batchesError

    const currentTotal = (batches || []).reduce((sum, b) => sum + Number(b.meters_remaining), 0)
    const delta = target - currentTotal
    if (delta === 0) return { delta: 0 }

    const wid = warehouseId || (await this.getDefaultWarehouseId())
    const reason = note || 'Manual inventory count adjustment'

    if (delta > 0) {
      const { data: batch, error: batchError } = await supabase
        .from('stock_batches')
        .insert({
          fabric_id: fabricId,
          warehouse_id: wid,
          supplier_id: null,
          cost_per_meter: 0, // no real purchase behind this — keeps FIFO cost-of-goods on actual purchases honest
          meters_purchased: delta,
          meters_remaining: delta,
          purchased_at: new Date().toISOString().slice(0, 10),
          notes: reason,
        })
        .select()
        .single()
      if (batchError) throw batchError

      const { error: moveError } = await supabase.from('stock_movements').insert({
        fabric_id: fabricId,
        batch_id: batch.id,
        warehouse_id: wid,
        movement_type: 'adjustment',
        meters: delta,
        reason,
      })
      if (moveError) throw moveError
    } else {
      let toRemove = -delta
      for (const batch of batches) {
        if (toRemove <= 0) break
        const remove = Math.min(Number(batch.meters_remaining), toRemove)
        if (remove <= 0) continue
        const { error: updateError } = await supabase
          .from('stock_batches')
          .update({ meters_remaining: Number(batch.meters_remaining) - remove })
          .eq('id', batch.id)
        if (updateError) throw updateError

        const { error: moveError } = await supabase.from('stock_movements').insert({
          fabric_id: fabricId,
          batch_id: batch.id,
          warehouse_id: wid,
          movement_type: 'adjustment',
          meters: -remove,
          reason,
        })
        if (moveError) throw moveError
        toRemove -= remove
      }
    }
    // fabrics.stock_meters is deliberately left untouched here — the
    // trigger from migration_2026-07-26-stock-sync.sql fires on every
    // stock_batches insert/update above and recomputes it automatically.
    return { delta }
  },
  // A fabric that has ever been sold or purchased has rows in stock_batches,
  // stock_movements, and/or sale_items pointing at it with "on delete restrict"
  // (see schema_v2_phase0.sql) — deliberately, so a delete can never silently
  // erase sales history or the FIFO cost trail a past sale's profit was
  // calculated from. Postgres blocks the delete with a foreign-key-violation
  // error (code 23503), which used to bubble up to the confirm dialog as raw
  // SQL. Since the fabric genuinely can't be safely erased in that case, this
  // now archives it instead (is_active = false): it disappears from the
  // storefront, Record Sale, and Purchase List pickers, but stays in Inventory
  // (greyed out, restorable) and every past invoice/report still resolves its
  // name correctly. A fabric with no history at all still hard-deletes as before.
  async deleteProduct(id) {
    const { error } = await supabase.from('fabrics').delete().eq('id', id)
    if (!error) return { archived: false }
    if (error.code === '23503') {
      const { error: archiveError } = await supabase.from('fabrics').update({ is_active: false }).eq('id', id)
      if (archiveError) throw archiveError
      return { archived: true }
    }
    throw error
  },
  async restoreProduct(id) {
    const { data, error } = await supabase.from('fabrics').update({ is_active: true }).eq('id', id).select().single()
    if (error) throw error
    return rowToProduct(data)
  },

  // ---- wholesale accounts (admin side) ----
  async fetchWholesaleAccounts() {
    const { data, error } = await supabase.from('wholesale_accounts').select('*').order('requested_at', { ascending: false })
    if (error) throw error
    return data.map(rowToAccount)
  },
  async setWholesaleStatus(id, status) {
    const { data, error } = await supabase.from('wholesale_accounts').update({ status }).eq('id', id).select().single()
    if (error) throw error
    return rowToAccount(data)
  },

  // Owner-only in the UI (canManage), and re-checked server-side by the
  // Edge Function itself — see supabase/functions/delete-wholesale-account
  // for why this can't be a plain client-side delete (it also has to
  // remove the linked auth.users row, which needs the service-role key).
  // supabase.functions.invoke automatically forwards the caller's current
  // session, which is what lets the function verify who's asking.
  async deleteWholesaleAccount(id) {
    const { data, error } = await supabase.functions.invoke('delete-wholesale-account', {
      body: { wholesaleAccountId: id },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  // ---- credit ledger (see schema_v11 — fully manual, decoupled from sales) ----
  async fetchAccountTransactions() {
    const { data, error } = await supabase.from('account_transactions').select('*').order('occurred_at', { ascending: true })
    if (error) throw error
    return data
  },

  async logAccountTransaction(wholesaleAccountId, { type, amount, notes, recordedBy }) {
    const { data, error } = await supabase
      .from('account_transactions')
      .insert({
        wholesale_account_id: wholesaleAccountId,
        type, // 'charge' | 'payment'
        amount,
        notes: notes || null,
        recorded_by: recordedBy || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Wipes every charge/payment entry for one wholesale account — "Settle
  // Balance" in the Credit Ledger. The caller is responsible for the
  // password-confirmation step before this is ever invoked; this
  // function just does the (irreversible) delete.
  async deleteAccountTransactionsForAccount(wholesaleAccountId) {
    const { error } = await supabase
      .from('account_transactions')
      .delete()
      .eq('wholesale_account_id', wholesaleAccountId)
    if (error) throw error
  },

  // ---- sales (Phase 1: BI foundation) ----
  // Records a completed, staff-confirmed sale. Cost is drawn FIFO from the
  // fabric's stock_batches (oldest purchase first) so profit reflects what
  // was actually paid for the specific meters sold, not today's price.
  // Each line item may span multiple batches if one batch doesn't have
  // enough meters remaining.
  async recordSale({ warehouseId, salespersonId, customerName, customerPhone, wholesaleAccountId, paymentMethod, paymentStatus, amountPaid, discountTotal, notes, items }) {
    // 1. Create the sale header (invoice_number is auto-generated by trigger).
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        warehouse_id: warehouseId,
        salesperson_id: salespersonId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        wholesale_account_id: wholesaleAccountId || null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        amount_paid: paymentStatus === 'partial' ? amountPaid : null,
        discount_total: discountTotal || 0,
        notes: notes || null,
      })
      .select()
      .single()
    if (saleError) throw saleError

    // 2. For each line item, consume stock FIFO across batches and record
    // sale_items + stock_movements. This runs as sequential awaits (not a
    // DB transaction) — acceptable for a single-shop, staff-only data-entry
    // flow with no concurrent writers, but not safe to assume at larger scale.
    for (const item of items) {
      let metersToFulfill = item.meters
      const { data: batches, error: batchError } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('fabric_id', item.fabricId)
        .gt('meters_remaining', 0)
        .order('purchased_at', { ascending: true })
      if (batchError) throw batchError

      for (const batch of batches) {
        if (metersToFulfill <= 0) break
        const drawn = Math.min(batch.meters_remaining, metersToFulfill)

        const { error: itemError } = await supabase.from('sale_items').insert({
          sale_id: sale.id,
          fabric_id: item.fabricId,
          batch_id: batch.id,
          meters: drawn,
          unit_price: item.unitPrice,
          unit_cost: batch.cost_per_meter,
          discount: item.discount || 0,
        })
        if (itemError) throw itemError

        const { error: updateError } = await supabase
          .from('stock_batches')
          .update({ meters_remaining: batch.meters_remaining - drawn })
          .eq('id', batch.id)
        if (updateError) throw updateError

        const { error: movementError } = await supabase.from('stock_movements').insert({
          fabric_id: item.fabricId,
          batch_id: batch.id,
          warehouse_id: warehouseId,
          movement_type: 'sale',
          meters: -drawn,
          reference_id: sale.id,
          created_by: salespersonId,
        })
        if (movementError) throw movementError

        metersToFulfill -= drawn
      }
      // If metersToFulfill > 0 here, stock_batches didn't have enough
      // recorded stock to cover the sale — the sale still gets recorded
      // (staff shouldn't be blocked mid-checkout) but this indicates the
      // batch data is out of sync with real shelf stock.
    }

    return sale
  },

  // Pulls the raw rows needed for Phase 1 dashboard metrics. Aggregation
  // (grouping by day/week/month, best-sellers, dead stock, etc.) happens in
  // the app layer — at this data volume (single shop, thousands of
  // products) that's simpler than maintaining SQL views and fast enough
  // without one.
  async fetchDashboardMetrics() {
    const [salesRes, saleItemsRes, batchesRes, fabricsRes, requestsRes] = await Promise.all([
      supabase.from('sales').select('*').order('sold_at', { ascending: false }),
      supabase.from('sale_items').select('*'),
      supabase.from('stock_batches').select('*'),
      supabase.from('fabrics').select('id, fabric_type, color_name, sku'),
      supabase.from('customer_requests').select('*').eq('status', 'open'),
    ])
    if (salesRes.error) throw salesRes.error
    if (saleItemsRes.error) throw saleItemsRes.error
    if (batchesRes.error) throw batchesRes.error
    if (fabricsRes.error) throw fabricsRes.error
    if (requestsRes.error) throw requestsRes.error

    return {
      sales: salesRes.data,
      saleItems: saleItemsRes.data,
      batches: batchesRes.data,
      // Dashboard reads fabric.colorName / fabric.fabricType (camelCase) when
      // rendering Best-selling and Most-profitable — this row set was passed
      // through as raw snake_case, so both fields were always undefined and
      // only the (independently-computed) numbers on the right rendered.
      fabrics: fabricsRes.data.map((f) => ({ id: f.id, fabricType: f.fabric_type, colorName: f.color_name, sku: f.sku })),
      openRequests: requestsRes.data,
    }
  },

  // ---- customer requests (Phase 2: Demand Intelligence) ----
  // Uploads a swatch photo to Storage and returns its path (not a full URL —
  // the bucket is private, so callers fetch a signed URL when displaying it).
  async uploadRequestPhoto(file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
    const { error } = await supabase.storage.from('customer-request-photos').upload(path, file)
    if (error) throw error
    return path
  },

  async getRequestPhotoUrl(path) {
    if (!path) return null
    const { data, error } = await supabase.storage
      .from('customer-request-photos')
      .createSignedUrl(path, 60 * 60) // 1 hour, plenty for viewing in the admin panel
    if (error) throw error
    return data.signedUrl
  },

  // Creates a new customer request, or — if an open request already exists
  // for the same fabric_type + color_name (case-insensitive) — increments
  // its count instead of creating a duplicate. This is a simple, explainable
  // match, not AI-based; see schema comment for the reasoning.
  async recordCustomerRequest({ requestType, fabricId, fabricType, colorName, width, quantityRequested, photoUrl, customerName, customerPhone, warehouseId, notes }) {
    let existing = null
    if (fabricType && colorName) {
      const { data, error } = await supabase
        .from('customer_requests')
        .select('*')
        .eq('status', 'open')
        .ilike('fabric_type', fabricType)
        .ilike('color_name', colorName)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      existing = data
    }

    if (existing) {
      const { data, error } = await supabase
        .from('customer_requests')
        .update({
          request_count: existing.request_count + 1,
          last_requested_at: new Date().toISOString(),
          // Keep the most recent contact info if this request comes with one.
          customer_name: customerName || existing.customer_name,
          customer_phone: customerPhone || existing.customer_phone,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return { request: data, wasDuplicate: true }
    }

    const { data, error } = await supabase
      .from('customer_requests')
      .insert({
        request_type: requestType,
        fabric_id: fabricId || null,
        fabric_type: fabricType || null,
        color_name: colorName || null,
        width: width || null,
        quantity_requested: quantityRequested || null,
        photo_url: photoUrl || null,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        warehouse_id: warehouseId || null,
        notes: notes || null,
      })
      .select()
      .single()
    if (error) throw error
    return { request: data, wasDuplicate: false }
  },

  async fetchCustomerRequests() {
    const { data, error } = await supabase
      .from('customer_requests')
      .select('*')
      .order('last_requested_at', { ascending: false })
    if (error) throw error
    return data
  },

  async setCustomerRequestStatus(id, status) {
    const { data, error } = await supabase
      .from('customer_requests')
      .update({
        status,
        fulfilled_at: status === 'fulfilled' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ---- suppliers & procurement (Phase 3) ----
  async fetchSuppliers() {
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    if (error) throw error
    return data
  },

  async addSupplier({ name, phone, addressLine, notes, lat, lng, rating }) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ name, phone: phone || null, address_line: addressLine || null, notes: notes || null, lat: lat ?? null, lng: lng ?? null, rating: rating ?? null })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateSupplier(id, updates) {
    // Partial update on purpose: the inline rating edit in SuppliersAdmin
    // calls this with only { rating } (see Suppliers table), and the full
    // edit form calls it with every field. Only touch what was actually
    // passed — a naive "rebuild the whole row with ?? null fallbacks"
    // version would silently wipe phone/address/lat/lng/rating to null
    // whenever only one field is being changed.
    const patch = {}
    if ('name' in updates) patch.name = updates.name
    if ('phone' in updates) patch.phone = updates.phone || null
    if ('addressLine' in updates) patch.address_line = updates.addressLine || null
    if ('notes' in updates) patch.notes = updates.notes || null
    if ('lat' in updates) patch.lat = updates.lat ?? null
    if ('lng' in updates) patch.lng = updates.lng ?? null
    if ('rating' in updates) patch.rating = updates.rating ?? null // owner-only in the UI; also enforced server-side by suppliers_update_owner_only (schema_v6)

    const { data, error } = await supabase
      .from('suppliers')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) throw error
  },

  // ---- supplier orders (lead-time tracking, see schema_v9) ----
  async fetchSupplierOrders() {
    const { data, error } = await supabase.from('supplier_orders').select('*').order('ordered_at', { ascending: false })
    if (error) throw error
    return data
  },

  async logSupplierOrder(supplierId, { notes, createdBy } = {}) {
    const { data, error } = await supabase
      .from('supplier_orders')
      .insert({ supplier_id: supplierId, ordered_at: new Date().toISOString().slice(0, 10), notes: notes || null, created_by: createdBy || null })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async markSupplierOrderReceived(orderId) {
    const { data, error } = await supabase
      .from('supplier_orders')
      .update({ received_at: new Date().toISOString().slice(0, 10) })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Pulls everything the Purchase List / supplier-memory views need:
  // batches (for last price/date/supplier per fabric) and suppliers (for
  // display names). Sales data for the priority score is already fetched
  // separately via fetchDashboardMetrics — the Purchase List screen calls
  // both rather than duplicating that logic here.
  async fetchProcurementData() {
    const [batchesRes, suppliersRes] = await Promise.all([
      supabase.from('stock_batches').select('*').order('purchased_at', { ascending: false }),
      supabase.from('suppliers').select('*'),
    ])
    if (batchesRes.error) throw batchesRes.error
    if (suppliersRes.error) throw suppliersRes.error
    return { batches: batchesRes.data, suppliers: suppliersRes.data }
  },

  // ---- market mode (Phase 4) ----
  async fetchShoppingSessions() {
    const { data, error } = await supabase.from('shopping_sessions').select('*').order('started_at', { ascending: false })
    if (error) throw error
    return data
  },

  async createShoppingSession({ title, notes, createdBy, seedItems }) {
    const { data: session, error } = await supabase
      .from('shopping_sessions')
      .insert({ title, notes: notes || null, created_by: createdBy || null })
      .select()
      .single()
    if (error) throw error

    if (seedItems && seedItems.length > 0) {
      const rows = seedItems.map((item) => ({
        session_id: session.id,
        fabric_id: item.fabricId || null,
        fabric_type: item.fabricType || null,
        color_name: item.colorName || null,
        planned_quantity: item.plannedQuantity || null,
        supplier_id: item.supplierId || null,
        reason: item.reason || null,
        is_discovered: false,
      }))
      const { error: itemsError } = await supabase.from('shopping_items').insert(rows)
      if (itemsError) throw itemsError
    }

    return session
  },

  async fetchShoppingItems(sessionId) {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async addShoppingItem(sessionId, { fabricId, fabricType, colorName, plannedQuantity, supplierId, notes, isDiscovered }) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        session_id: sessionId,
        fabric_id: fabricId || null,
        fabric_type: fabricType || null,
        color_name: colorName || null,
        planned_quantity: plannedQuantity || null,
        supplier_id: supplierId || null,
        notes: notes || null,
        is_discovered: isDiscovered ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateShoppingItem(id, updates) {
    const patch = { updated_at: new Date().toISOString() }
    if ('status' in updates) patch.status = updates.status
    if ('actualQuantity' in updates) patch.actual_quantity = updates.actualQuantity
    if ('actualPricePerMeter' in updates) patch.actual_price_per_meter = updates.actualPricePerMeter
    if ('notes' in updates) patch.notes = updates.notes
    if ('supplierId' in updates) patch.supplier_id = updates.supplierId
    // Set when a "discovered" item (no catalog match) is marked purchased
    // and gets turned into a real fabrics row on the spot — see
    // ShoppingListRow. Without this, closeShoppingSession has no fabric
    // to build a stock batch against and silently skips the item, which
    // is why closing a trip could say "0 items added to inventory" even
    // after marking discovered items as purchased.
    if ('fabricId' in updates) patch.fabric_id = updates.fabricId

    const { data, error } = await supabase
      .from('shopping_items')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateShoppingSessionNotes(id, notes) {
    const { data, error } = await supabase
      .from('shopping_sessions')
      .update({ notes })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Closing a trip is the deliberate moment purchased/partial items become
  // real inventory — a new stock_batch per item (using the actual price
  // paid) plus a matching 'purchase' stock_movement. This intentionally
  // does NOT happen automatically as items are marked purchased while
  // shopping, so a correction mid-trip never touches real inventory data.
  async closeShoppingSession(sessionId, { warehouseId }) {
    const { data: items, error: itemsError } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('session_id', sessionId)
      .in('status', ['purchased', 'partial'])
    if (itemsError) throw itemsError

    // Closing used to be a one-shot action with no way back if an item
    // was missing data — the button disappeared once a trip was closed,
    // even though the whole point of reporting a skipped count (see
    // below) is that you might come back and fix something. Re-running
    // this needs to be safe, including if two closes happen close
    // together (a slow connection prompting an impatient second tap, or
    // genuinely coming back later to close again after fixing something).
    //
    // The previous version checked "does a stock_movement already exist
    // for this session+fabric" with a SELECT, then created the batch if
    // not — but a SELECT-then-INSERT check like that has a race: two
    // overlapping closes can both pass the check before either has
    // written anything, and both go on to create a batch. That's exactly
    // how "30m purchased" could turn into "60m in inventory" after
    // closing/reopening/closing again.
    //
    // Fixed by claiming the stock_movement row FIRST, protected by a real
    // database constraint (unique on (reference_id, fabric_id) for
    // movement_type='purchase' — see migration_2026-07-28.sql), and only
    // creating the stock_batch after that claim succeeds. A second,
    // overlapping close attempting the same claim gets a unique-violation
    // (Postgres error 23505) and is treated as "already handled," not an
    // error — so it's impossible for two batches to be created for the
    // same trip+fabric no matter how the close is retried.
    let batchesCreated = 0
    let skipped = 0
    const purchasedFabricIds = []
    for (const item of items) {
      if (!item.fabric_id || !item.actual_quantity || !item.actual_price_per_meter) {
        // Can't create a stock batch without a real fabric + real numbers
        // — this used to fail silently, which is why closing a trip could
        // report "0 items added" with no explanation. It's still possible
        // to hit this (e.g. "Meters bought" or "Price/m" left blank), but
        // now it's counted and reported instead of just vanishing, and
        // the trip stays re-closeable so this is fixable after the fact.
        skipped++
        continue
      }

      // Claim this trip+fabric before doing anything else. batch_id is
      // filled in right after; it's nullable specifically so this claim
      // can happen before a batch exists yet.
      const { error: claimError } = await supabase.from('stock_movements').insert({
        fabric_id: item.fabric_id,
        batch_id: null,
        warehouse_id: warehouseId,
        movement_type: 'purchase',
        meters: item.actual_quantity,
        reference_id: sessionId,
      })
      if (claimError) {
        if (claimError.code === '23505') {
          // Already claimed by an earlier (or concurrent) close for this
          // trip+fabric — this item was already turned into stock, skip it.
          purchasedFabricIds.push(item.fabric_id)
          continue
        }
        throw claimError
      }

      const { data: batch, error: batchError } = await supabase
        .from('stock_batches')
        .insert({
          fabric_id: item.fabric_id,
          warehouse_id: warehouseId,
          supplier_id: item.supplier_id || null,
          cost_per_meter: item.actual_price_per_meter,
          meters_purchased: item.actual_quantity,
          meters_remaining: item.actual_quantity,
          purchased_at: new Date().toISOString().slice(0, 10),
          notes: `From market trip: ${sessionId}`,
        })
        .select()
        .single()
      if (batchError) throw batchError

      const { error: linkError } = await supabase
        .from('stock_movements')
        .update({ batch_id: batch.id })
        .eq('reference_id', sessionId)
        .eq('fabric_id', item.fabric_id)
        .eq('movement_type', 'purchase')
      if (linkError) throw linkError

      purchasedFabricIds.push(item.fabric_id)
      batchesCreated++
    }

    const { data: session, error } = await supabase
      .from('shopping_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single()
    if (error) throw error
    return { session, batchesCreated, skipped, purchasedFabricIds }
  },

  // ---- AI fabric matching (Phase 6) ----
  // Photo upload happens directly from the browser to Storage (same
  // pattern as Phase 2's customer-request photos) — no Edge Function
  // needed for that part, since it's just a file upload with RLS
  // enforcing who can write to the bucket.
  async uploadFabricPhoto(file, fabricId) {
    // Storage keys don't tolerate every character a phone's camera app
    // might put in a file name (spaces are fine, but things like # ? %
    // and non-Latin characters can cause upload failures) — strip it down
    // to something safe rather than passing file.name through as-is.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${fabricId}-${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from('fabric-photos').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('fabric-photos').getPublicUrl(path)
    return data.publicUrl
  },

  // Triggers the embed-fabric Edge Function for a given fabric. This is
  // the part that actually needs a configured embedding provider — see
  // README, since as of writing no Replicate account/token has been set
  // up, so this will return a clear error until that's configured, not a
  // silent failure.
  async embedFabricPhoto(fabricId) {
    const { data, error } = await supabase.functions.invoke('embed-fabric', { body: { fabricId } })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  // Calls the match-fabric Edge Function. queryImageUrl should be a
  // signed/public URL the Edge Function can fetch — for a customer/staff
  // swatch photo captured in the browser, this means uploading it
  // somewhere reachable first (the caller in TextileApp.jsx handles this).
  async matchFabric({ queryImageUrl, queryHex, fabricTypeHint, inStockOnly }) {
    const { data, error } = await supabase.functions.invoke('match-fabric', {
      body: { queryImageUrl, queryHex, fabricTypeHint, inStockOnly },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  async recordMatchFeedback({ queryPhotoUrl, selectedFabricId, selectedRank, aiScore, createdBy }) {
    const { data, error } = await supabase
      .from('match_feedback')
      .insert({
        query_photo_url: queryPhotoUrl || null,
        selected_fabric_id: selectedFabricId,
        selected_rank: selectedRank,
        ai_score: aiScore ?? null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ---- AI business insights (Phase 7) ----
  // Thin wrapper around the generate-insights Edge Function. Returns the
  // raw {data, error} shape (not unwrapped) since api.js's generateInsights
  // needs to distinguish "the function call itself failed" from "the
  // function ran but returned an error payload" for its fallback logic.
  async generateInsights(facts) {
    return supabase.functions.invoke('generate-insights', { body: { facts } })
  },

  // ---- realtime ----
  // Every place in this app that changes stock (Record Sale, closing a Market
  // Mode trip, editing/deleting a fabric directly) already tells the UI to
  // refetch — but that only covers actions taken *in this browser tab*. If a
  // second device or a second staff login changes something, this tab's
  // in-memory `products`/dashboard state has no way to know unless it's
  // listening. This subscribes to Postgres changes on the given tables and
  // calls `onChange` (debounced by the caller) whenever any of them fire.
  // Requires the tables to be added to the supabase_realtime publication —
  // see the migration file's REALTIME section.
  subscribeToTableChanges(tables, onChange) {
    const channel = supabase.channel(`changes-${tables.join('-')}-${Math.random().toString(36).slice(2)}`)
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    }
    channel.subscribe()
    return () => supabase.removeChannel(channel)
  },
}
