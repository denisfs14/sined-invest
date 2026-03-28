'use client';

import { useT } from '@/lib/i18n';
import { useState, useMemo } from 'react';
import { ShoppingCart, TrendingDown, Wallet, CheckCircle, Plus, Minus } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { formatCurrency, formatDateTime, formatDate, formatQuantity } from '@/utils/format';
import {
  PageHeader, PageContent, Card, CardHeader, CardBody,
  StatCard, Button, Badge, TickerBadge,
  EmptyState, Modal, ModalFooter, FormGroup, Input, Select, Toast, C,
} from '@/components/ui';

type Tab = 'buy' | 'sell' | 'cash';

export default function OperationsPage() {
  const { t } = useT();
  const {
    assets, holdingsMap, history, cashBalance, cashEvents,
    portfolio, executeBuy, executeSell, withdrawCash, depositCash,
    refresh,
  } = useApp();

  const [tab, setTab]           = useState<Tab>('buy');
  const [toast, setToast]       = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });

  // Buy modal state
  const [buyAsset, setBuyAsset]   = useState('');
  const [buyQty, setBuyQty]       = useState('');
  const [buyPrice, setBuyPrice]   = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Sell modal state
  const [sellAsset, setSellAsset] = useState('');
  const [sellQty, setSellQty]     = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  // Cash modal state
  const [cashMode, setCashMode]   = useState<'withdraw' | 'deposit'>('withdraw');
  const [cashAmt, setCashAmt]     = useState('');
  const [cashDesc, setCashDesc]   = useState('');
  const [showCashModal, setShowCashModal] = useState(false);

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  // Last recommendation items as pending buys
  const lastSim = history[0];
  const pendingBuys = useMemo(() => {
    if (!lastSim?.items) return [];
    return lastSim.items.filter(i => i.asset);
  }, [lastSim]);

  // Active assets for sell dropdown
  const activeAssets = assets.filter(a => a.active && (holdingsMap[a.id]?.quantity ?? 0) > 0);

  // Quick buy from recommendation
  async function handleQuickBuy(assetId: string, suggestedQty: number, suggestedPrice: number) {
    setBuyAsset(assetId);
    setBuyQty(String(suggestedQty));
    setBuyPrice(String(suggestedPrice));
    setShowBuyModal(true);
  }

  async function confirmBuy() {
    const qty   = parseFloat(buyQty);
    const price = parseFloat(buyPrice);
    if (!buyAsset || !qty || !price) return notify(t('operations.fill_all_fields'), 'error');
    setBuyLoading(true);
    try {
      await executeBuy(buyAsset, qty, price);
      setShowBuyModal(false);
      setBuyAsset(''); setBuyQty(''); setBuyPrice('');
      notify('✓ Compra registrada! Carteira atualizada.');
    } catch (e: unknown) {
      notify(t('operations.error_prefix', { msg: e instanceof Error ? e.message : '?' }), 'error');
    } finally {
      setBuyLoading(false);
    }
  }

  async function confirmSell() {
    const qty   = parseFloat(sellQty);
    const price = parseFloat(sellPrice);
    if (!sellAsset || !qty || !price) return notify(t('operations.fill_all_fields'), 'error');
    const holding = holdingsMap[sellAsset];
    if (!holding || qty > holding.quantity) return notify(t('operations.qty_exceeds'), 'error');
    setSellLoading(true);
    try {
      await executeSell(sellAsset, qty, price);
      setShowSellModal(false);
      setSellAsset(''); setSellQty(''); setSellPrice('');
      const total = qty * price;
      notify(t('operations.sell_ok', { qty: String(qty), total: total.toFixed(2) }));
    } catch (e: unknown) {
      notify(t('operations.error_prefix', { msg: e instanceof Error ? e.message : '?' }), 'error');
    } finally {
      setSellLoading(false);
    }
  }

  async function confirmCash() {
    const amt = parseFloat(cashAmt);
    if (!amt || amt <= 0) return notify(t('operations.invalid_amount'), 'error');
    if (cashMode === 'withdraw' && amt > cashBalance) return notify(t('operations.insufficient_balance'), 'error');
    try {
      if (cashMode === 'withdraw') {
        await withdrawCash(amt);
        notify(`✓ Retirada de ${formatCurrency(amt)} registrada`);
      } else {
        await depositCash(amt, cashDesc || t('operations.deposit_default'));
        notify(`✓ Depósito de ${formatCurrency(amt)} registrado`);
      }
      setShowCashModal(false);
      setCashAmt(''); setCashDesc('');
    } catch (e: unknown) {
      notify(t('operations.error_prefix', { msg: e instanceof Error ? e.message : '?' }), 'error');
    }
  }

  const selectedSellAsset = assets.find(a => a.id === sellAsset);
  const sellHolding       = sellAsset ? holdingsMap[sellAsset] : null;
  const sellTotal         = (parseFloat(sellQty) || 0) * (parseFloat(sellPrice) || 0);
  const buyTotal          = (parseFloat(buyQty) || 0) * (parseFloat(buyPrice) || 0);

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
    border: 'none', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '600',
    background: active ? C.navy : 'transparent',
    color: active ? C.white : C.gray500,
    display: 'flex', alignItems: 'center', gap: '7px',
    transition: 'all .15s',
  });

  const cashEventLabels: Record<string, string> = {
    sell_proceeds: '💰 Venda',
    leftover:      t('operations.sim_label'),
    withdrawal:    '🏦 Retirada',
    deposit:       '📥 Depósito',
  };

  return (
    <>
      <PageHeader
        title={t('operations.title')}
        subtitle={t('operations.subtitle')}
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => { setCashMode('deposit'); setShowCashModal(true); }}>
              <Plus size={13} /> Depósito
            </Button>
            <Button variant="danger" size="sm" onClick={() => { setCashMode('withdraw'); setShowCashModal(true); }}>
              <Minus size={13} /> Retirada
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowBuyModal(true)}>
              <ShoppingCart size={13} /> Nova Compra
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowSellModal(true)}>
              <TrendingDown size={13} /> Nova Venda
            </Button>
          </div>
        }
      />
      <PageContent>

        {/* Stats */}
        <div className='ops-stat-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard
            label={t('operations.available_balance')}
            value={formatCurrency(cashBalance)}
            sub={t('operations.cash_sub')}
            color={cashBalance > 0 ? C.green : C.gray400}
            accent={C.green}
            icon={<Wallet size={15} />}
          />
          <StatCard
            label={t('operations.last_simulation')}
            value={lastSim ? formatCurrency(lastSim.total_amount) : '—'}
            sub={lastSim ? (lastSim.items?.length === 1 ? t('operations.last_sim_sub', { count: lastSim.items.length }) : t('operations.last_sim_sub_pl', { count: lastSim.items?.length ?? 0 })) : t('operations.no_simulation')}
            accent={C.blue}
            icon={<ShoppingCart size={15} />}
          />
          <StatCard
            label={t('operations.assets_label')}
            value={String(activeAssets.length)}
            sub={t('operations.active_assets_sub')}
            accent={C.gold}
            icon={<CheckCircle size={15} />}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: C.gray100, borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
          <button style={TAB_STYLE(tab === 'buy')}  onClick={() => setTab('buy')}>
            <ShoppingCart size={14} /> Compras
          </button>
          <button style={TAB_STYLE(tab === 'sell')} onClick={() => setTab('sell')}>
            <TrendingDown size={14} /> Vendas
          </button>
          <button style={TAB_STYLE(tab === 'cash')} onClick={() => setTab('cash')}>
            <Wallet size={14} /> Saldo
          </button>
        </div>

        {/* ── BUY TAB ── */}
        {tab === 'buy' && (
          <div>
            {/* Last recommendation */}
            {pendingBuys.length > 0 && (
              <Card style={{ marginBottom: '20px' }}>
                <CardHeader action={
                  <Badge color="blue">{pendingBuys.length === 1 ? t('operations.pending_buys_label', { count: pendingBuys.length }) : t('operations.pending_buys_pl', { count: pendingBuys.length })}</Badge>
                }>
                  📋 Última Recomendação — {lastSim && formatDate(lastSim.created_at)}
                </CardHeader>
                <CardBody style={{ padding: '0 24px 16px' }}>
                  <div style={{ fontSize: '12px', color: C.gray400, marginBottom: '12px', padding: '8px 0' }}>
                    {t('operations.confirm_execute')}
                  </div>
                  {pendingBuys.map((item, i) => {
                    const asset   = item.asset!;
                    const holding = holdingsMap[asset.id];
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                        padding: '14px 0', borderBottom: `1px solid ${C.gray50}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            width: '28px', height: '28px', background: C.navy, color: C.goldL,
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '800', fontFamily: 'var(--mono)', flexShrink: 0,
                          }}>{i + 1}</span>
                          <TickerBadge ticker={asset.ticker} />
                          {asset.is_red && <Badge color="red">🔴</Badge>}
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray700 }}>{asset.name}</div>
                            <div style={{ fontSize: '11px', color: C.gray400, fontFamily: 'var(--mono)' }}>
                              Qtd atual: {holding?.quantity ?? 0} · PM: {holding?.avg_price ? formatCurrency(holding.avg_price) : '—'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '.8px' }}>Sugerido</div>
                            <div style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '14px' }}>
                            {formatQuantity(item.quantity, asset.ticker, null)} cotas
                            </div>
                            <div style={{ fontSize: '11px', color: C.gray400 }}>
                              × {formatCurrency(asset.current_price)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: C.gray400, textTransform: 'uppercase', letterSpacing: '.8px' }}>Total</div>
                            <div style={{ fontFamily: 'var(--mono)', fontWeight: '700', fontSize: '14px', color: C.blue }}>
                              {formatCurrency(item.allocated_amount)}
                            </div>
                          </div>
                          <Button variant="primary" size="sm"
                            onClick={() => handleQuickBuy(asset.id, item.quantity, asset.current_price)}>
                            <CheckCircle size={13} /> {t('operations.register_btn')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            )}

            {pendingBuys.length === 0 && (
              <Card>
                <EmptyState icon="📋" title="Nenhuma recomendação ativa"
                  description="Calcule um aporte na aba Aportar para ver as recomendações aqui"
                  action={<Button variant="primary" size="sm" onClick={() => setShowBuyModal(true)}>+ Compra Manual</Button>}
                />
              </Card>
            )}
          </div>
        )}

        {/* ── SELL TAB ── */}
        {tab === 'sell' && (
          <Card>
            <CardHeader action={
              <Button variant="secondary" size="sm" onClick={() => setShowSellModal(true)}>
                <TrendingDown size={13} /> Nova Venda
              </Button>
            }>
              Posições Disponíveis para Venda
            </CardHeader>
            <CardBody style={{ padding: '0 24px 16px' }}>
              {activeAssets.length === 0 ? (
                <EmptyState icon="📭" title="Nenhum ativo com posição" description="Importe ou adicione ativos à carteira" />
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 120px 120px 130px', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.gray200}`, fontSize: '10px', fontWeight: '700', color: C.gray400, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    <span>{t('operations.col_ticker')}</span><span>{t('operations.col_name')}</span><span>{t('operations.col_qty')}</span><span>{t('operations.col_pm')}</span><span>{t('operations.col_day_price')}</span><span></span>
                  </div>
                  {activeAssets.map(asset => {
                    const h = holdingsMap[asset.id];
                    return (
                      <div key={asset.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 120px 120px 130px', gap: '12px', padding: '14px 0', borderBottom: `1px solid ${C.gray50}`, alignItems: 'center' }}>
                        <TickerBadge ticker={asset.ticker} />
                        <span style={{ fontSize: '13px', color: C.gray700, fontWeight: '500' }}>{asset.name}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600' }}>{h?.quantity ?? 0}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: C.gray500 }}>{h?.avg_price ? formatCurrency(h.avg_price) : '—'}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600' }}>{formatCurrency(asset.current_price)}</span>
                        <Button variant="danger" size="sm" onClick={() => {
                          setSellAsset(asset.id);
                          setSellPrice(String(asset.current_price));
                          setSellQty('');
                          setShowSellModal(true);
                        }}>
                          <TrendingDown size={13} /> Vender
                        </Button>
                      </div>
                    );
                  })}
                </>
              )}
            </CardBody>
          </Card>
        )}

        {/* ── CASH TAB ── */}
        {tab === 'cash' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Balance card */}
            <Card style={{ border: `2px solid ${cashBalance > 0 ? C.green : C.gray200}` }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.gray400, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Saldo Disponível
                    </div>
                    <div style={{ fontSize: '40px', fontWeight: '800', color: cashBalance > 0 ? C.green : C.gray400, fontFamily: 'var(--mono)', letterSpacing: '-1.5px' }}>
                      {formatCurrency(cashBalance)}
                    </div>
                    <div style={{ fontSize: '13px', color: C.gray400, marginTop: '6px' }}>
                      Sobras de aportes + vendas não reinvestidas
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="primary" size="sm" onClick={() => { setCashMode('deposit'); setCashAmt(''); setCashDesc(''); setShowCashModal(true); }}>
                      <Plus size={13} /> Depósito
                    </Button>
                    <Button variant="danger" size="sm" disabled={cashBalance <= 0}
                      onClick={() => { setCashMode('withdraw'); setCashAmt(''); setCashDesc(''); setShowCashModal(true); }}>
                      <Minus size={13} /> Retirada
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Cash events history */}
            <Card>
              <CardHeader>📋 Histórico de Movimentações</CardHeader>
              <CardBody style={{ padding: '0 24px 16px' }}>
                {cashEvents.length === 0 ? (
                  <EmptyState icon="📭" title="Nenhuma movimentação" description="As sobras de aportes e vendas aparecem aqui" />
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.gray200}`, fontSize: '10px', fontWeight: '700', color: C.gray400, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      <span>Descrição</span><span>Data</span><span style={{ textAlign: 'right' }}>Valor</span>
                    </div>
                    {cashEvents.map(ev => {
                      const isOut = ev.type === 'withdrawal';
                      return (
                        <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: '12px', padding: '13px 0', borderBottom: `1px solid ${C.gray50}`, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{cashEventLabels[ev.type]?.split(' ')[0] ?? '📌'}</span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray700 }}>
                                {cashEventLabels[ev.type]?.split(' ').slice(1).join(' ') ?? ev.type}
                              </div>
                              {ev.description && (
                                <div style={{ fontSize: '11px', color: C.gray400 }}>{ev.description}</div>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', color: C.gray400, fontFamily: 'var(--mono)' }}>
                            {formatDateTime(ev.created_at)}
                          </span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: '800', color: isOut ? C.red : C.green, textAlign: 'right' }}>
                            {isOut ? '-' : '+'}{formatCurrency(ev.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </PageContent>

      {/* ── BUY MODAL ── */}
      <Modal open={showBuyModal} onClose={() => setShowBuyModal(false)}
        title={t('operations.register_buy_title')} subtitle={t('operations.register_buy_sub')} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormGroup label={t('operations.form_asset')}>
            <Select value={buyAsset} onChange={e => setBuyAsset(e.target.value)}>
              <option value="">— Selecione o ativo —</option>
              {assets.filter(a => a.active).map(a => (
                <option key={a.id} value={a.id}>{a.ticker} · {a.name}</option>
              ))}
            </Select>
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormGroup label={t('operations.form_qty')}>
              <Input type="number" min="0" step="0.001" placeholder="100"
                value={buyQty} onChange={e => setBuyQty(e.target.value)} />
            </FormGroup>
            <FormGroup label={t('operations.form_unit_price')}>
              <div style={{ position: 'relative' }}>
                <Input type="number" min="0" step="0.01" placeholder="35.00"
                  value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                  style={{ borderColor: buyPrice ? C.blue : undefined, background: buyPrice ? '#EFF6FF' : undefined }} />
              </div>
              <div style={{ fontSize: '11px', color: C.amber, marginTop: '4px', fontWeight: '600' }}>
                ✏️ Edite se o preço da corretora for diferente
              </div>
            </FormGroup>
          </div>

          {/* Preview */}
          {buyTotal > 0 && buyAsset && (
            <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: C.blue, fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Resumo da Operação
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: C.gray600 }}>Total investido</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: '800', color: C.blue }}>{formatCurrency(buyTotal)}</span>
              </div>
              {(() => {
                const h = holdingsMap[buyAsset];
                if (!h) return null;
                const newQty   = h.quantity + (parseFloat(buyQty) || 0);
                const newPM    = ((h.quantity * h.avg_price) + buyTotal) / newQty;
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: C.gray600 }}>Nova quantidade</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: '700' }}>{newQty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: C.gray600 }}>Novo preço médio</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: '700', color: C.green }}>{formatCurrency(newPM)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowBuyModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={confirmBuy} loading={buyLoading}>
            <CheckCircle size={14} /> Confirmar Compra
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── SELL MODAL ── */}
      <Modal open={showSellModal} onClose={() => setShowSellModal(false)}
        title={t('operations.register_sell_title')} subtitle={t('operations.register_sell_sub')} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormGroup label={t('operations.form_asset')}>
            <Select value={sellAsset} onChange={e => {
              setSellAsset(e.target.value);
              const a = assets.find(x => x.id === e.target.value);
              if (a) setSellPrice(String(a.current_price));
            }}>
              <option value="">— Selecione o ativo —</option>
              {activeAssets.map(a => {
                const h = holdingsMap[a.id];
                return <option key={a.id} value={a.id}>{a.ticker} · {a.name} ({h?.quantity ?? 0} cotas)</option>;
              })}
            </Select>
          </FormGroup>

          {sellHolding && (
            <div style={{ background: C.gray50, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: C.gray500 }}>
              Posição atual: <strong style={{ color: C.gray800 }}>{sellHolding.quantity} cotas</strong>
              {' · '}PM: <strong style={{ color: C.gray800 }}>{formatCurrency(sellHolding.avg_price)}</strong>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormGroup label={t('operations.form_qty')}>
              <Input type="number" min="0.001" step="0.001"
                placeholder={sellHolding ? String(sellHolding.quantity) : '0'}
                value={sellQty} onChange={e => setSellQty(e.target.value)} />
            </FormGroup>
            <FormGroup label={t('operations.form_unit_price')}>
              <Input type="number" min="0" step="0.01"
                value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
            </FormGroup>
          </div>

          {/* Preview */}
          {sellTotal > 0 && sellAsset && (
            <div style={{ background: '#FFF1F2', borderRadius: '10px', padding: '14px 16px', border: `1px solid #FECDD3` }}>
              <div style={{ fontSize: '11px', color: C.red, fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Resumo da Venda
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: C.gray600 }}>Valor recebido</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: '800', color: C.green }}>{formatCurrency(sellTotal)}</span>
              </div>
              {sellHolding && (() => {
                const remQty = sellHolding.quantity - (parseFloat(sellQty) || 0);
                const pm = sellHolding.avg_price;
                const result = sellTotal - ((parseFloat(sellQty) || 0) * pm);
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: C.gray600 }}>{remQty <= 0 ? 'Ativo removido da carteira' : `Cotas restantes`}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: '700', color: remQty <= 0 ? C.red : C.gray700 }}>
                        {remQty <= 0 ? '—' : remQty.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: C.gray600 }}>Resultado vs PM</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: '700', color: result >= 0 ? C.green : C.red }}>
                        {result >= 0 ? '+' : ''}{formatCurrency(result)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {sellHolding && parseFloat(sellQty) > sellHolding.quantity && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '8px', fontSize: '12px', color: C.red, fontWeight: '600' }}>
              ⚠️ Quantidade maior que o disponível ({sellHolding.quantity} cotas)
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowSellModal(false)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmSell} loading={sellLoading}>
            <TrendingDown size={14} /> Confirmar Venda
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── CASH MODAL ── */}
      <Modal open={showCashModal} onClose={() => setShowCashModal(false)}
        title={cashMode === 'withdraw' ? t('operations.register_withdraw') : t('operations.register_deposit')}
        subtitle={cashMode === 'withdraw'
          ? `Saldo atual: ${formatCurrency(cashBalance)}`
          : 'Adicionar valor ao saldo disponível'}
        width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormGroup label="Valor (R$) *">
            <Input type="number" min="0" step="0.01"
              placeholder="0.00" value={cashAmt} onChange={e => setCashAmt(e.target.value)} />
          </FormGroup>
          {cashMode === 'deposit' && (
            <FormGroup label="Descrição (opcional)">
              <Input placeholder="Ex: Dividendos recebidos"
                value={cashDesc} onChange={e => setCashDesc(e.target.value)} />
            </FormGroup>
          )}
          {cashMode === 'withdraw' && parseFloat(cashAmt) > cashBalance && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '8px', fontSize: '12px', color: C.red, fontWeight: '600' }}>
              ⚠️ Valor maior que o saldo disponível ({formatCurrency(cashBalance)})
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowCashModal(false)}>Cancelar</Button>
          <Button
            variant={cashMode === 'withdraw' ? 'danger' : 'primary'}
            onClick={confirmCash}>
            {cashMode === 'withdraw' ? <><Minus size={14} /> Confirmar Retirada</> : <><Plus size={14} /> Confirmar Depósito</>}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  );
}
