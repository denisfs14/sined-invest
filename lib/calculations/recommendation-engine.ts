import {
  Asset, AssetClass, EnrichedAsset,
  RecommendationItem, RecommendationResult, StrategySettings
} from '@/types';

export interface HoldingMap {
  [assetId: string]: { quantity: number; avg_price: number };
}

export function enrichAssets(
  assets: Asset[],
  holdingsMap: HoldingMap,
  projectedTotal: number
): EnrichedAsset[] {
  return assets.filter(a => a.active).map(asset => {
    const h = holdingsMap[asset.id];
    const quantity  = h?.quantity  ?? 0;
    const avg_price = h?.avg_price ?? 0;
    const current_value      = quantity * asset.current_price;
    const current_percentage = projectedTotal > 0 ? (current_value / projectedTotal) * 100 : 0;
    return {
      ...asset,
      holding: h ? { id: `h-${asset.id}`, asset_id: asset.id, quantity, avg_price } : undefined,
      current_value,
      current_percentage,
    };
  });
}

// ─── Smart quantity ───────────────────────────────────────────────────────────
function calcQty(amount: number, price: number, roundShares: boolean): number {
  const raw = amount / price;
  if (roundShares && Math.floor(raw) >= 1) return Math.floor(raw);
  return Math.round(raw * 1000) / 1000;
}

// ─── Per-class engine ─────────────────────────────────────────────────────────
function selectFromClass(
  classAssets: EnrichedAsset[],
  classAllocation: number,
  topN: number,
  maxPct: number,
  projectedTotal: number,
  prioritizeRed: boolean,
  fallback: boolean,
  roundShares: boolean
): RecommendationItem[] {
  if (classAssets.length === 0 || classAllocation <= 0) return [];

  // Sort all assets by % ascending (most underweight first)
  const byPct = [...classAssets].sort((a, b) => a.current_percentage - b.current_percentage);

  // Eligibility check
  function isEligible(asset: EnrichedAsset, share: number): boolean {
    const cap    = asset.max_percentage > 0 ? asset.max_percentage : maxPct;
    const newPct = ((asset.current_value + share) / projectedTotal) * 100;
    return newPct <= cap;
  }

  let selected: EnrichedAsset[] = [];

  if (prioritizeRed) {
    // ── PRIORITY MODE ─────────────────────────────────────────────────────────
    // All reds in this class — sorted by % ascending
    const allReds    = byPct.filter(a => a.is_red);
    const allNormals = byPct.filter(a => !a.is_red);

    if (allReds.length > 0) {
      // Try up to topN reds — pick the most underweight ones
      const redCandidates = allReds.slice(0, topN);
      const sharePerRed   = classAllocation / redCandidates.length;
      const eligibleReds  = redCandidates.filter(a => isEligible(a, sharePerRed));

      if (eligibleReds.length > 0) {
        selected = eligibleReds;
      } else if (fallback) {
        // Reds exceed limit → fall back to lowest % normals
        const normalCandidates = allNormals.slice(0, topN);
        const sharePerNormal   = classAllocation / Math.max(normalCandidates.length, 1);
        selected = normalCandidates.filter(a => isEligible(a, sharePerNormal));
      }
    } else {
      // No reds in this class → use lowest % normals
      const candidates  = byPct.slice(0, topN);
      const shareEach   = classAllocation / Math.max(candidates.length, 1);
      selected = candidates.filter(a => isEligible(a, shareEach));
    }
  } else {
    // ── NORMAL MODE — just lowest % ───────────────────────────────────────────
    const candidates = byPct.slice(0, topN);
    const shareEach  = classAllocation / Math.max(candidates.length, 1);
    selected = candidates.filter(a => isEligible(a, shareEach));
  }

  // Last resort fallback
  if (selected.length === 0 && fallback && byPct.length > 0) {
    selected = [byPct[0]];
  }

  if (selected.length === 0) return [];

  // ── Distribute equally ────────────────────────────────────────────────────
  const share = classAllocation / selected.length;

  const items: RecommendationItem[] = selected.map(asset => {
    const quantity = calcQty(share, asset.current_price, roundShares);
    const spent    = quantity * asset.current_price;
    return {
      asset,
      allocated_amount: share,
      quantity,
      spent,
      leftover: share - spent,
      is_red: asset.is_red,
      new_percentage: projectedTotal > 0
        ? ((asset.current_value + spent) / projectedTotal) * 100 : 0,
    };
  });

  // ── Redistribute leftover to lowest % asset ───────────────────────────────
  let pool   = Math.round(items.reduce((s, i) => s + i.leftover, 0) * 100) / 100;
  let safety = 0;

  while (pool > 0.001 && safety < 20) {
    safety++;
    const target = [...items]
      .filter(i => pool >= i.asset.current_price * 0.001)
      .sort((a, b) => a.asset.current_percentage - b.asset.current_percentage)[0];
    if (!target) break;

    const extraQty   = calcQty(pool, target.asset.current_price, roundShares);
    if (extraQty <= 0) break;

    const extraSpent = Math.round(extraQty * target.asset.current_price * 100) / 100;
    if (extraSpent > pool + 0.001) break;

    pool = Math.round((pool - extraSpent) * 100) / 100;
    const idx = items.findIndex(i => i.asset.id === target.asset.id);
    if (idx >= 0) {
      const newQty   = Math.round((items[idx].quantity + extraQty) * 1000) / 1000;
      const newSpent = Math.round((items[idx].spent + extraSpent) * 100) / 100;
      items[idx] = {
        ...items[idx],
        quantity: newQty,
        spent: newSpent,
        leftover: Math.round((items[idx].allocated_amount - newSpent) * 100) / 100,
        new_percentage: projectedTotal > 0
          ? ((target.asset.current_value + newSpent) / projectedTotal) * 100 : 0,
      };
    }
  }

  // Remaining pool → leftover of lowest % item
  if (pool > 0.001) {
    const lowestIdx = items
      .map((it, i) => ({ pct: it.asset.current_percentage, i }))
      .sort((a, b) => a.pct - b.pct)[0]?.i ?? 0;
    items[lowestIdx] = {
      ...items[lowestIdx],
      leftover: Math.round((items[lowestIdx].leftover + pool) * 100) / 100,
    };
  }

  return items;
}

