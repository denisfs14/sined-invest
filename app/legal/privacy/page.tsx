import Link from 'next/link';
import { C } from '@/components/ui';

export const metadata = { title: 'Política de Privacidade — SINED Invest' };

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px', fontFamily: 'var(--font)' }}>
      <Link href="/auth/login" style={{ color: C.blue, fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '40px' }}>
        ← Voltar
      </Link>
      <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0a1628', marginBottom: '8px' }}>Política de Privacidade</h1>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '40px' }}>Última atualização: Março de 2026 · SINED Technologies LLC</p>

      {[
        { title: '1. Dados Coletados', body: 'Coletamos: e-mail e senha para autenticação; dados de portfólio inseridos manualmente pelo usuário (ativos, preços médios, quantidades); histórico de simulações e operações.' },
        { title: '2. Uso dos Dados', body: 'Seus dados são utilizados exclusivamente para fornecer as funcionalidades da plataforma. Não vendemos, compartilhamos ou monetizamos dados pessoais de usuários.' },
        { title: '3. Armazenamento', body: 'Os dados são armazenados de forma segura na plataforma Supabase (PostgreSQL), com criptografia em repouso e em trânsito. Os servidores estão localizados nos Estados Unidos.' },
        { title: '4. Dados de Mercado', body: 'Preços e informações de ativos são obtidos de APIs públicas (brapi.dev, Yahoo Finance). Não armazenamos dados de mercado de forma permanente.' },
        { title: '5. Cookies', body: 'Utilizamos apenas cookies estritamente necessários para manutenção da sessão autenticada. Não utilizamos cookies de rastreamento ou publicidade.' },
        { title: '6. Seus Direitos', body: 'Você pode solicitar exclusão de todos os seus dados a qualquer momento através das Configurações da conta. Responderemos em até 30 dias.' },
        { title: '7. Contato', body: 'Para questões de privacidade: contato@sinedtech.com' },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{title}</h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.8' }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
