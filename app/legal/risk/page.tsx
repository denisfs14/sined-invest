import Link from 'next/link';

export const metadata = { title: 'Divulgação de Riscos — SINED Invest' };

export default function RiskPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px', fontFamily: 'var(--font)' }}>
      <Link href="/auth/login" style={{ color: '#1748c0', fontSize: '13px', textDecoration: 'none', marginBottom: '40px', display: 'block' }}>
        ← Voltar
      </Link>
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '20px 24px', marginBottom: '40px' }}>
        <div style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626', marginBottom: '8px' }}>⚠️ Divulgação Importante de Riscos</div>
        <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: '1.8', margin: 0 }}>
          Investir em ativos financeiros envolve riscos significativos, incluindo a possibilidade de perda do capital investido. Resultados passados não garantem resultados futuros.
        </p>
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0a1628', marginBottom: '32px' }}>Divulgação de Riscos</h1>

      {[
        { title: 'Risco de Mercado', body: 'Os preços dos ativos financeiros flutuam constantemente em resposta a condições econômicas, políticas e de mercado. Você pode perder parte ou todo o capital investido.' },
        { title: 'Risco de Liquidez', body: 'Alguns ativos podem ter baixa liquidez, dificultando a venda pelo preço desejado no momento desejado.' },
        { title: 'Risco de Dividendos', body: 'O pagamento de dividendos e rendimentos de FIIs não é garantido. Empresas e fundos podem reduzir ou suspender pagamentos a qualquer momento.' },
        { title: 'Risco do Motor de Recomendação', body: 'O motor de recomendação do SINED Invest é baseado em parâmetros matemáticos definidos pelo usuário. Não considera fatores qualitativos, análise fundamentalista profunda, contexto macroeconômico ou perfil de risco individual regulamentado.' },
        { title: 'Limitações dos Dados', body: 'Os dados de preços e dividendos podem apresentar atrasos, inconsistências ou erros. Sempre verifique informações críticas em fontes oficiais antes de tomar decisões.' },
        { title: 'Não é Conselho Financeiro', body: 'O SINED Invest não é um consultor de investimentos regulamentado. Nenhuma informação na plataforma constitui conselho de investimento personalizado. Considere consultar um profissional certificado antes de investir.' },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{title}</h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.8', margin: 0 }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
