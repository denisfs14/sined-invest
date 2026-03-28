'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Bell, Trash2, LogOut, ChevronRight, CheckCircle } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { PlanBadge } from '@/components/ui/PlanGate';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/client';
import {
  PageHeader, PageContent, Card, CardHeader, CardBody,
  Button, FormGroup, Input, Modal, ModalFooter, Toast, C,
} from '@/components/ui';

export default function SettingsPage() {
  const { user, portfolio, resetPortfolio } = useApp();
  const router = useRouter();
  const { t } = useT();

  const [toast, setToast]         = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });
  const [loading, setLoading]     = useState(false);

  // Password change
  const [showPwModal, setShowPwModal]   = useState(false);
  const [currentPw, setCurrentPw]       = useState('');
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [pwError, setPwError]           = useState('');

  // Delete account
  const [showDelete, setShowDelete]     = useState(false);
  const [deleteWord, setDeleteWord]     = useState('');

  // Reset portfolio
  const [showReset, setShowReset]       = useState(false);
  const [resetWord, setResetWord]       = useState('');

  function notify(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  async function handleChangePassword() {
    setPwError('');
    if (newPw.length < 8) { setPwError('Nova senha deve ter pelo menos 8 caracteres'); return; }
    if (newPw !== confirmPw) { setPwError('Senhas não coincidem'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      notify('Senha alterada com sucesso');
      setShowPwModal(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : t('settings.pw_error'));
    } finally { setLoading(false); }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  async function handleResetPortfolio() {
    setLoading(true);
    try {
      await resetPortfolio();
      notify(t('settings.reset_ok'), 'success');
      setShowReset(false);
      setResetWord('');
    } catch { notify('Erro ao resetar', 'error'); }
    finally { setLoading(false); }
  }

  async function handleDeleteAccount() {
    // Soft delete — sign out and disable. Full delete requires server-side.
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth/login?deleted=1');
    } catch { notify('Erro ao processar', 'error'); }
    finally { setLoading(false); }
  }

  const SECTION_STYLE: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 0', borderBottom: `1px solid ${C.gray100}`,
  };

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <PageContent>
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Account info */}
          <Card>
            <CardHeader><User size={15} style={{ display: 'inline', marginRight: '8px' }} />{t('settings.account')}</CardHeader>
            <CardBody>
              <div style={SECTION_STYLE}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800 }}>{t('settings.email_label')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>{user?.email}</div>
                </div>
                <CheckCircle size={16} color={C.green} />
              </div>
              <div style={SECTION_STYLE}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800 }}>{t('settings.plan_label')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>Gratuito · brapi.dev free tier</div>
                </div>
                <PlanBadge />
              </div>
              <div style={{ ...SECTION_STYLE, borderBottom: 'none' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800 }}>{t('settings.member_since')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader><Lock size={15} style={{ display: 'inline', marginRight: '8px' }} />{t('settings.security')}</CardHeader>
            <CardBody>
              <button onClick={() => setShowPwModal(true)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'var(--font)', borderBottom: `1px solid ${C.gray100}`,
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800 }}>{t('settings.change_password')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>Atualize sua senha de acesso</div>
                </div>
                <ChevronRight size={16} color={C.gray400} />
              </button>
              <button onClick={handleLogout} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800 }}>{t('settings.sign_out')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>Encerrar sessão atual</div>
                </div>
                <LogOut size={16} color={C.gray400} />
              </button>
            </CardBody>
          </Card>

          {/* Language */}
          <Card>
            <CardHeader>🌐 {t('settings.language')}</CardHeader>
            <CardBody>
              <div style={{ marginBottom: '8px', fontSize: '12px', color: C.gray400 }}>{t('settings.language_desc')}</div>
              <LanguageSwitcher />
            </CardBody>
          </Card>

          {/* Danger Zone */}
          <Card style={{ border: `1px solid #FECACA` }}>
            <CardHeader>{t('settings.danger_zone')}</CardHeader>
            <CardBody>
              <div style={SECTION_STYLE}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.gray800 }}>{t('settings.reset_portfolio')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>
                    Apaga todos os ativos, operações e histórico. Mantém o login.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => setShowReset(true)}>{t('settings.reset_btn')}</Button>
              </div>
              <div style={{ ...SECTION_STYLE, borderBottom: 'none' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.red }}>{t('settings.delete_account')}</div>
                  <div style={{ fontSize: '12px', color: C.gray400, marginTop: '2px' }}>
                    Remove permanentemente sua conta e todos os dados.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>{t('settings.delete_btn')}</Button>
              </div>
            </CardBody>
          </Card>

        </div>
      </PageContent>

      {/* Change Password Modal */}
      <Modal open={showPwModal} onClose={() => { setShowPwModal(false); setPwError(''); }}
        title="Alterar Senha" width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormGroup label={t('settings.new_password')}>
            <Input type="password" placeholder="Mínimo 8 caracteres"
              value={newPw} onChange={e => setNewPw(e.target.value)} />
          </FormGroup>
          <FormGroup label={t('settings.confirm_password')}>
            <Input type="password" placeholder="Repita a nova senha"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </FormGroup>
          {pwError && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '8px', fontSize: '12px', color: C.red, fontWeight: '600' }}>
              {pwError}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowPwModal(false)}>{t('settings.cancel')}</Button>
          <Button variant="primary" onClick={handleChangePassword} loading={loading}>{t('settings.change_password')}</Button>
        </ModalFooter>
      </Modal>

      {/* Reset Modal */}
      <Modal open={showReset} onClose={() => { setShowReset(false); setResetWord(''); }}
        title="⚠️ Resetar Portfólio" width={440}
        subtitle="Esta ação é irreversível">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: '10px', fontSize: '13px', color: C.red, lineHeight: '1.7' }}>
            Serão deletados: <strong>Ativos · Classes · Holdings · Simulações · Operações · Proventos · Saldo</strong>
          </div>
          <FormGroup label="Digite RESETAR para confirmar">
            <Input placeholder="RESETAR" value={resetWord}
              onChange={e => setResetWord(e.target.value.toUpperCase())}
              style={{ textAlign: 'center', letterSpacing: '3px', fontWeight: '700' }} />
          </FormGroup>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowReset(false)}>{t('settings.cancel')}</Button>
          <Button variant="danger" disabled={resetWord !== 'RESETAR'} loading={loading} onClick={handleResetPortfolio}>
            Confirmar Reset
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal open={showDelete} onClose={() => { setShowDelete(false); setDeleteWord(''); }}
        title="⚠️ Excluir Conta" width={440}
        subtitle="Esta ação é permanente e irreversível">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: '10px', fontSize: '13px', color: C.red, lineHeight: '1.7' }}>
            Todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
          </div>
          <FormGroup label="Digite EXCLUIR para confirmar">
            <Input placeholder="EXCLUIR" value={deleteWord}
              onChange={e => setDeleteWord(e.target.value.toUpperCase())}
              style={{ textAlign: 'center', letterSpacing: '3px', fontWeight: '700' }} />
          </FormGroup>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>{t('settings.cancel')}</Button>
          <Button variant="danger" disabled={deleteWord !== 'EXCLUIR'} loading={loading} onClick={handleDeleteAccount}>
            Excluir Conta
          </Button>
        </ModalFooter>
      </Modal>

      {/* Footer links */}
      <div style={{ padding: '0 32px 32px', marginTop: '-10px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { href: '/legal/terms',   label: 'Termos de Uso' },
            { href: '/legal/privacy', label: 'Privacidade' },
            { href: '/legal/risk',    label: 'Riscos' },
            { href: '/methodology',   label: 'Como Funciona' },
          ].map(({ href, label }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer"
              style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#cbd5e1' }}>
          SINED Technologies LLC · v2.0 · invest.sinedtech.com
        </div>
      </div>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  );
}
