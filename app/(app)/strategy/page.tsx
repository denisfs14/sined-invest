'use client';

import { useT } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { AssetClass, ContributionTimingMode } from '@/types';
import { getTimingModeLabel } from '@/lib/calculations/dividend-calendar';
import { formatPercent } from '@/utils/format';
import {
  PageHeader, PageContent, Card, CardHeader, CardBody,
  Button, Badge, Toggle, EmptyState, Modal, ModalFooter,
  FormGroup, Input, Toast, C,
} from '@/components/ui';

// ─── Local state for the whole allocation block ───────────────────────────────
interface ClassDraft {
  id: string;
  name: string;
  target_percentage: number;
  contribution_percentage: number;
  top_n: number;
}

export default function StrategyPage() {
  const { t } = useT();
  const { strategy, classes, assets, portfolio, updateStrategy, addClass, deleteClass, updateClass } = useApp();


  // Draft state — editable, only saved on button click
  const [drafts, setDrafts]   = useState<ClassDraft[]>([]);
  const [dirty, setDirty]     = useState(false);
  const [saving, setSaving]   = useState(false);

  const [showClass, setShowClass]       = useState(false);
  const [className, setClassName]       = useState('');
  const [classTarget, setClassTarget]   = useState('');
  const [classContrib, setClassContrib] = useState('');
  const [classTopN, setClassTopN]       = useState('1');
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });

  // Sync drafts when classes load/refresh
  useEffect(() => {
    setDrafts(classes.map(c => ({
      id: c.id,
      name: c.name,
      target_percentage: c.target_percentage,
      contribution_percentage: c.contribution_percentage || 0,
      top_n: c.top_n || 1,
    })));
    setDirty(false);
  }, [classes]);

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  function upd(k: string, v: unknown) {
    updateStrategy({ [k]: v });
    notify('Atualizado');
  }

  function updateDraft(id: string, field: keyof ClassDraft, value: number) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    setDirty(true);
  }

  async function saveAllClasses() {
    setSaving(true);
    try {
      await Promise.all(
        drafts.map(d => updateClass(d.id, {
          contribution_percentage: d.contribution_percentage,
          top_n: d.top_n,
        }))
      );
      setDirty(false);
      notify('Alocação salva com sucesso ✓');
    } catch {
      notify('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveClass() {
    if (!className.trim()) return;
    await addClass({
      portfolio_id: portfolio.id,
      name: className.trim(),
      target_percentage: parseFloat(classTarget) || 0,
      contribution_percentage: parseFloat(classContrib) || 0,
      top_n: parseInt(classTopN) || 1,
    });
    setClassName(''); setClassTarget(''); setClassContrib(''); setClassTopN('1');
    setShowClass(false);
    notify('Classe criada');
  }

  function handleDelete(id: string) {
    const cls = classes.find(c => c.id === id);
    if (!cls || !confirm(`Remover classe "${cls.name}"?`)) return;
    deleteClass(id);
    notify('Classe removida');
  }

  const totalContribPct = drafts.reduce((s, d) => s + (d.contribution_percentage || 0), 0);
  const isOver  = totalContribPct > 100;

  const stepBtn: React.CSSProperties = {
    width: '36px', height: '36px',
    background: C.white, border: `2px solid ${C.gray200}`,
    borderRadius: '8px', cursor: 'pointer',
    fontSize: '20px', fontWeight: '700', color: C.gray700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <>
      <PageHeader title={t('strategy.title')} subtitle="Configure o motor de recomendação" />
      <PageContent>

        {/* ── ALOCAÇÃO POR CLASSE ── */}
        <Card style={{ marginBottom: '20px', border: `1px solid ${isOver ? C.red : dirty ? C.amber : C.gray200}` }}>
          <CardHeader action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '120px', height: '6px', background: C.gray100, borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(totalContribPct, 100)}%`,
                    background: isOver ? C.red : totalContribPct === 100 ? C.green : C.blue,
                    transition: 'width .3s, background .3s',
                  }} />
                </div>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '800',
                  color: isOver ? C.red : totalContribPct === 100 ? C.green : C.blue,
                }}>
                  {totalContribPct.toFixed(0)}%
                </span>
              </div>

              {/* Save button — only shows when dirty */}
              {dirty && (
                <Button
                  variant="gold"
                  size="sm"
                  loading={saving}
                  onClick={saveAllClasses}
                >
                  <Save size={13} />
                  {saving ? 'Salvando…' : 'Salvar Alterações'}
                </Button>
              )}

              <Button variant="primary" size="sm" onClick={() => setShowClass(true)}>
                <Plus size={13} /> Nova Classe
              </Button>
            </div>
          }>
            🗂️ Alocação por Classe
          </CardHeader>
          <CardBody>
            {dirty && !saving && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#FFFBEB', borderRadius: '8px', fontSize: '12px', color: C.amber, fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚠️ Você tem alterações não salvas</span>
                <Button variant="gold" size="xs" onClick={saveAllClasses} loading={saving}>
                  <Save size={11} /> Salvar agora
                </Button>
              </div>
            )}

            {isOver && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#FEF2F2', borderRadius: '8px', fontSize: '12px', color: C.red, fontWeight: '600' }}>
                ⚠️ Total passa de 100% ({totalContribPct.toFixed(0)}%). Ajuste as percentagens.
              </div>
            )}

            {drafts.length === 0 ? (
              <EmptyState icon="📂" title="Nenhuma classe configurada"
                description="Crie classes como Ações BR, FIIs, Renda Fixa e defina quanto do aporte vai para cada uma"
                action={<Button variant="primary" size="sm" onClick={() => setShowClass(true)}>+ Nova Classe</Button>}
              />
            ) : (
              <>
                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px 200px 90px 44px',
                  gap: '16px', padding: '8px 0 12px',
                  borderBottom: `1px solid ${C.gray200}`,
                  fontSize: '10px', fontWeight: '700', color: C.gray400,
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  <span>Classe</span>
                  <span>% do Aporte Mensal</span>
                  <span>Qtd. Ativos (Top N)</span>
                  <span>Total</span>
                  <span></span>
                </div>

                {drafts.map(draft => {
                  const assetCount = assets.filter(a => a.asset_class_id === draft.id).length;
                  return (
                    <div key={draft.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 220px 200px 90px 44px',
                      gap: '16px', padding: '18px 0',
                      borderBottom: `1px solid ${C.gray50}`,
                      alignItems: 'center',
                    }}>
                      {/* Name */}
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: C.gray800 }}>{draft.name}</div>
                        {draft.target_percentage > 0 && (
                          <div style={{ fontSize: '11px', color: C.gray400, marginTop: '2px' }}>
                            Alvo carteira: {formatPercent(draft.target_percentage)}
                          </div>
                        )}
                      </div>

                      {/* % do aporte */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="0" max="100" step="1"
                            value={draft.contribution_percentage === 0 ? '' : draft.contribution_percentage}
                            placeholder="0"
                            onChange={e => updateDraft(draft.id, 'contribution_percentage', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '90px', textAlign: 'center',
                              padding: '10px 26px 10px 12px',
                              borderRadius: '10px',
                              border: `2px solid ${draft.contribution_percentage > 0 ? C.blue : C.gray200}`,
                              fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '800',
                              color: draft.contribution_percentage > 0 ? C.blue : C.gray400,
                              outline: 'none',
                              background: draft.contribution_percentage > 0 ? '#EFF6FF' : C.white,
                              transition: 'border-color .15s',
                            }}
                            onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = '0 0 0 3px rgba(23,68,192,.12)'; }}
                            onBlur={e  => { e.target.style.boxShadow = 'none'; }}
                          />
                          <span style={{
                            position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)',
                            fontSize: '14px', fontWeight: '700',
                            color: draft.contribution_percentage > 0 ? C.blue : C.gray400,
                            pointerEvents: 'none',
                          }}>%</span>
                        </div>
                        {/* Bar */}
                        <div style={{ flex: 1, height: '6px', background: C.gray100, borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(draft.contribution_percentage, 100)}%`,
                            background: draft.contribution_percentage > 0 ? C.blue : C.gray200,
                            transition: 'width .3s',
                          }} />
                        </div>
                      </div>

                      {/* Top N */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          style={stepBtn}
                          onClick={() => updateDraft(draft.id, 'top_n', Math.max(1, draft.top_n - 1))}
                        >−</button>
                        <div style={{
                          minWidth: '36px', textAlign: 'center',
                          fontSize: '24px', fontWeight: '800',
                          color: C.gray800, fontFamily: 'var(--mono)',
                        }}>
                          {draft.top_n}
                        </div>
                        <button
                          style={stepBtn}
                          onClick={() => updateDraft(draft.id, 'top_n', draft.top_n + 1)}
                        >+</button>
                        <span style={{ fontSize: '12px', color: C.gray400 }}>
                          ativo{draft.top_n !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Asset count */}
                      <Badge color={assetCount === 0 ? 'gray' : 'blue'}>
                        {assetCount}
                      </Badge>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(draft.id)}
                        style={{ background: '#FEF2F2', border: 'none', borderRadius: '7px', padding: '8px 10px', cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                {/* Total footer */}
                <div style={{
                  marginTop: '16px', padding: '16px 20px',
                  background: isOver ? '#FEF2F2' : totalContribPct === 100 ? '#F0FDF4' : '#FFFBEB',
                  borderRadius: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.gray700 }}>
                      Total alocado no aporte
                    </div>
                    <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>
                      {totalContribPct === 100
                        ? '✓ Alocação completa'
                        : isOver
                        ? `Reduzir ${(totalContribPct - 100).toFixed(0)}% para ajustar`
                        : `Faltam ${(100 - totalContribPct).toFixed(0)}% para completar`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {dirty && (
                      <Button variant="gold" size="sm" onClick={saveAllClasses} loading={saving}>
                        <Save size={13} />
                        {saving ? 'Salvando…' : 'Salvar'}
                      </Button>
                    )}
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: '800',
                      color: isOver ? C.red : totalContribPct === 100 ? C.green : C.amber,
                    }}>
                      {totalContribPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* ── PARÂMETROS GLOBAIS (sem Top N) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <Card>
            <CardHeader>⚙️ Parâmetros Globais</CardHeader>
            <CardBody>
              <Row title="Limite Máximo por Ativo" desc="% máximo que um ativo pode ocupar na carteira">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BtnStep onClick={() => upd('max_percentage', Math.max(1, strategy.max_percentage - 1))}>−</BtnStep>
                  <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--mono)', minWidth: '52px', textAlign: 'center', color: C.gray800 }}>
                    {strategy.max_percentage}%
                  </span>
                  <BtnStep onClick={() => upd('max_percentage', Math.min(100, strategy.max_percentage + 1))}>+</BtnStep>
                </div>
              </Row>
              <Row title="Priorizar Vermelhos" desc="Preferência para ativos marcados como oportunidade">
                <Toggle value={strategy.prioritize_red} onChange={v => upd('prioritize_red', v)} />
              </Row>
              <Row title="Fallback para Menor %" desc="Se vermelhos excederem limite, usar menor alocado">
                <Toggle value={strategy.fallback_to_lowest} onChange={v => upd('fallback_to_lowest', v)} />
              </Row>
              <Row title="Arredondar Cotas (floor)" desc="Cotas inteiras — sobra vai para caixa" last>
                <Toggle value={strategy.round_shares} onChange={v => upd('round_shares', v)} />
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>📖 Como Funciona</CardHeader>
            <CardBody>
              <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: C.gray600, lineHeight: '1.65' }}>
                <li>Divide o aporte entre classes pelo <strong>% configurado acima</strong></li>
                <li>Em cada classe, seleciona os <strong>Top N mais subponderados</strong></li>
                <li>Prioriza <strong>vermelhos elegíveis</strong> dentro de cada classe</li>
                <li>Garante que nenhum ativo ultrapassa <strong>{formatPercent(strategy.max_percentage)}</strong></li>
                <li>Distribui igualmente entre os selecionados de cada classe</li>
                <li>Calcula cotas {strategy.round_shares ? '(inteiras)' : '(fracionadas)'} e sobra de caixa</li>
              </ol>
              <div style={{ marginTop: '16px', padding: '12px 14px', background: '#EFF6FF', borderRadius: '8px', borderLeft: `3px solid ${C.blue}`, fontSize: '12px', color: C.blue, lineHeight: '1.9' }}>
                <strong>Exemplo — R$1.000 de aporte:</strong><br/>
                Ações BR 60% · Top 2 → R$600 ÷ 2 = <strong>R$300 por ativo</strong><br/>
                FIIs 30% · Top 2 → R$300 ÷ 2 = <strong>R$150 por ativo</strong><br/>
                Renda Fixa 10% · Top 1 → <strong>R$100 no ativo</strong>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ── TIMING MODE ── */}
        <Card>
          <CardHeader>🕐 Modo de Janela de Aporte</CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {(['after_last_payment', 'after_percentage_received', 'current_received_only', 'fixed_date'] as ContributionTimingMode[]).map(mode => {
                const active = strategy.contribution_timing_mode === mode;
                return (
                  <button key={mode} onClick={() => upd('contribution_timing_mode', mode)} style={{
                    padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${active ? C.blue : C.gray200}`,
                    background: active ? '#EFF6FF' : C.white, transition: 'all .15s',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: active ? C.blue : C.gray700, marginBottom: '3px' }}>
                      {active ? '● ' : '○ '}{getTimingModeLabel(mode)}
                    </div>
                    <div style={{ fontSize: '11px', color: C.gray400 }}>
                      {mode === 'after_last_payment'        && 'Aguarda o último provento do mês antes de sugerir aporte'}
                      {mode === 'after_percentage_received' && 'Aguarda ao menos 80% dos proventos esperados serem recebidos'}
                      {mode === 'current_received_only'     && 'Usa apenas o que já foi recebido na conta'}
                      {mode === 'fixed_date'                && 'Aporta em data fixa, independente de proventos'}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
</PageContent>

      {/* Nova classe modal */}
      <Modal open={showClass} onClose={() => setShowClass(false)}
        title="Nova Classe de Ativos" width={480}
        subtitle="Configure o nome e as regras de aporte desta classe">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormGroup label="Nome da Classe *">
            <Input placeholder="Ex: Ações BR, FIIs, Renda Fixa..."
              value={className} onChange={e => setClassName(e.target.value)} />
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormGroup label="% do Aporte destinado">
              <div style={{ position: 'relative' }}>
                <Input type="number" min="0" max="100" step="1" placeholder="Ex: 60"
                  value={classContrib} onChange={e => setClassContrib(e.target.value)} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: C.gray400, fontSize: '13px', pointerEvents: 'none' }}>%</span>
              </div>
            </FormGroup>
            <FormGroup label="Top N — Qtd. ativos a comprar">
              <Input type="number" min="1" max="20" placeholder="Ex: 2"
                value={classTopN} onChange={e => setClassTopN(e.target.value)} />
            </FormGroup>
          </div>
          <FormGroup label="% Alvo na Carteira (opcional)">
            <div style={{ position: 'relative' }}>
              <Input type="number" min="0" max="100" step="1" placeholder="Ex: 40"
                value={classTarget} onChange={e => setClassTarget(e.target.value)} />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: C.gray400, fontSize: '13px', pointerEvents: 'none' }}>%</span>
            </div>
          </FormGroup>
          <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: '8px', fontSize: '12px', color: C.blue, lineHeight: '1.8' }}>
            <strong>% do Aporte</strong> = fatia mensal destinada a esta classe (ex: 60%)<br/>
            <strong>Top N</strong> = quantos ativos desta classe serão selecionados para compra (ex: 2)
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowClass(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveClass}>Criar Classe</Button>
        </ModalFooter>
      </Modal>



      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  );
}

function BtnStep({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '34px', height: '34px',
      background: C.gray100, border: `1px solid ${C.gray200}`,
      borderRadius: '8px', cursor: 'pointer',
      fontSize: '20px', fontWeight: '700', color: C.gray600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  );
}

function Row({ title, desc, children, last }: {
  title: string; desc: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: last ? 'none' : `1px solid ${C.gray100}` }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: C.gray800 }}>{title}</div>
        <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0, marginLeft: '16px' }}>{children}</div>
    </div>
  );
}
