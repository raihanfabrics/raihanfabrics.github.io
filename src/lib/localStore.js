// ---------------------------------------------------------------------------
// LOCAL DATA LAYER — used automatically when Supabase isn't configured yet,
// and also doubles as the offline cache once it is (see api.js). Everything
// here persists to localStorage so data survives a page refresh and works
// with no network connection at all, which matters for the PWA/offline goal.
//
// This mirrors the same function shapes as supabaseApi.js so the rest of
// the app never needs to know which backend is actually answering.
// ---------------------------------------------------------------------------

const KEYS = {
  products: 'swatchbook_products',
  wholesaleAccounts: 'swatchbook_wholesale_accounts',
  staffUsers: 'swatchbook_staff_users',
  session: 'swatchbook_session',
  batches: 'swatchbook_stock_batches',
  sales: 'swatchbook_sales',
  saleItems: 'swatchbook_sale_items',
  invoiceSeq: 'swatchbook_invoice_seq',
  customerRequests: 'swatchbook_customer_requests',
  suppliers: 'swatchbook_suppliers',
  shoppingSessions: 'swatchbook_shopping_sessions',
  shoppingItems: 'swatchbook_shopping_items',
  supplierOrders: 'swatchbook_supplier_orders',
  accountTransactions: 'swatchbook_account_transactions',
}

const seedProducts = [
  { id: 'p1', fabricType: 'Cotton', colorName: 'Ivory Bone', hex: '#EDE7D9', width: 44, gsm: 120, retailPrice: 180, wholesalePrice: 140, stockMeters: 320, sku: 'CTN-IVB-44' },
  { id: 'p2', fabricType: 'Cotton', colorName: 'Dust Rose', hex: '#C9A29A', width: 44, gsm: 120, retailPrice: 190, wholesalePrice: 145, stockMeters: 210, sku: 'CTN-DRS-44' },
  { id: 'p3', fabricType: 'Cotton', colorName: 'Slate Teal', hex: '#3E6B66', width: 58, gsm: 140, retailPrice: 210, wholesalePrice: 165, stockMeters: 95, sku: 'CTN-SLT-58' },
  { id: 'p4', fabricType: 'Georgette', colorName: 'Marigold', hex: '#E3A028', width: 44, gsm: 60, retailPrice: 260, wholesalePrice: 205, stockMeters: 140, sku: 'GRG-MRG-44' },
  { id: 'p5', fabricType: 'Georgette', colorName: 'Deep Wine', hex: '#5C1F2E', width: 44, gsm: 60, retailPrice: 260, wholesalePrice: 205, stockMeters: 60, sku: 'GRG-WIN-44' },
  { id: 'p6', fabricType: 'Crepe', colorName: 'Sage Grey', hex: '#9BA48F', width: 58, gsm: 90, retailPrice: 240, wholesalePrice: 190, stockMeters: 175, sku: 'CRP-SGE-58' },
  { id: 'p7', fabricType: 'Crepe', colorName: 'Charcoal', hex: '#3A3733', width: 58, gsm: 90, retailPrice: 240, wholesalePrice: 190, stockMeters: 8, sku: 'CRP-CHR-58' },
  { id: 'p8', fabricType: 'Chiffon', colorName: 'Blush Pink', hex: '#E9C6C2', width: 44, gsm: 40, retailPrice: 220, wholesalePrice: 172, stockMeters: 260, sku: 'CHF-BLP-44' },
  { id: 'p9', fabricType: 'Silk', colorName: 'Antique Gold', hex: '#B8923F', width: 44, gsm: 80, retailPrice: 620, wholesalePrice: 510, stockMeters: 40, sku: 'SLK-AGD-44' },
  { id: 'p10', fabricType: 'Linen', colorName: 'Natural Flax', hex: '#D8C9A3', width: 58, gsm: 160, retailPrice: 310, wholesalePrice: 245, stockMeters: 130, sku: 'LIN-FLX-58' },
  { id: 'p11', fabricType: 'Linen', colorName: 'Storm Blue', hex: '#4C5B6B', width: 58, gsm: 160, retailPrice: 320, wholesalePrice: 250, stockMeters: 0, sku: 'LIN-STB-58' },
  { id: 'p12', fabricType: 'Georgette', colorName: 'Emerald', hex: '#1F5B44', width: 44, gsm: 60, retailPrice: 265, wholesalePrice: 208, stockMeters: 88, sku: 'GRG-EMR-44' },
]

