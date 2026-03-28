'use client';

import { useRef, useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { supabase } from '@/lib/supabase/client';
import { Modal, ModalFooter, Button, Badge, TickerBadge, C } from '@/components/ui';
import { formatCurrency } from '@/utils/format';

interface ParsedAsset {
  ticker: string;
  category: string;
  avg_price: number;
  current_price: number;
  quantity: number;
  patrimony: number;
  skip: boolean;
}

interface DebugLog {
  step: string;
  ok: boolean;
  detail: string;
}

const CATEGORY_MAP: Record<string, string> = {
  'ações': 'Ações BR', 'acoes': 'Ações BR', 'acao': 'Ações BR',
  'fiis': 'FIIs', 'fii': 'FIIs',
  'tesouro': 'Renda Fixa', 'renda fixa': 'Renda Fixa',
  'bdr': 'BDRs', 'bdrs': 'BDRs',
  'etf': 'ETFs', 'etfs': 'ETFs',
};

function normCat(raw: string): string {
  return CATEGORY_MAP[raw.toLowerCase().trim()] ?? raw;
}

async function parseFile(file: File): Promise<{ assets: ParsedAsset[]; errors: string[] }> {
  let attempts = 0;
  while (!(window as any).XLSX && attempts < 30) {
    await new Promise(r => setTimeout(r, 300));
    attempts++;
  }
  const XLSX = (window as any).XLSX;
  if (!XLSX) return { assets: [], errors: ['SheetJS não carregou. Recarregue a página.'] };

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const assets: ParsedAsset[] = [];
        const errors: string[] = [];

        wb.SheetNames.forEach((sheetName: string) => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as any[][];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || !r[0]) continue;
            const ticker       = String(r[0]).trim().toUpperCase();
            const avgPrice     = parseFloat(String(r[2] ?? '0').replace(',', '.'));
            const currentPrice = parseFloat(String(r[3] ?? '0').replace(',', '.'));
            const quantity     = parseFloat(String(r[5] ?? '0').replace(',', '.'));
            const patrimony    = parseFloat(String(r[6] ?? '0').replace(',', '.'));
            if (!ticker || isNaN(avgPrice) || isNaN(currentPrice)) {
              errors.push(`Linha ${i+1} (${sheetName}): inválido`);
              continue;
            }
            assets.push({
              ticker,
              category:      normCat(String(r[1] ?? sheetName).trim()),
              avg_price:     Math.round(avgPrice     * 100) / 100,
              current_price: Math.round(currentPrice * 100) / 100,
              quantity:      quantity || 0,
              patrimony:     Math.round((patrimony || 0) * 100) / 100,
              skip: false,
            });
          }
        });
        resolve({ assets, errors });
      } catch (err) {
        resolve({ assets: [], errors: [`Erro: ${err}`] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function runImport(
  assets: ParsedAsset[],
  portfolioId: string,
  maxPct: number,
  onLog: (log: DebugLog) => void
): Promise<number> {
  let imported = 0;

  // ── STEP 1: Verify session ────────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    onLog({ step: 'Autenticação', ok: false, detail: 'Sem sessão ativa — faça login novamente' });
    return 0;
  }
  onLog({ step: 'Autenticação', ok: true, detail: `Usuário: ${session.user.email}` });

  // ── STEP 2: Verify portfolio ──────────────────────────────────────────────
  const { data: port, error: portErr } = await supabase
    .from('portfolios').select('id, name').eq('id', portfolioId).single();
  if (portErr || !port) {
    onLog({ step: 'Portfólio', ok: false, detail: portErr?.message ?? 'Portfólio não encontrado' });
    return 0;
  }
  onLog({ step: 'Portfólio', ok: true, detail: `"${port.name}" (${portfolioId.slice(0,8)}…)` });

  // ── STEP 3: Create/fetch classes ──────────────────────────────────────────
  const categories = [...new Set(assets.map(a => a.category))];
  const classMap: Record<string, string> = {};

  for (const cat of categories) {
    // Check if exists
    const { data: existing } = await supabase
      .from('asset_classes').select('id').eq('portfolio_id', portfolioId).ilike('name', cat).maybeSingle();

    if (existing?.id) {
      classMap[cat] = existing.id;
      onLog({ step: `Classe: ${cat}`, ok: true, detail: `Já existe (${existing.id.slice(0,8)}…)` });
    } else {
      const { data: created, error: classErr } = await supabase
        .from('asset_classes')
        .insert({ portfolio_id: portfolioId, name: cat, target_percentage: 0 })
        .select('id').single();

      if (classErr || !created) {
        onLog({ step: `Classe: ${cat}`, ok: false, detail: classErr?.message ?? 'Falha ao criar' });
      } else {
        classMap[cat] = created.id;
        onLog({ step: `Classe: ${cat}`, ok: true, detail: `Criada (${created.id.slice(0,8)}…)` });
      }
    }
  }

  // ── STEP 4: Insert assets ─────────────────────────────────────────────────
  for (const asset of assets) {
    // Check duplicate
    const { data: dup } = await supabase
      .from('assets').select('id').eq('portfolio_id', portfolioId).eq('ticker', asset.ticker).maybeSingle();
    if (dup) {
      onLog({ step: `Ativo: ${asset.ticker}`, ok: true, detail: 'Já existe, ignorado' });
      continue;
    }

    const { data: newAsset, error: assetErr } = await supabase
      .from('assets')
      .insert({
        portfolio_id:      portfolioId,
        asset_class_id:    classMap[asset.category] ?? null,
        ticker:            asset.ticker,
        name:              asset.ticker,
        current_price:     asset.current_price,
        target_percentage: 0,
        max_percentage:    maxPct,
        is_red:            false,
        active:            true,
      })
      .select('id').single();

    if (assetErr || !newAsset) {
      onLog({ step: `Ativo: ${asset.ticker}`, ok: false, detail: assetErr?.message ?? 'Falha ao inserir' });
      continue;
    }

    // Insert holding
    if (asset.quantity > 0) {
      const { error: holdErr } = await supabase.from('holdings').insert({
        asset_id:  newAsset.id,
        quantity:  asset.quantity,
        avg_price: asset.avg_price,
      });
      if (holdErr) {
        onLog({ step: `Ativo: ${asset.ticker}`, ok: false, detail: `Ativo criado mas holding falhou: ${holdErr.message}` });
      } else {
        onLog({ step: `Ativo: ${asset.ticker}`, ok: true, detail: `Qtd: ${asset.quantity} · PM: R$${asset.avg_price}` });
        imported++;
      }
    } else {
      onLog({ step: `Ativo: ${asset.ticker}`, ok: true, detail: `Sem posição (qty=0)` });
      imported++;
    }
  }

  return imported;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assets: existing, portfolio, strategy, refresh } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  type Step = 'idle' | 'parsing' | 'preview' | 'importing' | 'done';
  const [step, setStep]         = useState<Step>('idle');
  const [parsed, setParsed]     = useState<ParsedAsset[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [logs, setLogs]         = useState<DebugLog[]>([]);
  const [imported, setImported] = useState(0);

  const existingTickers = new Set(existing.map(a => a.ticker.toUpperCase()));

  async function handleFile(file: File) {
    if (!file.name.match(/\.xlsx?$/i)) {
      setParseErrors(['Selecione um arquivo .xlsx do Status Invest']);
      return;
    }
    setStep('parsing');
    const { assets, errors } = await parseFile(file);
    const enriched = assets.map(a => ({ ...a, skip: existingTickers.has(a.ticker) }));
    const sel: Record<string, boolean> = {};
    enriched.filter(a => !a.skip).forEach(a => { sel[a.ticker] = true; });
    setParsed(enriched);
    setSelected(sel);
    setParseErrors(errors);
    setStep('preview');
  }

  async function handleImport() {
    setStep('importing');
    setLogs([]);
    const toImport = parsed.filter(a => selected[a.ticker] && !a.skip);
    const addLog   = (log: DebugLog) => setLogs(l => [...l, log]);
    const count    = await runImport(toImport, portfolio!.id, strategy?.max_percentage ?? 15, addLog);
    setImported(count);
    await refresh();
    setStep('done');
  }

  function handleClose() {
    setStep('idle'); setParsed([]); setSelected({});
    setParseErrors([]); setLogs([]); setImported(0);
    onClose();
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const grouped = parsed.reduce<Record<string, ParsedAsset[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" />
      <Modal open={open} onClose={handleClose}
        title="Importar do Status Invest"
        subtitle="Importe sua carteira a partir do arquivo .xlsx exportado"
        width={700}>

        {/* IDLE */}
        {step === 'idle' && (
          <>
            <div onClick={() => fileRef.current?.click()} style={{
              border: `2px dashed ${C.gray200}`, borderRadius: '14px',
              padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
              background: C.gray50, transition: 'all .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.blue; (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gray200; (e.currentTarget as HTMLElement).style.background = C.gray50; }}
            >
              <Upload size={36} color={C.gray300} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: C.gray700, marginBottom: '6px' }}>Clique para selecionar o arquivo</div>
              <div style={{ fontSize: '13px', color: C.gray400, marginBottom: '12px' }}>Arquivo .xlsx exportado do Status Invest</div>
              <Badge color="blue">carteira-patrimonio-export.xlsx</Badge>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

            {parseErrors.length > 0 && (
              <div style={{ marginTop: '14px', padding: '12px 16px', background: '#FEF2F2', borderRadius: '8px', fontSize: '13px', color: C.red }}>
                {parseErrors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}

            <div style={{ marginTop: '18px', padding: '14px 18px', background: '#EFF6FF', borderRadius: '10px', borderLeft: `3px solid ${C.blue}` }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: C.blue, marginBottom: '6px' }}>Como exportar do Status Invest</div>
              <ol style={{ paddingLeft: '16px', fontSize: '12px', color: C.gray600, lineHeight: '1.9' }}>
                <li>Acesse <strong>statusinvest.com.br</strong> e faça login</li>
                <li>Vá em <strong>Minha Carteira → Patrimônio</strong></li>
                <li>Clique em <strong>Exportar → Excel (.xlsx)</strong></li>
                <li>Selecione o arquivo baixado aqui</li>
              </ol>
            </div>
            <ModalFooter><Button variant="ghost" onClick={handleClose}>Cancelar</Button></ModalFooter>
          </>
        )}

        {/* PARSING */}
        {step === 'parsing' && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Spinner />
            <div style={{ fontSize: '14px', fontWeight: '600', color: C.gray600, marginTop: '16px' }}>Lendo arquivo…</div>
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <Badge color="blue">{parsed.length} ativos</Badge>
              <Badge color="green">{parsed.filter(a => !a.skip).length} novos</Badge>
              {parsed.filter(a => a.skip).length > 0 && <Badge color="gray">{parsed.filter(a => a.skip).length} já existem</Badge>}
              <Badge color="amber">{selectedCount} selecionados</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
              <Button variant="ghost" size="xs" onClick={() => { const s: Record<string,boolean> = {}; parsed.filter(a => !a.skip).forEach(a => { s[a.ticker] = true; }); setSelected(s); }}>Selecionar todos</Button>
              <Button variant="ghost" size="xs" onClick={() => setSelected({})}>Limpar</Button>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(grouped).map(([cat, catAssets]) => (
                <div key={cat}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
                    {cat} · {catAssets.length}
                  </div>
                  {catAssets.map(asset => {
                    const isSel = !!selected[asset.ticker];
                    return (
                      <div key={asset.ticker}
                        onClick={() => { if (!asset.skip) setSelected(s => ({ ...s, [asset.ticker]: !s[asset.ticker] })); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 13px', borderRadius: '9px', cursor: asset.skip ? 'default' : 'pointer',
                          border: `1.5px solid ${asset.skip ? C.gray200 : isSel ? C.blue : C.gray200}`,
                          background: asset.skip ? C.gray50 : isSel ? '#EFF6FF' : C.white,
                          opacity: asset.skip ? 0.5 : 1, marginBottom: '5px', transition: 'all .12s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0, background: asset.skip ? C.gray200 : isSel ? C.blue : C.white, border: `2px solid ${asset.skip ? C.gray300 : isSel ? C.blue : C.gray300}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(isSel || asset.skip) && <div style={{ width: '5px', height: '5px', background: 'white', borderRadius: '1px' }} />}
                          </div>
                          <TickerBadge ticker={asset.ticker} />
                          {asset.skip && <Badge color="gray" style={{ fontSize: '10px' }}>já existe</Badge>}
                        </div>
                        <div style={{ display: 'flex', gap: '18px', textAlign: 'right' }}>
                          {[
                            { label: 'PM',        value: formatCurrency(asset.avg_price)     },
                            { label: 'Atual',     value: formatCurrency(asset.current_price) },
                            { label: 'Qtd',       value: String(asset.quantity)               },
                            { label: 'Patrimônio',value: formatCurrency(asset.patrimony), green: true },
                          ].map(({ label, value, green }) => (
                            <div key={label}>
                              <div style={{ fontSize: '10px', color: C.gray400 }}>{label}</div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', color: green ? C.green : C.gray800 }}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#EFF6FF', borderRadius: '8px', fontSize: '12px', color: C.blue }}>
              ℹ Classes serão criadas automaticamente se não existirem.
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button variant="primary" disabled={selectedCount === 0} onClick={handleImport}>
                Importar {selectedCount} ativo{selectedCount !== 1 ? 's' : ''}
              </Button>
            </ModalFooter>
          </>
        )}

        {/* IMPORTING — with live debug log */}
        {step === 'importing' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Spinner />
              <span style={{ fontSize: '14px', fontWeight: '600', color: C.gray600 }}>Importando…</span>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', background: C.gray50, borderRadius: '10px', padding: '12px', fontFamily: 'var(--mono)', fontSize: '12px' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', color: log.ok ? C.green : C.red }}>
                  <span>{log.ok ? '✓' : '✗'}</span>
                  <span style={{ fontWeight: '600', minWidth: '160px' }}>{log.step}</span>
                  <span style={{ color: C.gray500 }}>{log.detail}</span>
                </div>
              ))}
              {logs.length === 0 && <span style={{ color: C.gray400 }}>Iniciando…</span>}
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <CheckCircle size={48} color={imported > 0 ? C.green : C.amber} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '20px', fontWeight: '800', color: C.gray800 }}>
                {imported > 0 ? 'Importação concluída!' : 'Atenção — nenhum ativo importado'}
              </div>
              {imported > 0 && <Badge color="green" style={{ marginTop: '10px' }}>✓ {imported} importado{imported !== 1 ? 's' : ''}</Badge>}
            </div>

            {/* Full debug log */}
            <div style={{ background: C.gray50, borderRadius: '10px', padding: '12px', fontFamily: 'var(--mono)', fontSize: '11px', maxHeight: '220px', overflowY: 'auto' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.gray400, letterSpacing: '1px', marginBottom: '8px' }}>LOG COMPLETO</div>
              {logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px', color: log.ok ? '#16a34a' : C.red }}>
                  <span>{log.ok ? '✓' : '✗'}</span>
                  <span style={{ fontWeight: '600', minWidth: '180px' }}>{log.step}</span>
                  <span style={{ color: C.gray500 }}>{log.detail}</span>
                </div>
              ))}
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={handleClose}>Fechar</Button>
              {imported > 0 && <Button variant="primary" onClick={handleClose}>Ver Carteira</Button>}
            </ModalFooter>
          </div>
        )}
      </Modal>
    </>
  );
}

function Spinner() {
  return (
    <>
      <div style={{ width: '28px', height: '28px', border: `3px solid ${C.blue}22`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin .8s linear infinite', flexShrink: 0 }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
