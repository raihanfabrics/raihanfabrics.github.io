// -----------------------------------------------------------------------------
// INSIGHT FACTS (Phase 7)
//
// This is the source of truth for AI Business Insights — it decides WHAT
// is true. The generate-insights Edge Function only decides HOW to phrase
// it. Keeping these separate is deliberate: if fact-generation and
// phrasing were combined into one LLM call, a hallucinated trend could
// reach a merchant's purchasing decisions indistinguishably from a real
// one. Here, every fact is a plain string built from arithmetic already
// tested in Phases 1 and 5 (Dashboard/Trends) — nothing here is invented
// or inferred by a model.
//
// EVIDENCE THRESHOLDS: each fact type only fires above a minimum data bar
// (see the MIN_* constants below), so a shop with two weeks of history
// doesn't get a confident-sounding "trending up" claim built on noise.
// This mirrors Phase 5's approach to forecasting (MIN_WEEKS_FOR_FORECAST)
// and Trends' "not enough history yet" messaging — Phase 7 inherits that
// same discipline rather than resetting it.
//
// This module is used identically whether facts end up narrated by an LLM
// (Supabase mode) or shown as a plain list (local mode / no LLM
// configured) — see the Insights component in TextileApp.jsx.
// -----------------------------------------------------------------------------

const MIN_WEEKS_COMPARISON = 4       // weeks of history needed before comparing recent vs prior periods
const MIN_METERS_FOR_TREND = 10      // minimum meters sold before calling something a "trend" rather than noise
const DEAD_STOCK_FACT_DAYS = 90      // matches Dashboard's deadStockDays default
const LOW_STOCK_RUNOUT_DAYS = 14     // "will likely run out within N days" threshold