const seedWholesaleAccounts = [
  {
    id: 'w1', status: 'approved', businessName: 'Meera Boutique & Tailoring', ownerName: 'Meera Nair',
    phone: '+93 70 123 4567', password: 'meera123',
    address: { line: 'Shop 14, Commercial Complex', landmark: 'Opposite City Bus Stand', lat: 34.5553, lng: 69.2075 },
    requestedAt: '2026-06-02',
  },
  {
    id: 'w2', status: 'pending', businessName: 'Al-Noor Fabrics Trading', ownerName: 'Farhan Ahmed',
    phone: '+93 79 234 5678', password: 'noor2026',
    address: { line: '12/4 Textile Market, 2nd Floor', landmark: 'Near Jama Masjid Gate 3', lat: 34.3529, lng: 62.2042 },
    requestedAt: '2026-07-15',
  },
]

const seedStaffUsers = [
  { id: 's1', username: 'owner', password: 'owner123', role: 'owner', name: 'Shop Owner' },
  { id: 's2', username: 'staff1', password: 'staff123', role: 'staff', name: 'Ayesha' },
]

// Two demo suppliers so Phase 3's supplier-memory view has something to
// show without requiring the shop to enter real suppliers first.
const seedSuppliers = [
  { id: 'sup1', name: 'Kabul Textile Traders', phone: '+93 70 200 1000', addressLine: 'Mandawi Market, Kabul', notes: 'Reliable for cotton and linen. Good bulk discounts above 20 rolls.', lat: 34.5580, lng: 69.2088 },
  { id: 'sup2', name: 'Herat Fabric House', phone: '+93 79 300 2000', addressLine: 'Herat Textile Bazaar', notes: 'Best source for silk and georgette.', lat: null, lng: null },
]

// One opening stock batch per seed product, so local/demo mode has real
// cost data for dashboard math from the start. Cost is approximated as
// 80% of wholesale price (a plausible margin) since the original seed
// products never recorded an actual purchase cost. Suppliers are assigned
// by alternating through the seed suppliers, purely so demo data has
// supplier-memory info to display.
function seedBatchesFromProducts() {
  return seedProducts
    .filter((p) => p.stockMeters > 0)
    .map((p, i) => ({
      id: 'b_' + p.id,
      fabricId: p.id,
      warehouseId: 'wh1',
      supplierId: seedSuppliers[i % seedSuppliers.length].id,
      costPerMeter: Math.round(p.wholesalePrice * 0.8),
      metersPurchased: p.stockMeters,
      metersRemaining: p.stockMeters,
      purchasedAt: '2026-05-01',
    }))
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — fail silently,
    // data just won't persist across refreshes in that case.
  }
}

function ensureSeeded() {
  if (read(KEYS.products, null) === null) write(KEYS.products, seedProducts)
  if (read(KEYS.wholesaleAccounts, null) === null) write(KEYS.wholesaleAccounts, seedWholesaleAccounts)
  if (read(KEYS.staffUsers, null) === null) write(KEYS.staffUsers, seedStaffUsers)
  if (read(KEYS.batches, null) === null) write(KEYS.batches, seedBatchesFromProducts())
  if (read(KEYS.sales, null) === null) write(KEYS.sales, [])
  if (read(KEYS.saleItems, null) === null) write(KEYS.saleItems, [])
  if (read(KEYS.invoiceSeq, null) === null) write(KEYS.invoiceSeq, 1)
  if (read(KEYS.customerRequests, null) === null) write(KEYS.customerRequests, [])
  if (read(KEYS.suppliers, null) === null) write(KEYS.suppliers, seedSuppliers)
  if (read(KEYS.shoppingSessions, null) === null) write(KEYS.shoppingSessions, [])
  if (read(KEYS.shoppingItems, null) === null) write(KEYS.shoppingItems, [])
}

ensureSeeded()

function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

