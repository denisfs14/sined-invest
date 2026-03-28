'use client';

import { useT } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { Pencil, Trash2, Circle, ChevronDown, ChevronRight, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { Asset } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';
import {
  PageHeader, PageContent, Card, CardHeader, CardBody,
  Button, Badge, TickerBadge, PercentBar, EmptyState, Modal,
  ModalFooter, FormGroup, Input, Toast, C,
} from '@/components/ui';
import { AssetModal } from '@/components/modals/AssetModal';
import { ImportModal } from '@/components/modals/ImportModal';

export default function PortfolioPage() {
  const { t } = useT();
  const { assets, holdingsMap, classes, strategy, portfolio,
    addAsset, updateAsset, deleteAsset, toggleRed, addClass, deleteClass, syncPricesNow, priceMap,
    mode, planData } = useApp();

  const [showAsset, setShowAsset]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Asset | undefined>();
  const [showClass, setShowClass]     = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [className, setClassName]     = useState('');
  const [classTarget, setClassTarget] = useState('');
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({});
  const [sortOrder, setSortOrder]     = useState<'asc' | 'desc' | null>(null);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' as const });

  const totalValue = useMemo(
    () => assets.reduce((s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0),
    [assets, holdingsMap]
  );

  // Group and sort by class
  const groups = useMemo(() => {
    const map: Record<string, { id: string; name: string; target: number; assets: Asset[]; value: number; pct: number }> = {};

    classes.forEach(cls => {
      map[cls.id] = { id: cls.id, name: cls.name, target: cls.target_percentage, assets: [], value: 0, pct: 0 };
    });
    map['__none__'] = { id: '__none__', name: 'Sem Classe', target: 0, assets: [], value: 0, pct: 0 };

    assets.forEach(a => {
      const key = a.asset_class_id && map[a.asset_class_id] ? a.asset_class_id : '__none__';
      map[key].assets.push(a);
    });

    const result = Object.values(map)
      .filter(g => g.assets.length > 0)
      .map(g => {
        const value = g.assets.reduce((s, a) => s + (holdingsMap[a.id]?.quantity ?? 0) * a.current_price, 0);
        const pct   = totalValue > 0 ? (value / totalValue) * 100 : 0;
        return { ...g, value, pct };
      });

    // Sort groups
    let sorted = result;
    if (sortOrder === 'asc')  sorted = [...result].sort((a, b) => a.pct - b.pct);
    if (sortOrder === 'desc') sorted = [...result].sort((a, b) => b.pct - a.pct);

    // Also sort assets within each group by their % in the portfolio
    return sorted.map(g => ({
      ...g,
      assets: [...g.assets].sort((a, b) => {
        const pctA = totalValue > 0 ? ((holdingsMap[a.id]?.quantity ?? 0) * a.current_price / totalValue) * 100 : 0;
        const pctB = totalValue > 0 ? ((holdingsMap[b.id]?.quantity ?? 0) * b.current_price / totalValue) * 100 : 0;
        return sortOrder === 'asc' ? pctA - pctB : sortOrder === 'desc' ? pctB - pctA : 0;
      }),
    }));
  }, [assets, classes, holdingsMap, totalValue, sortOrder]);

  function notify(msg: string) {
    setToast({ visible: true, msg, type: 'success' });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  function handleEdit(a: Asset) { setEditTarget(a); setShowAsset(true); }
  function handleClose() { setEditTarget(undefined); setShowAsset(false); }
  function toggleCollapse(id: string) { setCollapsed(c => ({ ...c, [id]: !c[id] })); }

  function handleSaveClass() {
    if (!className.trim()) return;
    addClass({ portfolio_id: portfolio.id, name: className.trim(), target_percentage: parseFloat(classTarget) || 0, contribution_percentage: 0, top_n: 1 });
    setClassName(''); setClassTarget(''); setShowClass(false);
    notify('Classe criada');
  }

  // Table columns — now with Preço Médio, Preço Dia, Resultado
  const COLS = ['Ticker', 'Nome', 'Qtd.', 'Preço Médio', 'Preço Dia', 'Resultado', 'Valor', '% Carteira', '% Alvo', 'Status', ''];

  return (
    <>
      <PageHeader
        title={t('portfolio.title')}
        subtitle={`${assets.length} ativos · ${formatCurrency(totalValue)}`}
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>{`📥 ${t('portfolio.import_btn')}`}</Button>
            <Button variant="secondary" size="sm" onClick={async () => { notify('Sincronizando preços...'); await syncPricesNow(); notify('Preços atualizados! ✓'); }}>🔄 Atualizar Preços</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowClass(true)}>+ Classe</Button>
            <Button variant="primary" size="sm" onClick={() => { setEditTarget(undefined); setShowAsset(true); }}>+ Ativo</Button>
          </div>
        }
      />
      <PageContent>

        {/* Sort controls */}
        {groups.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: C.gray400, fontWeight: '600' }}>Ordenar classes por %:</span>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? null : 'asc')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
                background: sortOrder === 'asc' ? '#EFF6FF' : C.gray100,
                border: `1.5px solid ${sortOrder === 'asc' ? C.blue : C.gray200}`,
                color: sortOrder === 'asc' ? C.blue : C.gray500,
                fontSize: '12px', fontWeight: '600',
              }}
            >
              <ArrowUp size={12} /> Menor primeiro
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? null : 'desc')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
                background: sortOrder === 'desc' ? '#EFF6FF' : C.gray100,
                border: `1.5px solid ${sortOrder === 'desc' ? C.blue : C.gray200}`,
                color: sortOrder === 'desc' ? C.blue : C.gray500,
                fontSize: '12px', fontWeight: '600',
              }}
            >
              <ArrowDown size={12} /> Maior primeiro
            </button>
            {sortOrder && (
              <button
                onClick={() => setSortOrder(null)}
                style={{ padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', background: C.gray100, border: `1px solid ${C.gray200}`, color: C.gray400, fontSize: '12px' }}
              >
                ✕ Limpar
              </button>
            )}
          </div>
        )}

        {assets.length === 0 ? (
          <Card>
            <EmptyState icon="💼" title="Carteira vazia"
              description="Adicione seu primeiro ativo ou importe do Status Invest"
              action={
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setShowImport(true)}>{`📥 ${t('portfolio.import_btn')}`}</Button>
                  <Button variant="primary" onClick={() => setShowAsset(true)}>{`+ ${t('portfolio.add_asset')}`}</Button>
                </div>
              }
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groups.map(group => {
              const isOpen   = !collapsed[group.id];
              const redCount = group.assets.filter(a => a.is_red).length;

              return (
                <Card key={group.id} className="animate-fade">
                  {/* Group header */}
                  <button
                    onClick={() => toggleCollapse(group.id)}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font)', padding: '16px 24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: isOpen ? `1px solid ${C.gray100}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: C.gray400 }}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: C.gray800 }}>{group.name}</div>
                      <Badge color="blue">{group.assets.length} ativo{group.assets.length !== 1 ? 's' : ''}</Badge>
                      {redCount > 0 && <Badge color="red">🔴 {redCount}</Badge>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      {group.target > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '2px' }}>Alvo</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: C.gray500 }}>{formatPercent(group.target)}</div>
                        </div>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '2px' }}>% Carteira</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '800', color: C.blue }}>{formatPercent(group.pct)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '2px' }}>Valor</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '800', color: C.gray800 }}>{formatCurrency(group.value)}</div>
                      </div>
                      {group.target > 0 && (
                        <div style={{ width: '80px' }}>
                          <PercentBar value={group.pct} max={group.target + 10} color={group.pct > group.target ? C.red : C.green} />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Asset table */}
                  {isOpen && (
                    <div className='table-scroll-wrapper' style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${C.gray100}` }}>
                            {COLS.map((h, colIdx) => (
                              <th key={h} className={colIdx === 8 ? 'hide-mobile' : ''} style={{
                                padding: '10px 14px', textAlign: 'left',
                                fontSize: '10px', fontWeight: '700', color: C.gray400,
                                letterSpacing: '1px', textTransform: 'uppercase',
                                whiteSpace: 'nowrap', background: C.gray50,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.assets.map(asset => {
                            const h       = holdingsMap[asset.id];
                            const qty     = h?.quantity   ?? 0;
                            const avgPM   = h?.avg_price  ?? 0;       // Preço Médio
                            const liveQ   = priceMap[asset.ticker];
                            const preDia  = liveQ?.price ?? asset.current_price;
                            const val     = qty * preDia;
                            const pct     = totalValue > 0 ? (val / totalValue) * 100 : 0;
                            const maxP    = asset.max_percentage || strategy.max_percentage;

                            // Resultado: PM vs Preço Dia
                            const diff    = avgPM > 0 ? ((preDia - avgPM) / avgPM) * 100 : null;
                            const dayChg  = liveQ?.changePct ?? null; // % change today
                            const lucro   = diff !== null && diff >= 0;  // preço subiu = verde
                            const perda   = diff !== null && diff < 0;   // preço caiu = vermelho

                            return (
                              <tr key={asset.id}
                                style={{ borderBottom: `1px solid ${C.gray50}`, transition: 'background .1s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFD')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {/* Ticker */}
                                <td style={{ padding: '13px 14px' }}>
                                  <TickerBadge ticker={asset.ticker} />
                                </td>

                                {/* Nome */}
                                <td style={{ padding: '13px 14px', fontSize: '13px', fontWeight: '500', color: C.gray700, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {asset.name || '—'}
                                </td>

                                {/* Qtd */}
                                <td style={{ padding: '13px 14px', fontFamily: 'var(--mono)', fontSize: '13px', color: C.gray700 }}>
                                  {qty.toLocaleString('pt-BR')}
                                </td>

                                {/* Preço Médio */}
                                <td style={{ padding: '13px 14px' }}>
                                  <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: C.gray700 }}>
                                    {avgPM > 0 ? formatCurrency(avgPM) : <span style={{ color: C.gray300 }}>—</span>}
                                  </div>
                                </td>

                                {/* Preço Dia — manual por enquanto, mostra ↑↓ vs PM */}
                                <td style={{ padding: '13px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', color: C.gray800 }}>
                                      {formatCurrency(preDia)}
                                    </span>
                                    {dayChg !== null && (
                                      <span style={{ fontSize: '10px', fontWeight: '700', color: dayChg >= 0 ? C.green : C.red, display: 'flex', alignItems: 'center', gap: '1px' }}>
                                        {dayChg >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                        {Math.abs(dayChg).toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Resultado: PM vs Preço Dia */}
                                <td style={{ padding: '13px 14px' }}>
                                  {diff === null ? (
                                    <span style={{ color: C.gray300, fontSize: '12px' }}>—</span>
                                  ) : (
                                    <div style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                                      padding: '4px 10px', borderRadius: '20px',
                                      background: lucro ? '#DCFCE7' : '#FEE2E2',
                                      color: lucro ? C.green : C.red,
                                    }}>
                                      {lucro
                                        ? <TrendingUp size={12} />
                                        : <TrendingDown size={12} />}
                                      <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: '700' }}>
                                        {lucro ? '+' : ''}{formatCurrency(preDia - avgPM)}
                                      </span>
                                      <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.8 }}>
                                        ({lucro ? '+' : ''}{diff.toFixed(1)}%)
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Valor Total */}
                                <td style={{ padding: '13px 14px', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '700', color: C.gray800 }}>
                                  {formatCurrency(val)}
                                </td>

                                {/* % Carteira */}
                                <td style={{ padding: '13px 14px', minWidth: '130px' }}>
                                  <PercentBar value={pct} max={maxP} />
                                </td>

                                {/* % Alvo */}
                                <td className='hide-mobile' style={{ padding: '13px 14px', fontFamily: 'var(--mono)', fontSize: '12px', color: C.gray400 }}>
                                  {formatPercent(asset.target_percentage)}
                                </td>

                                {/* Status */}
                                <td style={{ padding: '13px 14px' }}>
                                  {asset.is_red
                                    ? <Badge color="red">🔴 Vermelho</Badge>
                                    : <Badge color="green">✅ Normal</Badge>}
                                </td>

                                {/* Ações */}
                                <td style={{ padding: '13px 14px' }}>
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => handleEdit(asset)} title="Editar"
                                      style={{ background: C.gray100, border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: C.gray600 }}>
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => { toggleRed(asset.id); notify(`${asset.ticker} ${asset.is_red ? 'desmarcado' : 'marcado vermelho'}`); }}
                                      title={asset.is_red ? 'Desmarcar vermelho' : 'Marcar vermelho'}
                                      style={{ background: asset.is_red ? '#FEF2F2' : C.gray100, border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: asset.is_red ? C.red : C.gray500 }}>
                                      <Circle size={13} fill={asset.is_red ? C.red : 'none'} />
                                    </button>
                                    <button
                                      onClick={() => { if (confirm(`Remover ${asset.ticker}?`)) { deleteAsset(asset.id); notify('Ativo removido'); } }}
                                      title="Remover"
                                      style={{ background: '#FEF2F2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: C.red }}>
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Subtotal */}
                        <tfoot>
                          <tr style={{ borderTop: `1px solid ${C.gray100}`, background: C.gray50 }}>
                            <td colSpan={6} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: C.gray500 }}>
                              Subtotal {group.name}
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '800', color: C.gray800 }}>
                              {formatCurrency(group.value)}
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '800', color: C.blue }}>
                              {formatPercent(group.pct)}
                            </td>
                            <td colSpan={3} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Grand total */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              padding: '16px 24px',
              background: C.navy, borderRadius: '12px',
              alignItems: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,.5)' }}>
                Patrimônio Total
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '800', color: C.goldL, letterSpacing: '-0.5px' }}>
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        )}
      </PageContent>

      <AssetModal
        open={showAsset}
        onClose={handleClose}
        onSave={(d, h) => { addAsset(d, h); notify('Ativo adicionado'); }}
        onUpdate={(id, d, h) => { updateAsset(id, d, h); notify('Ativo atualizado'); }}
        classes={classes}
        portfolioId={portfolio.id}
        defaultMaxPct={strategy.max_percentage}
        editAsset={editTarget ? { ...editTarget, holding: holdingsMap[editTarget.id] } : undefined}
      />

      <Modal open={showClass} onClose={() => setShowClass(false)}
        title="Nova Classe de Ativos" subtitle="Ex: Ações, FIIs, Renda Fixa" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormGroup label="Nome">
            <Input placeholder="FIIs" value={className} onChange={e => setClassName(e.target.value)} />
          </FormGroup>
          <FormGroup label="% Alvo">
            <Input type="number" min="0" max="100" placeholder="30"
              value={classTarget} onChange={e => setClassTarget(e.target.value)} />
          </FormGroup>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowClass(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveClass}>Criar Classe</Button>
        </ModalFooter>
      </Modal>

      {assets.length > 0 && mode === 'advanced' && planData.canAdv && (
        <PnLCard assets={assets} holdingsMap={holdingsMap} priceMap={priceMap} totalValue={totalValue} />
      )}
      {assets.length > 0 && !planData.canAdv && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '14px', letterSpacing: '-0.3px' }}>📈 P&L — Resultado por Ativo</div>
          <div style={{ background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '32px' }}>📊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>Análise P&L completa — Advanced Mode</div>
              <div style={{ fontSize: '13px', color: '#b45309', lineHeight: '1.6' }}>Veja o resultado de cada ativo (custo vs valor atual, lucro/prejuízo %) com o plano Advanced.</div>
            </div>
            <a href="/upgrade?ref=analysis:pnl&plan=ADVANCED" style={{ background: `linear-gradient(135deg, #c9a84c, #e6c46b)`, color: '#0a1628', padding: '10px 18px', borderRadius: '9px', fontSize: '12px', fontWeight: '800', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>Ver Advanced →</a>
          </div>
        </div>
      )}

      <ImportModal open={showImport} onClose={() => setShowImport(false)} />
      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  );
}