// ─── Main engine ──────────────────────────────────────────────────────────────
export function calculatePurchaseRecommendation(params: {
  assets: Asset[];
  classes: AssetClass[];
  holdingsMap: HoldingMap;
  totalAvailable: number;
  strategy: Pick<StrategySettings,
    'top_n' | 'max_percentage' | 'prioritize_red' |
    'fallback_to_lowest' | 'round_shares'>;
}): RecommendationResult {
  const { assets, classes, holdingsMap, totalAvailable, strategy } = params;
  const { max_percentage, prioritize_red, fallback_to_lowest, round_shares, top_n } = strategy;

  if (totalAvailable <= 0) return err('Valor de aporte deve ser maior que zero.', 0);

  const active = assets.filter(a => a.active);
  if (active.length === 0) return err('Nenhum ativo ativo na carteira.', 0);

  const portfolioTotal = active.reduce(
    (s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0
  );
  const projectedTotal = portfolioTotal + totalAvailable;
  const enriched       = enrichAssets(active, holdingsMap, projectedTotal);

  const classesWithPct = classes.filter(c => (c.contribution_percentage || 0) > 0);
  const allItems: RecommendationItem[] = [];

  if (classesWithPct.length > 0) {
    // ── Per-class mode ────────────────────────────────────────────────────────
    const totalPct = classesWithPct.reduce((s, c) => s + (c.contribution_percentage || 0), 0);

    for (const cls of classes) {
      if (!(cls.contribution_percentage > 0)) continue;

      const classAssets = enriched.filter(a => a.asset_class_id === cls.id);
      if (classAssets.length === 0) continue;

      const normalizedPct   = totalPct > 100
        ? (cls.contribution_percentage / totalPct) * 100
        : cls.contribution_percentage;
      const classAllocation = (normalizedPct / 100) * totalAvailable;
      const classTopN       = cls.top_n > 0 ? cls.top_n : top_n;

      const classItems = selectFromClass(
        classAssets, classAllocation, classTopN,
        max_percentage, projectedTotal,
        prioritize_red, fallback_to_lowest, round_shares
      );
      allItems.push(...classItems);
    }

  } else {
    // ── Global mode ───────────────────────────────────────────────────────────
    const byPct      = [...enriched].sort((a, b) => a.current_percentage - b.current_percentage);
    const allReds    = byPct.filter(a => a.is_red);
    const allNormals = byPct.filter(a => !a.is_red);

    function isEligible(asset: EnrichedAsset, share: number): boolean {
      const cap    = asset.max_percentage > 0 ? asset.max_percentage : max_percentage;
      const newPct = ((asset.current_value + share) / projectedTotal) * 100;
      return newPct <= cap;
    }

    let selected: EnrichedAsset[] = [];

    if (prioritize_red && allReds.length > 0) {
      const redCandidates = allReds.slice(0, top_n);
      const sharePerRed   = totalAvailable / redCandidates.length;
      const eligibleReds  = redCandidates.filter(a => isEligible(a, sharePerRed));

      if (eligibleReds.length > 0) {
        selected = eligibleReds;
      } else if (fallback_to_lowest) {
        const normalCandidates = allNormals.slice(0, top_n);
        const sharePerNormal   = totalAvailable / Math.max(normalCandidates.length, 1);
        selected = normalCandidates.filter(a => isEligible(a, sharePerNormal));
      }
    } else {
      const candidates = byPct.slice(0, top_n);
      const shareEach  = totalAvailable / Math.max(candidates.length, 1);
      selected = candidates.filter(a => isEligible(a, shareEach));
    }

    if (selected.length === 0 && fallback_to_lowest && byPct.length > 0) selected = [byPct[0]];
    if (selected.length === 0) return err(`Todos os ativos ultrapassariam ${max_percentage}%.`, portfolioTotal);

    const share = totalAvailable / selected.length;
    selected.forEach(asset => {
      const quantity = calcQty(share, asset.current_price, round_shares);
      const spent    = quantity * asset.current_price;
      allItems.push({
        asset, allocated_amount: share, quantity, spent,
        leftover: share - spent, is_red: asset.is_red,
        new_percentage: projectedTotal > 0
          ? ((asset.current_value + spent) / projectedTotal) * 100 : 0,
      });
    });
  }

  if (allItems.length === 0) {
    return err('Nenhum ativo elegível. Configure % por classe na Estratégia ou revise os limites.', portfolioTotal);
  }

  const totalInvested = allItems.reduce((s, i) => s + i.spent, 0);
  const totalLeftover = allItems.reduce((s, i) => s + i.leftover, 0);

  return {
    items:           allItems,
    total_available: totalAvailable,
    total_invested:  totalInvested,
    total_leftover:  totalLeftover,
    portfolio_total: portfolioTotal,
  };
}

function err(message: string, portfolioTotal: number): RecommendationResult {
  return { items: [], total_available: 0, total_invested: 0, total_leftover: 0, portfolio_total: portfolioTotal, error: message };
}