// Local mirror of supabaseApi.js's adjustFabricStock — see that file for
// the full "why". Same idea, just synchronous against localStorage
// instead of a DB trigger: reconciles a fabric's stock at the batch
// level (stock_batches, not the denormalized stockMeters field) so a
// manual edit isn't silently reverted the next time a sale or purchase
// recomputes stockMeters from the batches.
function adjustFabricStockLocal(fabricId, targetMeters, note) {
  const target = Number(targetMeters)
  if (!Number.isFinite(target) || target < 0) return

  const batches = read(KEYS.batches, [])
  const fabricBatches = batches
    .filter((b) => b.fabricId === fabricId)
    .sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt))
  const currentTotal = fabricBatches.reduce((sum, b) => sum + Number(b.metersRemaining), 0)
  const delta = target - currentTotal
  if (delta === 0) return

  if (delta > 0) {
    // Opens a zero-cost "adjustment" batch for the difference, same as
    // supabaseApi's version — keeps FIFO cost-of-goods on real purchases
    // honest instead of inventing a purchase price for a manual count fix.
    batches.push({
      id: uid('b'),
      fabricId,
      warehouseId: null,
      supplierId: null,
      costPerMeter: 0,
      metersPurchased: delta,
      metersRemaining: delta,
      purchasedAt: new Date().toISOString().slice(0, 10),
      notes: note || 'Manual inventory count adjustment',
    })
  } else {
    // Draws the difference down from existing batches oldest-first, same
    // FIFO order used for sales.
    let toRemove = -delta
    for (const batch of fabricBatches) {
      if (toRemove <= 0) break
      const remove = Math.min(Number(batch.metersRemaining), toRemove)
      if (remove <= 0) continue
      batch.metersRemaining -= remove
      toRemove -= remove
    }
  }
  write(KEYS.batches, batches)

  const products = read(KEYS.products, [])
  const total = batches.filter((b) => b.fabricId === fabricId).reduce((sum, b) => sum + Number(b.metersRemaining), 0)
  write(KEYS.products, products.map((p) => (p.id === fabricId ? { ...p, stockMeters: total } : p)))
}