// ─── P&L Summary Card ─────────────────────────────────────────────────────────
// (shown at bottom of portfolio page)
function PnLCard({ assets, holdingsMap, priceMap, totalValue }: {
  assets: import('@/types').Asset[];
  holdingsMap: Record<string, { quantity: number; avg_price: number }>;
  priceMap: Record<string, { price: number; changePct: number; change: number }>;
  totalValue: number;
}) {
  const rows = assets
    .filter(a => a.active)
    .map(a => {
      const h        = holdingsMap[a.id];
      const qty      = h?.quantity  ?? 0;
      const avgPM    = h?.avg_price ?? 0;
      const price    = priceMap[a.ticker]?.price ?? a.current_price;
      const costBasis = qty * avgPM;
      const curValue  = qty * price;
      const plValue   = curValue - costBasis;
      const plPct     = costBasis > 0 ? (plValue / costBasis) * 100 : 0;
      return { a, qty, avgPM, price, costBasis, curValue, plValue, plPct };
    })
    .filter(r => r.qty > 0)
    .sort((a, b) => b.plPct - a.plPct);

  const totalCost = rows.reduce((s, r) => s + r.costBasis, 0);
  const totalPL   = rows.reduce((s, r) => s + r.plValue, 0);
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ fontSize: '16px', fontWeight: '800', color: C.gray800, marginBottom: '14px', letterSpacing: '-0.3px' }}>
        📈 P&L — Resultado por Ativo
      </div>
      <Card>
        {/* Total */}
        <div style={{ padding: '16px 24px', background: totalPL >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.gray100}` }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.gray400, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Resultado Total da Carteira</div>
            <div style={{ fontSize: '12px', color: C.gray400 }}>Custo total: {formatCurrency(totalCost)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--mono)', color: totalPL >= 0 ? C.green : C.red, letterSpacing: '-1px' }}>
              {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: totalPL >= 0 ? C.green : C.red, fontFamily: 'var(--mono)' }}>
              {totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Per-asset rows */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.gray100}` }}>
                {['Ticker', 'Qtd.', 'Preço Médio', 'Preço Atual', 'Custo Total', 'Valor Atual', 'Resultado R$', 'Resultado %'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: C.gray400, letterSpacing: '1px', textTransform: 'uppercase', background: C.gray50, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, qty, avgPM, price, costBasis, curValue, plValue, plPct }) => (
                <tr key={a.id}
                  style={{ borderBottom: `1px solid ${C.gray50}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFD')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 14px' }}><TickerBadge ticker={a.ticker} /></td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: '13px' }}>{qty}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: '13px', color: C.gray500 }}>{formatCurrency(avgPM)}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600' }}>{formatCurrency(price)}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: '13px', color: C.gray500 }}>{formatCurrency(costBasis)}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '700' }}>{formatCurrency(curValue)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '700', color: plValue >= 0 ? C.green : C.red }}>
                      {plValue >= 0 ? '+' : ''}{formatCurrency(plValue)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '20px',
                      background: plPct >= 0 ? '#DCFCE7' : '#FEE2E2',
                      color: plPct >= 0 ? C.green : C.red,
                      fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '700',
                    }}>
                      {plPct >= 0 ? '▲' : '▼'} {Math.abs(plPct).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
