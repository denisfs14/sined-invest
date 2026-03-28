import Link from 'next/link';

export const metadata = { title: 'Como Funciona — SINED Invest' };

const S = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '60px 24px', fontFamily: 'var(--font)' } as React.CSSProperties,
  back: { color: '#1748c0', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '40px' } as React.CSSProperties,
  h1:   { fontSize: '28px', fontWeight: '800', color: '#0a1628', marginBottom: '8px' } as React.CSSProperties,
  sub:  { fontSize: '14px', color: '#94a3b8', marginBottom: '48px', lineHeight: '1.7' } as React.CSSProperties,
  card: { background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px', marginBottom: '20px' } as React.CSSProperties,
  tag:  { display: 'inline-block', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' as const, padding: '3px 10px', borderRadius: '20px', marginBottom: '12px' },
  h2:   { fontSize: '17px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' } as React.CSSProperties,
  p:    { fontSize: '14px', color: '#475569', lineHeight: '1.85', margin: '0 0 12px' } as React.CSSProperties,
  li:   { fontSize: '14px', color: '#475569', lineHeight: '1.85', marginBottom: '6px' } as React.CSSProperties,
  warn: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px 20px', marginTop: '32px' } as React.CSSProperties,
};

export default function MethodologyPage() {
  return (
    <div style={S.page}>
      <Link href="/" style={S.back}>← Voltar ao sistema</Link>

      <h1 style={S.h1}>Como o SINED Invest funciona</h1>
      <p style={S.sub}>
        Transparência total sobre nossa metodologia — quais dados usamos, como calculamos,
        e quais são as limitações do sistema.
      </p>

      {/* Motor de Recomendação */}
      <div style={S.card}>
        <span style={{ ...S.tag, background: '#EFF6FF', color: '#1748c0' }}>Motor de Decisão</span>
        <h2 style={S.h2}>Como o motor de recomendação funciona</h2>
        <p style={S.p}>O motor analisa sua carteira e calcula qual ativo comprar no próximo aporte seguindo estas etapas:</p>
        <ol style={{ paddingLeft: '20px' }}>
          {[
            'Divide o valor total disponível entre as classes (Ações, FIIs, Renda Fixa) conforme os percentuais definidos por você em Estratégia.',
            'Dentro de cada classe, ordena os ativos do mais subponderado para o mais sobreponderado (% atual na carteira vs peso ideal).',
            'Se "Priorizar Vermelhos" estiver ativo, ativos com preço abaixo do preço médio de compra recebem prioridade absoluta dentro da classe.',
            'Verifica se a compra respeitaria o limite máximo por ativo configurado em Estratégia.',
            'Calcula a quantidade de cotas comprável com o valor alocado para cada ativo.',
            'A sobra de cada ativo (valor não alocável em cotas inteiras) é redistribuída para o ativo mais subponderado da mesma classe.',
          ].map((step, i) => <li key={i} style={S.li}>{step}</li>)}
        </ol>
      </div>

      {/* Janela de Aporte */}
      <div style={S.card}>
        <span style={{ ...S.tag, background: '#F0FDF4', color: '#166534' }}>Janela de Aporte</span>
        <h2 style={S.h2}>O que é a "Janela de Aporte"</h2>
        <p style={S.p}>
          A Janela de Aporte indica o momento ideal para aportar com base nos proventos (dividendos e rendimentos)
          recebidos no mês. O objetivo é aportar após receber os proventos, maximizando o capital disponível.
        </p>
        <p style={S.p}>Modos disponíveis (configuráveis em Estratégia):</p>
        <ul style={{ paddingLeft: '20px' }}>
          {[
            ['Após último pagamento do mês', 'Aguarda o último provento esperado antes de sinalizar "momento ideal".'],
            ['Após 80% recebidos', 'Sinaliza quando 80% dos proventos esperados já foram recebidos.'],
            ['Apenas com recebidos', 'Usa apenas o que já entrou na conta, sem aguardar pendentes.'],
            ['Data fixa', 'Ignora proventos e aporta sempre numa data fixa do mês.'],
          ].map(([title, desc]) => (
            <li key={title} style={{ ...S.li, marginBottom: '10px' }}>
              <strong style={{ color: '#1e293b' }}>{title}:</strong> {desc}
            </li>
          ))}
        </ul>
      </div>

      {/* Dados utilizados */}
      <div style={S.card}>
        <span style={{ ...S.tag, background: '#FFF7ED', color: '#9a3412' }}>Fontes de Dados</span>
        <h2 style={S.h2}>Quais dados o sistema utiliza</h2>
        <ul style={{ paddingLeft: '20px' }}>
          {[
            ['Preços dos ativos', 'brapi.dev (API gratuita) — preços em tempo real da B3. Atualizado ao abrir o Dashboard.'],
            ['Proventos e dividendos', 'Yahoo Finance (via proxy) e brapi.dev — histórico dos últimos 12 meses.'],
            ['Dados da carteira', '100% inseridos pelo usuário — quantidade, preço médio, classes e estratégia.'],
            ['Percentuais e limites', 'Definidos pelo próprio usuário em Estratégia — o sistema não impõe valores.'],
          ].map(([title, desc]) => (
            <li key={title} style={{ ...S.li, marginBottom: '10px' }}>
              <strong style={{ color: '#1e293b' }}>{title}:</strong> {desc}
            </li>
          ))}
        </ul>
      </div>

      {/* Limitações */}
      <div style={{ ...S.card, border: '1px solid #FECACA' }}>
        <span style={{ ...S.tag, background: '#FEF2F2', color: '#dc2626' }}>Limitações</span>
        <h2 style={S.h2}>O que o sistema NÃO faz</h2>
        <ul style={{ paddingLeft: '20px' }}>
          {[
            'Não analisa fundamentos das empresas (P/L, P/VP, ROIC, etc.)',
            'Não considera contexto macroeconômico ou análise setorial',
            'Não prevê valorização ou desvalorização de ativos',
            'Não garante que os preços de mercado estejam 100% atualizados',
            'Não substitui a avaliação de um analista ou assessor certificado',
            'Não leva em conta seu perfil de risco individual regulamentado',
          ].map((item, i) => <li key={i} style={{ ...S.li, color: '#dc2626' }}>{item}</li>)}
        </ul>
      </div>

      {/* Aviso */}
      <div style={S.warn}>
        <strong style={{ fontSize: '13px', color: '#92400e' }}>⚠️ Informação importante</strong>
        <p style={{ fontSize: '13px', color: '#92400e', margin: '6px 0 0', lineHeight: '1.7' }}>
          O SINED Invest é uma ferramenta de organização e auxílio à decisão. Não é um serviço de consultoria
          de investimentos regulamentado pela CVM ou qualquer outra entidade. Tome suas decisões com base em
          sua própria análise e, se necessário, consulte um profissional certificado.
        </p>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Link href="/legal/terms"   style={{ fontSize: '13px', color: '#1748c0' }}>Termos de Uso</Link>
        <Link href="/legal/privacy" style={{ fontSize: '13px', color: '#1748c0' }}>Política de Privacidade</Link>
        <Link href="/legal/risk"    style={{ fontSize: '13px', color: '#dc2626' }}>Divulgação de Riscos</Link>
      </div>
    </div>
  );
}
