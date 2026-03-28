import Link from 'next/link';
import { C } from '@/components/ui';

export const metadata = { title: 'Termos de Uso — SINED Invest' };

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px', fontFamily: 'var(--font)' }}>
      <Link href="/auth/login" style={{ color: C.blue, fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '40px' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0a1628', marginBottom: '8px' }}>Termos de Uso</h1>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '40px' }}>Última atualização: Março de 2026 · SINED Technologies LLC</p>

      {[
        { title: '1. Aceitação dos Termos', body: 'Ao utilizar o SINED Invest, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o serviço.' },
        { title: '2. Descrição do Serviço', body: 'O SINED Invest é uma plataforma de gestão e análise de portfólio de investimentos. O sistema fornece ferramentas de organização, visualização de dados e motor de recomendação baseado em parâmetros definidos pelo próprio usuário.' },
        { title: '3. Não é Consultoria Financeira', body: 'O SINED Invest NÃO é uma corretora, consultora de investimentos ou assessor financeiro regulamentado. Todas as informações, análises e recomendações geradas pela plataforma são de natureza educacional e informacional. Não constituem conselho de investimento personalizado. Decisões de investimento são de exclusiva responsabilidade do usuário.' },
        { title: '4. Precisão dos Dados', body: 'Os dados de preços e dividendos são obtidos de fontes públicas e podem apresentar atrasos ou imprecisões. O SINED Invest não garante a exatidão, completude ou pontualidade das informações apresentadas.' },
        { title: '5. Conta e Segurança', body: 'Você é responsável por manter a confidencialidade de suas credenciais de acesso. Notifique-nos imediatamente em caso de uso não autorizado de sua conta.' },
        { title: '6. Limitação de Responsabilidade', body: 'Em nenhuma circunstância o SINED Invest ou a SINED Technologies LLC serão responsáveis por perdas financeiras decorrentes do uso da plataforma. O uso é por conta e risco do usuário.' },
        { title: '7. Modificações', body: 'Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou notificação no sistema.' },
        { title: '8. Contato', body: 'Para dúvidas sobre estes termos, entre em contato: contato@sinedtech.com' },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{title}</h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.8' }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
