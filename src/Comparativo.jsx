// Comparativo.jsx — Flyguer BarberShop
// ✅ Passo 14 — Ranking e comparativo de barbeiros
// Período: hoje / semana / mês
// Métricas: faturamento, atendimentos, média avaliação

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function hoje() { return new Date().toISOString().split('T')[0]; }
function moeda(v) { return `R$ ${(v||0).toFixed(2).replace('.',',')}`; }

function inicioPeriodo(periodo) {
  const d = new Date();
  if (periodo === 'semana') d.setDate(d.getDate() - 6);
  if (periodo === 'mes')    d.setDate(1);
  return d.toISOString().split('T')[0];
}

export default function Comparativo({ onBack, dark }) {
  const s = getStyles(dark);
  const [periodo, setPeriodo] = React.useState('hoje');
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [avaliacoes, setAvaliacoes]     = React.useState([]);
  const [loading, setLoading]           = React.useState(true);
  const [metrica, setMetrica]           = React.useState('faturamento'); // faturamento | atendimentos | avaliacao

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  // ── Carregar dados ──
  React.useEffect(() => {
    setLoading(true);
    const inicio = periodo === 'hoje' ? hoje() : inicioPeriodo(periodo);
    const fim    = hoje();

    (async () => {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');

      // Agendamentos do período
      const snapA = await getDocs(query(
        collection(db, 'agendamentos'),
        where('data', '>=', inicio),
        where('data', '<=', fim),
      ));
      setAgendamentos(snapA.docs.map(d => ({ id: d.id, ...d.data() })));

      // Avaliações
      const snapAv = await getDocs(collection(db, 'avaliacoes'));
      setAvaliacoes(snapAv.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    })();
  }, [periodo]);

  // ── Calcular ranking ──
  const ativos = agendamentos.filter(a => !a.status?.includes('cancelado'));
  const concluidos = agendamentos.filter(a => a.status === 'concluido');

  const porBarbeiro = ativos.reduce((acc, a) => {
    const nome = a.barbeiroNome || 'Desconhecido';
    const id   = a.barbeiroId   || nome;
    if (!acc[id]) acc[id] = { id, nome, faturamento: 0, atendimentos: 0, concluidos: 0, servicos: {} };
    acc[id].faturamento  += a.valor || 0;
    acc[id].atendimentos += 1;
    if (a.status === 'concluido') acc[id].concluidos += 1;
    const sv = a.servico || 'Outros';
    acc[id].servicos[sv] = (acc[id].servicos[sv] || 0) + 1;
    return acc;
  }, {});

  // Adicionar médias de avaliação
  avaliacoes.forEach(av => {
    const id = av.barbeiroId || av.barbeiroNome;
    if (porBarbeiro[id]) {
      if (!porBarbeiro[id].notas) porBarbeiro[id].notas = [];
      porBarbeiro[id].notas.push(av.nota);
    }
  });

  const ranking = Object.values(porBarbeiro).map(b => ({
    ...b,
    mediaAvaliacao: b.notas?.length ? (b.notas.reduce((a,n)=>a+n,0)/b.notas.length).toFixed(1) : null,
    servicoTop: Object.entries(b.servicos).sort((a,b)=>b[1]-a[1])[0]?.[0],
  })).sort((a,b) => {
    if (metrica === 'faturamento')  return b.faturamento - a.faturamento;
    if (metrica === 'atendimentos') return b.atendimentos - a.atendimentos;
    if (metrica === 'avaliacao')    return (b.mediaAvaliacao||0) - (a.mediaAvaliacao||0);
    return 0;
  });

  const maxValor = ranking[0]?.[metrica === 'faturamento' ? 'faturamento' : metrica === 'atendimentos' ? 'atendimentos' : 'mediaAvaliacao'] || 1;
  const totalFat = ranking.reduce((acc,b)=>acc+b.faturamento,0);
  const totalAte = ranking.reduce((acc,b)=>acc+b.atendimentos,0);

  const MEDALHAS = ['🥇','🥈','🥉'];
  const CORES_MEDALHA = ['linear-gradient(135deg,#A07830,#E8C96A)','linear-gradient(135deg,#888,#C0C0C0)','linear-gradient(135deg,#5C2218,#8B3A2A)'];

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>📊 Comparativo</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Ranking de barbeiros</div>
        </div>
      </div>

      {/* PERÍODO */}
      <div style={{ display:'flex', gap:'6px', padding:'12px 16px', borderBottom:`1px solid ${border}` }}>
        {[{ id:'hoje', label:'Hoje' },{ id:'semana', label:'7 dias' },{ id:'mes', label:'Este mês' }].map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)}
            style={{ flex:1, padding:'8px', borderRadius:'10px', border:'none', background:periodo===p.id?'#8B3A2A':'#231410', color:periodo===p.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:periodo===p.id?'700':'400', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* MÉTRICA */}
      <div style={{ display:'flex', gap:'6px', padding:'10px 16px', borderBottom:`1px solid ${border}` }}>
        {[{ id:'faturamento',label:'💰 Faturamento' },{ id:'atendimentos',label:'✂️ Atendimentos' },{ id:'avaliacao',label:'⭐ Avaliação' }].map(m => (
          <button key={m.id} onClick={() => setMetrica(m.id)}
            style={{ flex:1, padding:'6px 4px', borderRadius:'8px', border:`1px solid ${metrica===m.id?'#C9A84C':border}`, background:metrica===m.id?'rgba(201,168,76,0.15)':cardBg, color:metrica===m.id?'#E8C96A':textSub, fontSize:'11px', fontWeight:metrica===m.id?'700':'400', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>

        {/* TOTAIS DO PERÍODO */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'16px' }}>
          {[
            { label:'Faturamento', value:moeda(totalFat), color:'#E8C96A' },
            { label:'Atendimentos', value:totalAte, color:'#4CAF50' },
            { label:'Concluídos', value:concluidos.length, color:'#2E7D7A' },
          ].map(item => (
            <div key={item.label} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:'15px', fontWeight:'700', color:item.color }}>{item.value}</div>
              <div style={{ fontSize:'10px', color:textSub, marginTop:'2px' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>⏳ Carregando...</div>}

        {!loading && ranking.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>📊</div>
            <div>Nenhum dado para este período</div>
          </div>
        )}

        {/* RANKING */}
        {!loading && ranking.map((b, i) => {
          const barValor = metrica === 'faturamento' ? b.faturamento
            : metrica === 'atendimentos' ? b.atendimentos
            : b.mediaAvaliacao || 0;
          const barMax = metrica === 'avaliacao' ? 5 : maxValor;
          const pct    = barMax > 0 ? Math.min(100, (barValor / barMax) * 100) : 0;

          return (
            <div key={b.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'16px', padding:'16px', marginBottom:'10px', position:'relative', overflow:'hidden' }}>

              {/* Fundo sutil posição */}
              {i < 3 && <div style={{ position:'absolute', top:0, left:0, bottom:0, width:'3px', background:CORES_MEDALHA[i] }} />}

              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                {/* Medalha / Posição */}
                <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:i<3?CORES_MEDALHA[i]:'#2E1A14', display:'flex', alignItems:'center', justifyContent:'center', fontSize:i<3?'20px':'14px', fontWeight:'700', color:i<3?'#0A0A0A':'#9A8880', flexShrink:0 }}>
                  {i < 3 ? MEDALHAS[i] : `${i+1}º`}
                </div>

                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'700', fontSize:'15px', color:textMain }}>{b.nome}</div>
                  <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>
                    {b.servicoTop && `Top: ${b.servicoTop}`}
                  </div>
                </div>

                {/* Valor principal */}
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>
                    {metrica==='faturamento' ? moeda(b.faturamento)
                      : metrica==='atendimentos' ? `${b.atendimentos}x`
                      : b.mediaAvaliacao ? `⭐ ${b.mediaAvaliacao}` : '—'}
                  </div>
                  <div style={{ fontSize:'10px', color:textSub }}>
                    {metrica==='faturamento' ? `${b.atendimentos} atend.`
                      : metrica==='atendimentos' ? `${moeda(b.faturamento)}`
                      : `${b.notas?.length||0} avaliações`}
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div style={{ height:'6px', background:dark?'#2E1A14':'#f5efe6', borderRadius:'3px', overflow:'hidden', marginBottom:'6px' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:i<3?`linear-gradient(90deg,${i===0?'#A07830,#E8C96A':i===1?'#888,#C0C0C0':'#5C2218,#8B3A2A'})`:'#3A2018', borderRadius:'3px', transition:'width 0.6s ease' }} />
              </div>

              {/* Stats secundários */}
              <div style={{ display:'flex', gap:'12px' }}>
                {[
                  { label:'Faturamento', value:moeda(b.faturamento) },
                  { label:'Atendimentos', value:`${b.atendimentos}x` },
                  { label:'Concluídos', value:`${b.concluidos}x` },
                  ...(b.mediaAvaliacao ? [{ label:'Avaliação', value:`⭐ ${b.mediaAvaliacao}` }] : []),
                ].map(st => (
                  <div key={st.label}>
                    <div style={{ fontSize:'10px', color:textSub }}>{st.label}</div>
                    <div style={{ fontSize:'12px', fontWeight:'600', color:textMain }}>{st.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* GRÁFICO DE BARRAS HORIZONTAL */}
        {!loading && ranking.length > 0 && (
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'16px', padding:'16px', marginTop:'8px' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'14px', color:textMain, marginBottom:'14px' }}>
              Distribuição — {metrica === 'faturamento' ? 'Faturamento' : metrica === 'atendimentos' ? 'Atendimentos' : 'Avaliação'}
            </div>
            {ranking.map((b, i) => {
              const barValor = metrica === 'faturamento' ? b.faturamento : metrica === 'atendimentos' ? b.atendimentos : b.mediaAvaliacao || 0;
              const barMax   = metrica === 'avaliacao' ? 5 : maxValor;
              const pct      = barMax > 0 ? Math.min(100, (barValor / barMax) * 100) : 0;
              const CORES    = ['#E8C96A','#9E9E9E','#8B3A2A','#2E7D7A','#4CAF50'];
              return (
                <div key={b.id} style={{ marginBottom:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>{b.nome}</span>
                    <span style={{ fontSize:'12px', color:CORES[i]||'#9A8880', fontWeight:'700' }}>
                      {metrica==='faturamento'?moeda(b.faturamento):metrica==='atendimentos'?`${b.atendimentos}x`:b.mediaAvaliacao?`⭐ ${b.mediaAvaliacao}`:'—'}
                    </span>
                  </div>
                  <div style={{ height:'8px', background:dark?'#2E1A14':'#f5efe6', borderRadius:'4px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:CORES[i]||'#3A2018', borderRadius:'4px', transition:'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
