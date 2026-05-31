// Financeiro.jsx — Flyguer BarberShop
// ✅ Passo 14 — Export PDF adicionado

import React from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getStyles } from './getStyles';
import ExportPDF from './ExportPDF'; // ✅ P14

function hoje() { return new Date().toISOString().split('T')[0]; }
function formatarData(dataStr) { if (!dataStr) return ''; const [ano,mes,dia] = dataStr.split('-'); return `${dia}/${mes}/${ano}`; }
function diaSemanaCompleto(dataStr) { const DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']; return DIAS[new Date(dataStr+'T12:00:00').getDay()]; }
function addDias(dataStr, n) { const d = new Date(dataStr+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; }
function moeda(valor) { return `R$ ${(valor||0).toFixed(2).replace('.',',')}`; }
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function Financeiro({ onBack, dark }) {
  const s = getStyles(dark);
  const [dataSel, setDataSel]         = React.useState(hoje());
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [carregando, setCarregando]   = React.useState(true);
  const [aba, setAba]                 = React.useState('dia');

  React.useEffect(() => {
    setCarregando(true);
    const q = query(collection(db,'agendamentos'), where('data','==',dataSel));
    const unsub = onSnapshot(q, snap => {
      setAgendamentos(snap.docs.map(d=>({firestoreId:d.id,...d.data()})));
      setCarregando(false);
    }, err => { console.error('Erro financeiro:',err); setCarregando(false); });
    return () => unsub();
  }, [dataSel]);

  const ativos      = agendamentos.filter(a => a.status!=='cancelado_cliente'&&a.status!=='cancelado_barbeiro');
  const concluidos  = agendamentos.filter(a => a.status==='concluido');
  const confirmados = agendamentos.filter(a => a.status==='confirmado');

  const totalGeral  = ativos.reduce((acc,a)=>acc+(a.valor||0),0);
  const totalPix    = ativos.filter(a=>a.pagamento==='pix'||a.pagamento==='pix_sinal').reduce((acc,a)=>acc+(a.valor||0),0);
  const totalLocal  = ativos.filter(a=>a.pagamento==='local').reduce((acc,a)=>acc+(a.valor||0),0);
  const totalSinais = ativos.reduce((acc,a)=>acc+(a.sinal||0),0);

  const porBarbeiro = ativos.reduce((acc,a) => {
    const nome = a.barbeiroNome||'Desconhecido';
    if (!acc[nome]) acc[nome] = { nome, total:0, qtd:0, concluidos:0 };
    acc[nome].total += a.valor||0; acc[nome].qtd += 1;
    if (a.status==='concluido') acc[nome].concluidos += 1;
    return acc;
  }, {});
  const rankingBarbeiros = Object.values(porBarbeiro).sort((a,b)=>b.total-a.total);

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>💰 Financeiro</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Flyguer BarberShop</div>
        </div>
        {/* ✅ P14 — Botão Export PDF */}
        <ExportPDF
          dados={{ totalGeral, totalPix, totalAgendamentos:ativos.length, totalConcluidos:concluidos.length, barbeiros:rankingBarbeiros, agendamentos, dataFormatada:`${diaSemanaCompleto(dataSel)}, ${formatarData(dataSel)}` }}
          data={dataSel}
          dark={dark}
        />
      </div>

      {/* Seletor de dias */}
      <div style={{ overflowX:'auto', display:'flex', gap:'6px', padding:'12px 16px', borderBottom:'1px solid #3A2018' }}>
        {Array.from({length:14},(_,i)=>addDias(hoje(),i-7)).map(data => {
          const d = new Date(data+'T12:00:00');
          const sel = dataSel===data;
          const ehHoje = data===hoje();
          return (
            <div key={data} onClick={() => setDataSel(data)} style={{ minWidth:'52px', padding:'8px 6px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018' }}>
              <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
              <div style={{ fontSize:'16px', fontWeight:'700', color:'#F5EFE6', marginTop:'2px' }}>{d.getDate()}</div>
              {ehHoje && <div style={{ fontSize:'8px', color:'#E8C96A' }}>HOJE</div>}
            </div>
          );
        })}
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[{ id:'dia',label:'📊 Resumo' },{ id:'barbeiros',label:'✂️ Barbeiros' },{ id:'lista',label:'📋 Detalhes' }].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, padding:'12px 4px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'600', marginBottom:'16px' }}>
          {diaSemanaCompleto(dataSel)}, {formatarData(dataSel)}
          {dataSel===hoje()&&<span style={{ marginLeft:'8px', fontSize:'11px', color:'#9A8880' }}>— Hoje</span>}
        </div>

        {carregando ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}><div style={{ fontSize:'24px', marginBottom:'8px' }}>⏳</div>Carregando...</div>
        ) : (
          <>
            {/* RESUMO */}
            {aba==='dia' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
                  {[
                    { label:'Total do dia',  value:moeda(totalGeral), color:'#E8C96A', big:true },
                    { label:'Agendamentos',  value:ativos.length,     color:'#F5EFE6' },
                    { label:'Concluídos',    value:concluidos.length, color:'#2E7D7A' },
                    { label:'A receber',     value:confirmados.length,color:'#FFC107' },
                  ].map(item => (
                    <div key={item.label} style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', gridColumn:item.big?'span 2':'span 1' }}>
                      <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'1px' }}>{item.label}</div>
                      <div style={{ fontSize:item.big?'28px':'22px', fontWeight:'700', color:item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#F5EFE6', marginBottom:'12px' }}>Formas de pagamento</div>
                <div style={{ background:'#231410', borderRadius:'14px', border:'1px solid #3A2018', overflow:'hidden', marginBottom:'16px' }}>
                  {[
                    { label:'💳 Pix',      value:moeda(totalPix),   pct:totalGeral?(totalPix/totalGeral*100):0,   color:'#2E7D7A' },
                    { label:'💵 No Local', value:moeda(totalLocal), pct:totalGeral?(totalLocal/totalGeral*100):0, color:'#8B3A2A' },
                  ].map((item,i) => (
                    <div key={item.label} style={{ padding:'14px 16px', borderBottom:i===0?'1px solid #3A2018':'none' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                        <span style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{item.label}</span>
                        <span style={{ fontSize:'13px', color:item.color, fontWeight:'700' }}>{item.value}</span>
                      </div>
                      <div style={{ height:'4px', background:'#2E1A14', borderRadius:'2px' }}>
                        <div style={{ height:'100%', width:`${item.pct}%`, background:item.color, borderRadius:'2px', transition:'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'4px' }}>{item.pct.toFixed(0)}% do total</div>
                    </div>
                  ))}
                </div>

                {totalSinais > 0 && (
                  <div style={{ background:'rgba(46,125,122,0.1)', border:'1px solid rgba(46,125,122,0.3)', borderRadius:'12px', padding:'12px 14px' }}>
                    <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'4px' }}>Sinais Pix recebidos</div>
                    <div style={{ fontSize:'18px', fontWeight:'700', color:'#2E7D7A' }}>{moeda(totalSinais)}</div>
                    <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'4px' }}>Já garantidos, serão abatidos no total</div>
                  </div>
                )}

                {ativos.length===0 && (
                  <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
                    <div style={{ fontSize:'40px', marginBottom:'12px' }}>💰</div>
                    <div>Nenhum agendamento neste dia</div>
                  </div>
                )}
              </div>
            )}

            {/* BARBEIROS */}
            {aba==='barbeiros' && (
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#F5EFE6', marginBottom:'12px' }}>Ranking do dia</div>
                {rankingBarbeiros.length===0 ? (
                  <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>Nenhum dado para este dia</div>
                ) : (
                  rankingBarbeiros.map((b,i) => (
                    <div key={b.nome} style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'10px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:i===0?'linear-gradient(135deg,#A07830,#E8C96A)':i===1?'linear-gradient(135deg,#888,#C0C0C0)':'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'16px', color:'#0A0A0A', flexShrink:0 }}>
                          {i===0?'🥇':i===1?'🥈':'🥉'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{b.nome}</div>
                          <div style={{ fontSize:'11px', color:'#9A8880' }}>{b.qtd} atendimento(s)</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'18px', fontWeight:'700', color:'#E8C96A' }}>{moeda(b.total)}</div>
                          <div style={{ fontSize:'11px', color:'#2E7D7A' }}>{b.concluidos} concluído(s)</div>
                        </div>
                      </div>
                      <div style={{ height:'4px', background:'#2E1A14', borderRadius:'2px' }}>
                        <div style={{ height:'100%', width:totalGeral?`${(b.total/totalGeral*100)}%`:'0%', background:'linear-gradient(90deg,#8B3A2A,#E8C96A)', borderRadius:'2px', transition:'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'4px' }}>
                        {totalGeral?(b.total/totalGeral*100).toFixed(0):0}% do total do dia
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* LISTA */}
            {aba==='lista' && (
              <div>
                {agendamentos.length===0 ? (
                  <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
                    <div style={{ fontSize:'40px', marginBottom:'12px' }}>📋</div>
                    <div>Nenhum agendamento neste dia</div>
                  </div>
                ) : (
                  [...agendamentos].sort((a,b)=>a.hora.localeCompare(b.hora)).map(ag => {
                    const cancelado = ag.status?.includes('cancelado');
                    return (
                      <div key={ag.firestoreId} style={{ background:'#231410', borderRadius:'14px', border:cancelado?'1px solid #3A1010':'1px solid #3A2018', padding:'14px', marginBottom:'10px', opacity:cancelado?0.5:1 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:'700', color:'#E8C96A' }}>{ag.hora}</span>
                            <span style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{ag.clienteNome?.split(' ')[0]}</span>
                          </div>
                          <span style={{ fontSize:'14px', fontWeight:'700', color:cancelado?'#F44336':'#E8C96A' }}>
                            {cancelado?'Cancelado':moeda(ag.valor)}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'11px', color:'#9A8880' }}>✂️ {ag.barbeiroNome}</span>
                          <span style={{ fontSize:'11px', color:'#9A8880' }}>· 💈 {ag.servico}</span>
                          <span style={{ fontSize:'11px', color:ag.pagamento==='pix'||ag.pagamento==='pix_sinal'?'#2E7D7A':'#9A8880' }}>
                            · {ag.pagamento==='pix'||ag.pagamento==='pix_sinal'?'💳 Pix':'💵 Local'}
                          </span>
                          <span style={{ fontSize:'11px', fontWeight:'600', color:ag.status==='concluido'?'#2E7D7A':cancelado?'#F44336':'#4CAF50' }}>
                            · {ag.status==='concluido'?'✓ Concluído':cancelado?'✗ Cancelado':'● Confirmado'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
