// ExportPDF.jsx — Flyguer BarberShop
// ✅ Passo 14 — Exportar relatório financeiro em PDF
// Usa window.print() com CSS @media print — funciona em todos os navegadores

import React from 'react';

function moeda(v) { return `R$ ${(v||0).toFixed(2).replace('.',',')}`; }

export default function ExportPDF({ dados, data, dark }) {
  const [gerando, setGerando] = React.useState(false);

  function gerarPDF() {
    setGerando(true);

    // Criar conteúdo HTML do relatório
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Relatório Financeiro — Flyguer BarberShop</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; color: #1A0F0D; background: #fff; padding: 32px; }
    .header { text-align: center; border-bottom: 3px solid #8B3A2A; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 900; color: #8B3A2A; letter-spacing: 1px; }
    .subtitle { font-size: 13px; color: #9A8880; margin-top: 4px; }
    .data { font-size: 16px; font-weight: 700; color: #5C2218; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .card { background: #f9f5f0; border: 1px solid #e5d5cc; border-radius: 12px; padding: 16px; }
    .card-label { font-size: 11px; color: #9A8880; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .card-value { font-size: 22px; font-weight: 700; color: #1A0F0D; }
    .card-value.gold { color: #8B3A2A; }
    .section-title { font-size: 16px; font-weight: 700; color: #5C2218; margin-bottom: 12px; border-left: 4px solid #8B3A2A; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #5C2218; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; }
    td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f0e8e0; }
    tr:nth-child(even) td { background: #fdf8f5; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
    .badge-ok { background: rgba(46,125,122,0.15); color: #2E7D7A; }
    .badge-pend { background: rgba(255,193,7,0.15); color: #A07830; }
    .badge-cancel { background: rgba(244,67,54,0.15); color: #F44336; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9A8880; border-top: 1px solid #e5d5cc; padding-top: 16px; }
    .barbeiro-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0e8e0; }
    .bar { height: 6px; background: #e5d5cc; border-radius: 3px; margin-top: 4px; }
    .bar-fill { height: 100%; background: #8B3A2A; border-radius: 3px; }
    @media print {
      body { padding: 16px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo">✂️ Flyguer BarberShop</div>
    <div class="subtitle">Shopping Cidade das Artes — Piso 2, Nº 22</div>
    <div class="data">Relatório Financeiro — ${dados.dataFormatada || data}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Total do dia</div>
      <div class="card-value gold">${moeda(dados.totalGeral)}</div>
    </div>
    <div class="card">
      <div class="card-label">Agendamentos</div>
      <div class="card-value">${dados.totalAgendamentos || 0}</div>
    </div>
    <div class="card">
      <div class="card-label">Concluídos</div>
      <div class="card-value">${dados.totalConcluidos || 0}</div>
    </div>
    <div class="card">
      <div class="card-label">Via Pix</div>
      <div class="card-value">${moeda(dados.totalPix)}</div>
    </div>
  </div>

  ${dados.barbeiros && dados.barbeiros.length > 0 ? `
  <div class="section-title">Ranking de Barbeiros</div>
  <table>
    <thead>
      <tr>
        <th>Barbeiro</th>
        <th>Atendimentos</th>
        <th>Concluídos</th>
        <th>Faturamento</th>
      </tr>
    </thead>
    <tbody>
      ${dados.barbeiros.map((b, i) => `
      <tr>
        <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${b.nome}</td>
        <td>${b.qtd}</td>
        <td>${b.concluidos}</td>
        <td><strong>${moeda(b.total)}</strong></td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${dados.agendamentos && dados.agendamentos.length > 0 ? `
  <div class="section-title">Detalhes dos Atendimentos</div>
  <table>
    <thead>
      <tr>
        <th>Horário</th>
        <th>Cliente</th>
        <th>Barbeiro</th>
        <th>Serviço</th>
        <th>Pagamento</th>
        <th>Valor</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${dados.agendamentos.map(ag => `
      <tr>
        <td>${ag.hora}</td>
        <td>${ag.clienteNome?.split(' ').slice(0,2).join(' ') || '—'}</td>
        <td>${ag.barbeiroNome || '—'}</td>
        <td>${ag.servico || '—'}</td>
        <td>${ag.pagamento === 'pix' || ag.pagamento === 'pix_sinal' ? '💳 Pix' : '💵 Local'}</td>
        <td>${ag.status?.includes('cancelado') ? '—' : moeda(ag.valor)}</td>
        <td>
          <span class="badge ${ag.status === 'concluido' ? 'badge-ok' : ag.status?.includes('cancelado') ? 'badge-cancel' : 'badge-pend'}">
            ${ag.status === 'concluido' ? '✓ Concluído' : ag.status?.includes('cancelado') ? '✗ Cancelado' : '● Confirmado'}
          </span>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">
    Relatório gerado em ${new Date().toLocaleString('pt-BR')} — Flyguer BarberShop © 2026
  </div>

</body>
</html>`;

    // Abrir janela de impressão
    const janela = window.open('', '_blank', 'width=800,height=600');
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    setTimeout(() => {
      janela.print();
      setGerando(false);
    }, 500);
  }

  return (
    <button
      onClick={gerarPDF}
      disabled={gerando}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderRadius: '10px', border: 'none',
        background: gerando ? '#2E1A14' : 'linear-gradient(135deg,#5C2218,#8B3A2A)',
        color: gerando ? '#555' : '#F5EFE6',
        fontSize: '12px', fontWeight: '700', cursor: gerando ? 'wait' : 'pointer',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {gerando ? '⏳ Gerando...' : '📄 Exportar PDF'}
    </button>
  );
}