export function buildInsightFacts({ sales, saleItems, fabrics, products }) {
  const facts = [];
  const saleById = Object.fromEntries(sales.map((s) => [s.id, s]));
  const fabricById = Object.fromEntries(fabrics.map((f) => [f.id, f]));

  function itemDate(item) {
    const sale = saleById[item.saleId ?? item.sale_id];
    return sale ? new Date(sale.soldAt ?? sale.sold_at) : null;
  }
  function itemRevenue(item) {
    return Number(item.meters) * Number(item.unitPrice ?? item.unit_price) - Number(item.discount || 0);
  }

  const now = new Date();
  const allDates = saleItems.map(itemDate).filter(Boolean);
  if (allDates.length === 0) return facts; // nothing to say yet — see file header

  const earliestDate = new Date(Math.min(...allDates));
  const daysOfHistory = Math.floor((now - earliestDate) / (1000 * 60 * 60 * 24));

  // --- Fact: overall revenue trend (this month vs last month) ---
  if (daysOfHistory >= MIN_WEEKS_COMPARISON * 7) {
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = saleItems.filter((i) => itemDate(i) >= startOfThisMonth).reduce((s, i) => s + itemRevenue(i), 0);
    const lastMonth = saleItems.filter((i) => { const d = itemDate(i); return d >= startOfLastMonth && d < startOfThisMonth; }).reduce((s, i) => s + itemRevenue(i), 0);
    if (lastMonth > 0) {
      const pctChange = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
      if (Math.abs(pctChange) >= 5) { // ignore noise-level changes under 5%
        facts.push(`Revenue this month is ${pctChange >= 0 ? "up" : "down"} ${Math.abs(pctChange)}% compared to last month (${Math.round(thisMonth)} vs ${Math.round(lastMonth)}).`);
      }
    }
  }

  // --- Fact: per-fabric recent-vs-prior velocity (rising/falling demand) ---
  // Compares the last 30 days to the 30 days before that, per fabric.
  // Only fires when there's enough history to have two full comparison
  // windows and enough volume to not be noise.
  if (daysOfHistory >= 60) {
    const last30Start = new Date(now); last30Start.setDate(now.getDate() - 30);
    const prev30Start = new Date(now); prev30Start.setDate(now.getDate() - 60);
    const recentByFabric = {};
    const priorByFabric = {};
    for (const item of saleItems) {
      const d = itemDate(item);
      if (!d) continue;
      const fid = item.fabricId ?? item.fabric_id;
      if (d >= last30Start) recentByFabric[fid] = (recentByFabric[fid] || 0) + Number(item.meters);
      else if (d >= prev30Start) priorByFabric[fid] = (priorByFabric[fid] || 0) + Number(item.meters);
    }
    const risingCandidates = Object.entries(recentByFabric)
      .filter(([fid, recent]) => recent >= MIN_METERS_FOR_TREND)
      .map(([fid, recent]) => {
        const prior = priorByFabric[fid] || 0;
        const change = prior > 0 ? (recent - prior) / prior : (recent >= MIN_METERS_FOR_TREND ? 1 : 0);
        return { fabric: fabricById[fid], recent, prior, change };
      })
      .filter((r) => r.fabric && r.change >= 0.3) // at least 30% up, and prior wasn't already zero-noise
      .sort((a, b) => b.change - a.change)
      .slice(0, 2); // cap how many "rising demand" facts get surfaced, to avoid a wall of similar claims

    for (const r of risingCandidates) {
      facts.push(`${r.fabric.colorName} ${r.fabric.fabricType} demand is increasing — ${Math.round(r.recent)}m sold in the last 30 days vs ${Math.round(r.prior)}m the 30 days before.`);
    }
  }

  // --- Fact: dead stock (hasn't sold in DEAD_STOCK_FACT_DAYS+ days) ---
  const perFabricLastSale = {};
  for (const item of saleItems) {
    const d = itemDate(item);
    if (!d) continue;
    const fid = item.fabricId ?? item.fabric_id;
    if (!perFabricLastSale[fid] || d > perFabricLastSale[fid]) perFabricLastSale[fid] = d;
  }
  const deadStockCutoff = new Date(now); deadStockCutoff.setDate(now.getDate() - DEAD_STOCK_FACT_DAYS);
  const deadStockItems = products
    .filter((p) => Number(p.stockMeters) > 0)
    .map((p) => ({ product: p, lastSale: perFabricLastSale[p.id] || null }))
    .filter((r) => r.lastSale && r.lastSale < deadStockCutoff) // only fabrics with a KNOWN last-sale date, not ones that simply have no history — see note below
    .sort((a, b) => a.lastSale - b.lastSale)
    .slice(0, 2);

  for (const r of deadStockItems) {
    const daysSince = Math.floor((now - r.lastSale) / (1000 * 60 * 60 * 24));
    facts.push(`${r.product.colorName} ${r.product.fabricType} has not sold in ${daysSince} days.`);
  }
  // Note: fabrics with NO sale history at all are deliberately excluded
  // from this fact, unlike Dashboard's dead-stock list (which does
  // include never-sold items) — "hasn't sold in 90 days" implies it once
  // sold and stopped, which isn't true for something that's simply never
  // moved. That distinction matters for a merchant deciding what changed
  // versus what was always slow.

  // --- Fact: low stock likely to run out soon, based on recent velocity ---
  const last14Start = new Date(now); last14Start.setDate(now.getDate() - 14);
  const recent14ByFabric = {};
  for (const item of saleItems) {
    const d = itemDate(item);
    if (!d || d < last14Start) continue;
    const fid = item.fabricId ?? item.fabric_id;
    recent14ByFabric[fid] = (recent14ByFabric[fid] || 0) + Number(item.meters);
  }
  const runoutCandidates = products
    .filter((p) => Number(p.stockMeters) > 0)
    .map((p) => {
      const recentMeters = recent14ByFabric[p.id] || 0;
      const dailyRate = recentMeters / 14;
      const daysUntilOut = dailyRate > 0 ? Number(p.stockMeters) / dailyRate : Infinity;
      return { product: p, daysUntilOut };
    })
    .filter((r) => r.daysUntilOut <= LOW_STOCK_RUNOUT_DAYS)
    .sort((a, b) => a.daysUntilOut - b.daysUntilOut)
    .slice(0, 2);

  for (const r of runoutCandidates) {
    facts.push(`${r.product.colorName} ${r.product.fabricType} will likely run out within ${Math.max(1, Math.round(r.daysUntilOut))} days at the current sales rate.`);
  }

  return facts;
}