export const localApi = {
  // ---- session ----
  getSession() {
    return read(KEYS.session, null)
  },
  setSession(session) {
    write(KEYS.session, session)
  },
  clearSession() {
    localStorage.removeItem(KEYS.session)
  },

  // Local mode has no real warehouses table — 'wh1' is just a plain string
  // ID here, which is fine since localStorage doesn't type-check it.
  async getDefaultWarehouseId() {
    return 'wh1'
  },

  // ---- staff auth ----
  async staffSignIn(username, password) {
    const users = read(KEYS.staffUsers, [])
    const user = users.find((u) => u.username === username && u.password === password)
    if (!user) throw new Error('invalid_credentials')
    const session = { type: 'staff', user: { id: user.id, username: user.username, role: user.role, name: user.name } }
    this.setSession(session)
    return session.user
  },

  // ---- wholesale auth ----
  async wholesaleSignUp({ businessName, ownerName, phone, password, address }) {
    const accounts = read(KEYS.wholesaleAccounts, [])
    if (accounts.some((a) => a.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''))) {
      throw new Error('phone_already_registered')
    }
    const account = {
      id: uid('w'), status: 'pending', businessName, ownerName, phone, password, address,
      requestedAt: new Date().toISOString().slice(0, 10),
    }
    write(KEYS.wholesaleAccounts, [...accounts, account])
    return account
  },

  async wholesaleSignIn(phone, password) {
    const accounts = read(KEYS.wholesaleAccounts, [])
    const account = accounts.find(
      (a) => a.phone.replace(/\s/g, '') === phone.replace(/\s/g, '') && a.password === password
    )
    if (!account) throw new Error('invalid_credentials')
    const session = { type: 'wholesale', user: account }
    this.setSession(session)
    return account
  },

  // ---- products ----
  async fetchProducts() {
    return read(KEYS.products, [])
  },
  async addProduct(product) {
    const products = read(KEYS.products, [])
    const openingStock = Number(product.stockMeters) || 0
    const withId = { ...product, id: uid('p'), stockMeters: 0 } // stock established via adjustFabricStockLocal below
    write(KEYS.products, [...products, withId])
    if (openingStock > 0) {
      adjustFabricStockLocal(withId.id, openingStock, 'Opening stock')
    }
    return read(KEYS.products, []).find((p) => p.id === withId.id)
  },
  async updateProduct(id, updates) {
    // stockMeters is NEVER merged in directly here — see
    // adjustFabricStockLocal below (mirrors supabaseApi.js's
    // adjustFabricStock and the reasoning in its comments: writing the
    // number straight onto the product gets silently overwritten the next
    // time a sale or purchase recomputes stockMeters from stock_batches).
    const hasStockChange = 'stockMeters' in updates && updates.stockMeters !== undefined && updates.stockMeters !== null && updates.stockMeters !== ''
    const patch = { ...updates }
    delete patch.stockMeters

    const products = read(KEYS.products, [])
    const next = products.map((p) => (p.id === id ? { ...p, ...patch } : p))
    write(KEYS.products, next)

    if (hasStockChange) {
      adjustFabricStockLocal(id, Number(updates.stockMeters), 'Manual inventory edit')
    }
    return read(KEYS.products, []).find((p) => p.id === id)
  },
  // Mirrors supabaseApi's behavior: a fabric with sale or purchase history
  // (rows in local sale_items/stock_batches referencing it) can't be safely
  // erased without breaking that history, so it's archived instead of
  // removed. See supabaseApi.js's deleteProduct for the full reasoning.
  async deleteProduct(id) {
    const hasHistory =
      read(KEYS.saleItems, []).some((i) => i.fabricId === id) ||
      read(KEYS.batches, []).some((b) => b.fabricId === id)
    const products = read(KEYS.products, [])
    if (hasHistory) {
      write(KEYS.products, products.map((p) => (p.id === id ? { ...p, isActive: false } : p)))
      return { archived: true }
    }
    write(KEYS.products, products.filter((p) => p.id !== id))
    return { archived: false }
  },
  async restoreProduct(id) {
    const products = read(KEYS.products, [])
    const updated = products.map((p) => (p.id === id ? { ...p, isActive: true } : p))
    write(KEYS.products, updated)
    return updated.find((p) => p.id === id)
  },

  // No-op in local mode: there's only ever one tab/device sharing this
  // localStorage, so the in-memory state it already has is never stale in
  // the way a second real client could make it stale in Supabase mode.
  subscribeToTableChanges(_tables, _onChange) {
    return () => {}
  },

  // ---- wholesale accounts (admin side) ----
  async fetchWholesaleAccounts() {
    return read(KEYS.wholesaleAccounts, [])
  },
  async setWholesaleStatus(id, status) {
    const accounts = read(KEYS.wholesaleAccounts, [])
    const next = accounts.map((a) => (a.id === id ? { ...a, status } : a))
    write(KEYS.wholesaleAccounts, next)
    return next.find((a) => a.id === id)
  },
  // No auth.users row to worry about in local mode — just remove the row.
  // The owner-only permission check itself happens in the UI (canManage),
  // same as approve/reject already do in local mode.
  async deleteWholesaleAccount(id) {
    const accounts = read(KEYS.wholesaleAccounts, [])
    write(KEYS.wholesaleAccounts, accounts.filter((a) => a.id !== id))
    return { deleted: true }
  },

  // ---- credit ledger (fully manual, decoupled from sales — see schema_v11) ----
  async fetchAccountTransactions() {
    return read(KEYS.accountTransactions, []).slice().sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
  },

  async logAccountTransaction(wholesaleAccountId, { type, amount, notes }) {
    const tx = { id: uid('tx'), wholesaleAccountId, type, amount: Number(amount), occurredAt: new Date().toISOString().slice(0, 10), notes: notes || null }
    write(KEYS.accountTransactions, [...read(KEYS.accountTransactions, []), tx])
    return tx
  },

  async deleteAccountTransactionsForAccount(wholesaleAccountId) {
    write(KEYS.accountTransactions, read(KEYS.accountTransactions, []).filter((tx) => tx.wholesaleAccountId !== wholesaleAccountId))
  },

  // ---- sales (Phase 1: BI foundation) ----
  // Mirrors supabaseApi.js's FIFO batch-consumption logic so local mode
  // produces the same shape of data for the dashboard to read.
  async recordSale({ warehouseId, salespersonId, customerName, customerPhone, wholesaleAccountId, paymentMethod, paymentStatus, amountPaid, discountTotal, notes, items }) {
    const seq = read(KEYS.invoiceSeq, 1)
    write(KEYS.invoiceSeq, seq + 1)

    const sale = {
      id: uid('sale'),
      invoiceNumber: 'INV-' + String(seq).padStart(6, '0'),
      soldAt: new Date().toISOString(),
      warehouseId: warehouseId || 'wh1',
      salespersonId: salespersonId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      wholesaleAccountId: wholesaleAccountId || null,
      paymentMethod,
      paymentStatus,
      amountPaid: paymentStatus === 'partial' ? Number(amountPaid) : null,
      discountTotal: discountTotal || 0,
      notes: notes || null,
    }

    const batches = read(KEYS.batches, [])
    const newSaleItems = []

    for (const item of items) {
      let metersToFulfill = item.meters
      const fabricBatches = batches
        .filter((b) => b.fabricId === item.fabricId && b.metersRemaining > 0)
        .sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt))

      for (const batch of fabricBatches) {
        if (metersToFulfill <= 0) break
        const drawn = Math.min(batch.metersRemaining, metersToFulfill)

        newSaleItems.push({
          id: uid('si'),
          saleId: sale.id,
          fabricId: item.fabricId,
          batchId: batch.id,
          meters: drawn,
          unitPrice: item.unitPrice,
          unitCost: batch.costPerMeter,
          discount: item.discount || 0,
        })

        batch.metersRemaining -= drawn
        metersToFulfill -= drawn
      }
      // If metersToFulfill > 0 here, recorded stock didn't cover the sale —
      // same caveat as supabaseApi.js: the sale is still recorded.
    }

    write(KEYS.batches, batches)
    write(KEYS.sales, [sale, ...read(KEYS.sales, [])])
    write(KEYS.saleItems, [...read(KEYS.saleItems, []), ...newSaleItems])

    // Keep the product's displayed stockMeters roughly in sync for the
    // existing inventory UI, which still reads stockMeters directly.
    const products = read(KEYS.products, [])
    const totalsByFabric = {}
    for (const b of batches) {
      totalsByFabric[b.fabricId] = (totalsByFabric[b.fabricId] || 0) + b.metersRemaining
    }
    write(KEYS.products, products.map((p) =>
      totalsByFabric[p.id] !== undefined ? { ...p, stockMeters: totalsByFabric[p.id] } : p
    ))

    return sale
  },

  async fetchDashboardMetrics() {
    return {
      sales: read(KEYS.sales, []),
      saleItems: read(KEYS.saleItems, []),
      batches: read(KEYS.batches, []),
      fabrics: read(KEYS.products, []).map((p) => ({
        id: p.id, fabricType: p.fabricType, colorName: p.colorName, sku: p.sku,
      })),
      openRequests: read(KEYS.customerRequests, []).filter((r) => r.status === 'open'),
    }
  },

  // ---- customer requests (Phase 2: Demand Intelligence) ----
  // Local mode has no Storage bucket, so photos are kept as data URLs
  // directly in localStorage — fine for a single-device demo, but this is
  // exactly the DB-bloat tradeoff Supabase mode avoids by using real file
  // storage. See README.
  async uploadRequestPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Could not read photo'))
      reader.readAsDataURL(file)
    })
  },

  async getRequestPhotoUrl(path) {
    return path // already a usable data URL in local mode
  },

  async recordCustomerRequest({ requestType, fabricId, fabricType, colorName, width, quantityRequested, photoUrl, customerName, customerPhone, warehouseId, notes }) {
    const requests = read(KEYS.customerRequests, [])
    const norm = (s) => (s || '').trim().toLowerCase()

    const existing = fabricType && colorName
      ? requests.find((r) => r.status === 'open' && norm(r.fabricType) === norm(fabricType) && norm(r.colorName) === norm(colorName))
      : null

    if (existing) {
      existing.requestCount += 1
      existing.lastRequestedAt = new Date().toISOString()
      if (customerName) existing.customerName = customerName
      if (customerPhone) existing.customerPhone = customerPhone
      write(KEYS.customerRequests, requests)
      return { request: existing, wasDuplicate: true }
    }

    const request = {
      id: uid('req'),
      requestType,
      fabricId: fabricId || null,
      fabricType: fabricType || null,
      colorName: colorName || null,
      width: width || null,
      quantityRequested: quantityRequested || null,
      photoUrl: photoUrl || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      warehouseId: warehouseId || null,
      notes: notes || null,
      requestCount: 1,
      status: 'open',
      firstRequestedAt: new Date().toISOString(),
      lastRequestedAt: new Date().toISOString(),
      fulfilledAt: null,
      notifiedCustomer: false,
    }
    write(KEYS.customerRequests, [request, ...requests])
    return { request, wasDuplicate: false }
  },

  async fetchCustomerRequests() {
    return read(KEYS.customerRequests, [])
      .slice()
      .sort((a, b) => new Date(b.lastRequestedAt) - new Date(a.lastRequestedAt))
  },

  async setCustomerRequestStatus(id, status) {
    const requests = read(KEYS.customerRequests, [])
    const next = requests.map((r) =>
      r.id === id ? { ...r, status, fulfilledAt: status === 'fulfilled' ? new Date().toISOString() : null } : r
    )
    write(KEYS.customerRequests, next)
    return next.find((r) => r.id === id)
  },

  // ---- suppliers & procurement (Phase 3) ----
  async fetchSuppliers() {
    return read(KEYS.suppliers, []).slice().sort((a, b) => a.name.localeCompare(b.name))
  },

  async addSupplier({ name, phone, addressLine, notes, lat, lng, rating }) {
    const supplier = { id: uid('sup'), name, phone: phone || null, addressLine: addressLine || null, notes: notes || null, lat: lat ?? null, lng: lng ?? null, rating: rating ?? null }
    write(KEYS.suppliers, [...read(KEYS.suppliers, []), supplier])
    return supplier
  },

  // Partial update on purpose — see supabaseApi.js's updateSupplier for
  // why (the inline rating edit only sends { rating }, and a naive
  // "always fall back to null" merge would wipe other fields).
  async updateSupplier(id, updates) {
    const suppliers = read(KEYS.suppliers, [])
    const patch = {}
    if ('name' in updates) patch.name = updates.name
    if ('phone' in updates) patch.phone = updates.phone || null
    if ('addressLine' in updates) patch.addressLine = updates.addressLine || null
    if ('notes' in updates) patch.notes = updates.notes || null
    if ('lat' in updates) patch.lat = updates.lat ?? null
    if ('lng' in updates) patch.lng = updates.lng ?? null
    if ('rating' in updates) patch.rating = updates.rating ?? null
    const next = suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s))
    write(KEYS.suppliers, next)
    return next.find((s) => s.id === id)
  },

  async deleteSupplier(id) {
    write(KEYS.suppliers, read(KEYS.suppliers, []).filter((s) => s.id !== id))
  },

  // ---- supplier orders (lead-time tracking) ----
  async fetchSupplierOrders() {
    return read(KEYS.supplierOrders, []).slice().sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt))
  },

  async logSupplierOrder(supplierId, { notes } = {}) {
    const order = { id: uid('so'), supplierId, orderedAt: new Date().toISOString().slice(0, 10), receivedAt: null, notes: notes || null }
    write(KEYS.supplierOrders, [...read(KEYS.supplierOrders, []), order])
    return order
  },

  async markSupplierOrderReceived(orderId) {
    const orders = read(KEYS.supplierOrders, [])
    const next = orders.map((o) => (o.id === orderId ? { ...o, receivedAt: new Date().toISOString().slice(0, 10) } : o))
    write(KEYS.supplierOrders, next)
    return next.find((o) => o.id === orderId)
  },

  async fetchProcurementData() {
    return {
      batches: read(KEYS.batches, []).slice().sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt)),
      suppliers: read(KEYS.suppliers, []),
    }
  },

  // ---- market mode (Phase 4) ----
  // Local mode has no real network to lose, so there's no outbox here —
  // it's already "offline" by definition. The outbox pattern (see
  // marketOutbox.js) only wraps the Supabase-mode calls, where a real
  // connection can actually drop mid-trip.
  async fetchShoppingSessions() {
    return read(KEYS.shoppingSessions, []).slice().sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  },

  async createShoppingSession({ title, notes, createdBy, seedItems }) {
    const session = {
      id: uid('trip'),
      title,
      status: 'open',
      notes: notes || null,
      createdBy: createdBy || null,
      startedAt: new Date().toISOString(),
      closedAt: null,
    }
    write(KEYS.shoppingSessions, [session, ...read(KEYS.shoppingSessions, [])])

    if (seedItems && seedItems.length > 0) {
      const items = seedItems.map((item) => ({
        id: uid('item'),
        sessionId: session.id,
        fabricId: item.fabricId || null,
        fabricType: item.fabricType || null,
        colorName: item.colorName || null,
        plannedQuantity: item.plannedQuantity || null,
        status: 'planned',
        actualQuantity: null,
        actualPricePerMeter: null,
        supplierId: item.supplierId || null,
        reason: item.reason || null,
        isDiscovered: false,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      write(KEYS.shoppingItems, [...read(KEYS.shoppingItems, []), ...items])
    }

    return session
  },

  async fetchShoppingItems(sessionId) {
    return read(KEYS.shoppingItems, [])
      .filter((i) => i.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  },

  async addShoppingItem(sessionId, { fabricId, fabricType, colorName, plannedQuantity, supplierId, notes, isDiscovered }) {
    const item = {
      id: uid('item'),
      sessionId,
      fabricId: fabricId || null,
      fabricType: fabricType || null,
      colorName: colorName || null,
      plannedQuantity: plannedQuantity || null,
      status: 'planned',
      actualQuantity: null,
      actualPricePerMeter: null,
      supplierId: supplierId || null,
      reason: null,
      isDiscovered: isDiscovered ?? true,
      notes: notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    write(KEYS.shoppingItems, [...read(KEYS.shoppingItems, []), item])
    return item
  },

  async updateShoppingItem(id, updates) {
    const items = read(KEYS.shoppingItems, [])
    const next = items.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i))
    write(KEYS.shoppingItems, next)
    return next.find((i) => i.id === id)
  },

  async updateShoppingSessionNotes(id, notes) {
    const sessions = read(KEYS.shoppingSessions, [])
    const next = sessions.map((s) => (s.id === id ? { ...s, notes } : s))
    write(KEYS.shoppingSessions, next)
    return next.find((s) => s.id === id)
  },

  async closeShoppingSession(sessionId, { warehouseId }) {
    const items = read(KEYS.shoppingItems, []).filter((i) => i.sessionId === sessionId && (i.status === 'purchased' || i.status === 'partial'))
    const batches = read(KEYS.batches, [])
    // Re-closeable, same reasoning as the Supabase version: track which
    // fabrics were already turned into a batch for THIS trip so a second
    // close (after fixing a skipped item) doesn't double them up. Local
    // mode runs single-threaded in one browser tab, so (unlike Supabase)
    // there's no race between concurrent closes to guard against — this
    // synchronous check is sufficient here.
    const alreadyProcessed = new Set(batches.filter((b) => b.tripSessionId === sessionId).map((b) => b.fabricId))
    let batchesCreated = 0
    let skipped = 0
    const purchasedFabricIds = []

    for (const item of items) {
      if (alreadyProcessed.has(item.fabricId)) { purchasedFabricIds.push(item.fabricId); continue }
      if (!item.fabricId || !item.actualQuantity || !item.actualPricePerMeter) { skipped += 1; continue }
      const batch = {
        id: uid('b'),
        fabricId: item.fabricId,
        warehouseId: warehouseId || 'wh1',
        supplierId: item.supplierId || null,
        costPerMeter: item.actualPricePerMeter,
        metersPurchased: item.actualQuantity,
        metersRemaining: item.actualQuantity,
        purchasedAt: new Date().toISOString().slice(0, 10),
        tripSessionId: sessionId,
      }
      batches.push(batch)
      purchasedFabricIds.push(item.fabricId)
      batchesCreated += 1
    }
    write(KEYS.batches, batches)

    // Keep displayed stockMeters in sync, same approach as recordSale.
    const products = read(KEYS.products, [])
    const totalsByFabric = {}
    for (const b of batches) {
      totalsByFabric[b.fabricId] = (totalsByFabric[b.fabricId] || 0) + b.metersRemaining
    }
    write(KEYS.products, products.map((p) =>
      totalsByFabric[p.id] !== undefined ? { ...p, stockMeters: totalsByFabric[p.id] } : p
    ))

    const sessions = read(KEYS.shoppingSessions, [])
    const next = sessions.map((s) => (s.id === sessionId ? { ...s, status: 'closed', closedAt: new Date().toISOString() } : s))
    write(KEYS.shoppingSessions, next)

    return { session: next.find((s) => s.id === sessionId), batchesCreated, skipped, purchasedFabricIds }
  },

  // ---- AI fabric matching (Phase 6) ----
  // Local mode has no server to run real SigLIP inference on, and no
  // Storage bucket for fabric photos — it stores photos as data URLs, same
  // pattern as Phase 2's customer-request photos in local mode. There is
  // no local embedding step at all: matchFabric() below always falls back
  // to Delta-E color-only matching, and says so via aiAvailable: false,
  // rather than pretending to run AI it can't actually run offline.
  async uploadFabricPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Could not read photo'))
      reader.readAsDataURL(file)
    })
  },

  async embedFabricPhoto(_fabricId) {
    throw new Error('AI embedding requires the Supabase backend and a configured embedding provider — not available in local mode. See README, Phase 6.')
  },

  async matchFabric({ queryHex, fabricTypeHint, inStockOnly, products }) {
    // Mirrors the Delta-E-only fallback branch of the match-fabric Edge
    // Function exactly, so local-mode results are consistent with what
    // Supabase mode falls back to when no embedding is available.
    const candidates = products
      .filter((p) => !inStockOnly || Number(p.stockMeters) > 0)
      .map((p) => {
        const colorScore = queryHex ? 1 - Math.min(1, clientDeltaE(clientHexToLab(queryHex), clientHexToLab(p.hex)) / 100) : 0
        const metadataScore = fabricTypeHint && p.fabricType === fabricTypeHint ? 1 : 0
        const fallbackTotal = 0.2 + 0.1 // same WEIGHT_COLOR + WEIGHT_METADATA as match-fabric/index.ts
        const score = (colorScore * 0.2 + metadataScore * 0.1) / fallbackTotal
        return { fabricId: p.id, fabricType: p.fabricType, colorName: p.colorName, hex: p.hex, width: p.width, gsm: p.gsm, stockMeters: p.stockMeters, sku: p.sku, photoUrl: p.photoUrl, score, usedAi: false }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    return { results: candidates, aiAvailable: false }
  },

  async recordMatchFeedback({ queryPhotoUrl, selectedFabricId, selectedRank, aiScore, createdBy }) {
    const feedback = { id: uid('fb'), queryPhotoUrl: queryPhotoUrl || null, selectedFabricId, selectedRank, aiScore: aiScore ?? null, createdBy: createdBy || null, createdAt: new Date().toISOString() }
    const key = 'swatchbook_match_feedback'
    write(key, [...read(key, []), feedback])
    return feedback
  },
}

// Duplicated (not imported) from the LAB/Delta-E math in TextileApp.jsx,
// same reasoning as match-fabric/index.ts: this file has no dependency on
// the React component file. Verified numerically identical — see the
// Phase 6 notes in README.
function clientHexToLab(hex) {
  const m = hex.replace('#', '').match(/.{1,2}/g)
  const r = parseInt(m[0], 16), g = parseInt(m[1], 16), b = parseInt(m[2], 16)
  let [rr, gg, bb] = [r, g, b].map((v) => {
    v = v / 255
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  })
  rr *= 100; gg *= 100; bb *= 100
  const x = rr * 0.4124 + gg * 0.3576 + bb * 0.1805
  const y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722
  const z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505
  const ref = { x: 95.047, y: 100.0, z: 108.883 }
  let [xr, yr, zr] = [x / ref.x, y / ref.y, z / ref.z].map((v) => (v > 0.008856 ? Math.pow(v, 1 / 3) : 7.787 * v + 16 / 116))
  return { l: 116 * yr - 16, a: 500 * (xr - yr), b: 200 * (yr - zr) }
}
function clientDeltaE(lab1, lab2) {
  return Math.sqrt((lab1.l - lab2.l) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2)
}
