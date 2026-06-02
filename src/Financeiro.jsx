// Financeiro.jsx — Flyguer BarberShop
// ✅ Completo: receita, comissões, fechamento de caixa, relatório por barbeiro

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { getStyles } from './getStyles';

function hoje() { return new Date().toISOString().split('T')[0]; }
function moeda(v) { return `R$ ${(v||0).toFixed(2).replace('.',',')}`; }
function formatarData(s) { if(!s) return '—'; const [a,m,d]=s.split('-'); return `${d}/${m}/${a}`; }

function primeiroDiaMes() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
}

// ── Configuração de comissões por barbeiro ────────────────────
function ConfigComissoes({ barbeiros, comissoes, onSalvar, onFechar, dark }) {
  const [vals, setVals] = React.useState({ ...comissoes });
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await setDoc(doc(db,'config','comissoes'), { ...vals, atualizadoEm: serverTimestamp() }, { merge:true });
      onSalvar(vals);
    } catch(e) { console.error(e); }
    setSalvando(false);
  }

  const inp = { background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'8px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', width:'80px', textAlign:'center' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>💰 Comissões</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'16px' }}>Define o percentual de comissão de cada barbeiro sobre os serviços concluídos.</div>
        {barbeiros.map(b => (
          <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'12px 14px', marginBottom:'8px' }}>
            <div>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{b.nome}</div>
              <div style={{ fontSize:'11px', color:'#9A8880' }}>{b.cargo}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <input type="number" min="0" max="100" value={vals[b.id]||0}
                onChange={e => setVals(v => ({ ...v, [b.id]: parseInt(e.target.value)||0 }))}
                style={inp} />
              <span style={{ fontSize:'14px', color:'#E8C96A', fontWeight:'700' }}>%</span>
            </div>
          </div>
        ))}
        <button onClick={salvar} disabled={salvando}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#fff', fontWeight:'800', fontSize:'15px', cursor:'pointer', marginTop:'12px' }}>
          {salvando?'Salvando...':'✅ Salvar comissões'}
        </button>
      </div>
    </div>
  );
}

// ── Fechamento de caixa ───────────────────────────────────────
function FechamentoCaixa({ dados, onConfirmar, onFechar, dark }) {
  const [obs, setObs]           = React.useState('');
  const [salvando, setSalvando] = React.useState(false);

  async function fechar() {
    setSalvando(true);
    try {
      const id = `${dados.data}_${Date.now()}`;
      await setDoc(doc(db,'fechamentos_caixa',id), {
        ...dados, observacao: obs, fechadoEm: serverTimestamp(),
      });
      onConfirmar();
    } catch(e) { console.error(e); }
    setSalvando(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px', width:'100%', maxWidth:'400px', padding:'28px 24px', border:'1px solid #3A2018', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ textAlign:'center', marginBottom:'20px' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>💰</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A' }}>Fechar Caixa</div>
          <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'4px' }}>{formatarData(dados.data)}</div>
        </div>

        {[
          { label:'Total Bruto',    value: moeda(dados.totalBruto),    cor:'#F5EFE6' },
          { label:'Via Pix',        value: moeda(dados.totalPix),      cor:'#2E7D7A' },
          { label:'Dinheiro',       value: moeda(dados.totalDinheiro), cor:'#4CAF50' },
          { label:'Cartão',         value: moeda(dados.totalCartao),   cor:'#2196F3' },
          { label:'Total Líquido',  value: moeda(dados.totalLiquido),  cor:'#E8C96A' },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #2E1A14' }}>
            <span style={{ fontSize:'13px', color:'#9A8880' }}>{item.label}</span>
            <span style={{ fontSize:'14px', fontWeight:'700', color:item.cor }}>{item.value}</span>
          </div>
        ))}

        {/* Comissões */}
        {dados.comissoes?.length > 0 && (
          <div style={{ background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'12px', padding:'12px', margin:'14px 0' }}>
            <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', marginBottom:'8px', textTransform:'uppercase' }}>Comissões</div>
            {dados.comissoes.map(c => (
              <div key={c.barbeiroId} style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontSize:'12px', color:'#F5EFE6' }}>{c.barbeiroNome} ({c.percentual}%)</span>
                <span style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'700' }}>{moeda(c.valor)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom:'16px', marginTop:'8px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Observação</label>
          <input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Opcional..."
            style={{ width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onFechar} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', cursor:'pointer', fontWeight:'600' }}>Cancelar</button>
          <button onClick={fechar} disabled={salvando}
            style={{ flex:2, padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#A07830,#C9A84C)', color:'#1A0F0D', fontWeight:'800', cursor:'pointer', fontSize:'14px' }}>
            {salvando?'Fechando...':'✅ Confirmar fechamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function Financeiro({ onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]             = React.useState('hoje');
  const [agendamentos, setAg]     = React.useState([]);
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [comissoes, setComissoes] = React.useState({});
  const [fechamentos, setFech]    = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [dataInicio, setDataIni]  = React.useState(primeiroDiaMes());
  const [dataFim, setDataFim]     = React.useState(hoje());
  const [showComissoes, setShowC] = React.useState(false);
  const [showFechamento, setShowF]= React.useState(false);
  const [fechJaFeito, setFechJaFeito] = React.useState(false);

  const cardBg  = dark?'#231410':'#fff';
  const border  = dark?'#3A2018':'#e5d5cc';
  const textMain= dark?'#F5EFE6':'#1A0F0D';
  const textSub = dark?'#9A8880':'#7A6860';

  // Carrega tudo
  React.useEffect(() => {
    async function carregar() {
      setLoading(true);
      const [snapB, snapAg, snapComiss, snapFech] = await Promise.all([
        getDocs(collection(db,'barbeiros')),
        getDocs(query(collection(db,'agendamentos'), where('status','==','concluido'))),
        getDoc(doc(db,'config','comissoes')),
        getDocs(query(collection(db,'fechamentos_caixa'), orderBy('fechadoEm','desc'))),
      ]);
      setBarbeiros(snapB.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.ativo));
      setAg(snapAg.docs.map(d=>({id:d.id,...d.data()})));
      if (snapComiss.exists()) setComissoes(snapComiss.data());
      setFech(snapFech.docs.map(d=>({id:d.id,...d.data()})));
      // Verifica se hoje já foi fechado
      const hojeStr = hoje();
      const jaFechou = snapFech.docs.some(d => d.data().data === hojeStr);
      setFechJaFeito(jaFechou);
      setLoading(false);
    }
    carregar();
  }, []);

  // Filtra agendamentos pelo período
  const agFiltrados = React.useMemo(() => {
    if (aba === 'hoje') return agendamentos.filter(a => a.data === hoje());
    if (aba === 'periodo') return agendamentos.filter(a => a.data >= dataInicio && a.data <= dataFim);
    return agendamentos;
  }, [agendamentos, aba, dataInicio, dataFim]);

  // Calcula totais
  const totais = React.useMemo(() => {
    const bruto    = agFiltrados.reduce((acc,a) => acc+(a.valorFinal||a.valor||0), 0);
    const pix      = agFiltrados.filter(a=>a.pagamento==='pix'||a.pagamento==='pix_sinal'||a.pagamentoFinal==='pix_local').reduce((acc,a)=>acc+(a.valorRecebido||a.valorFinal||a.valor||0),0);
    const dinheiro = agFiltrados.filter(a=>a.pagamentoFinal==='dinheiro').reduce((acc,a)=>acc+(a.valorRecebido||0),0);
    const cartao   = agFiltrados.filter(a=>a.pagamentoFinal==='cartao').reduce((acc,a)=>acc+(a.valorRecebido||0),0);
    const liquido  = bruto;

    // Por barbeiro
    const porBarbeiro = barbeiros.map(b => {
      const ags = agFiltrados.filter(a=>a.barbeiroId===b.id||a.barbeiroNome===b.nome);
      const total = ags.reduce((acc,a)=>acc+(a.valorFinal||a.valor||0),0);
      const perc  = comissoes[b.id] || 0;
      const comissao = total * perc / 100;
      return { ...b, totalServicos: ags.length, totalReceita: total, percentualComissao: perc, valorComissao: comissao };
    }).filter(b => b.totalServicos > 0);

    return { bruto, pix, dinheiro, cartao, liquido, porBarbeiro, totalAtendimentos: agFiltrados.length };
  }, [agFiltrados, barbeiros, comissoes]);

  // Dados para fechamento
  function dadosFechamento() {
    return {
      data:           hoje(),
      totalBruto:     totais.bruto,
      totalLiquido:   totais.liquido,
      totalPix:       totais.pix,
      totalDinheiro:  totais.dinheiro,
      totalCartao:    totais.cartao,
      totalAtendimentos: totais.totalAtendimentos,
      comissoes: totais.porBarbeiro.map(b => ({
        barbeiroId:   b.id,
        barbeiroNome: b.nome,
        percentual:   b.percentualComissao,
        totalServicos: b.totalServicos,
        totalReceita: b.totalReceita,
        valor:        b.valorComissao,
      })),
    };
  }

  const inp = { background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'8px 10px', color:'#F5EFE6', fontSize:'12px', outline:'none' };

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1A3A2A,#2E7D7A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>💰 Financeiro</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Receitas · Comissões · Fechamento</div>
        </div>
        <button onClick={() => setShowC(true)}
          style={{ background:'rgba(232,201,106,0.2)', border:'1px solid rgba(232,201,106,0.4)', borderRadius:'10px', padding:'8px 12px', color:'#E8C96A', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
          % Comissões
        </button>
      </div>

      {/* Abas período */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', background:dark?'#1A0F0D':'#fff' }}>
        {[
          { id:'hoje',    label:'📅 Hoje'    },
          { id:'periodo', label:'📊 Período' },
          { id:'historico', label:'🗃 Histórico' },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'12px 6px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #2E7D7A':'2px solid transparent', color:aba===a.id?'#2E7D7A':textSub, fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {/* Seletor de período */}
        {aba === 'periodo' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
            <div>
              <div style={{ fontSize:'11px', color:textSub, marginBottom:'4px' }}>De</div>
              <input type="date" value={dataInicio} onChange={e=>setDataIni(e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
            </div>
            <div>
              <div style={{ fontSize:'11px', color:textSub, marginBottom:'4px' }}>Até</div>
              <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
            </div>
          </div>
        )}

        {/* Histórico de fechamentos */}
        {aba === 'historico' && (
          <>
            <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', textTransform:'uppercase', marginBottom:'12px' }}>Fechamentos registrados</div>
            {fechamentos.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>🗃</div>
                <div>Nenhum fechamento ainda</div>
              </div>
            )}
            {fechamentos.map(f => (
              <div key={f.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{formatarData(f.data)}</div>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>{moeda(f.totalLiquido)}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                  {[
                    { l:'Pix',      v:moeda(f.totalPix||0),      c:'#2E7D7A' },
                    { l:'Dinheiro', v:moeda(f.totalDinheiro||0), c:'#4CAF50' },
                    { l:'Cartão',   v:moeda(f.totalCartao||0),   c:'#2196F3' },
                  ].map(x=>(
                    <div key={x.l} style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'8px', padding:'6px', textAlign:'center' }}>
                      <div style={{ fontSize:'11px', color:x.c, fontWeight:'700' }}>{x.v}</div>
                      <div style={{ fontSize:'9px', color:textSub }}>{x.l}</div>
                    </div>
                  ))}
                </div>
                {f.observacao && <div style={{ fontSize:'11px', color:textSub, fontStyle:'italic' }}>"{f.observacao}"</div>}
              </div>
            ))}
          </>
        )}

        {/* Painel principal (hoje / período) */}
        {aba !== 'historico' && (
          <>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>⏳ Carregando...</div>
            ) : (
              <>
                {/* Cards de totais */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
                  {[
                    { label:'Total Bruto',      value:moeda(totais.bruto),      color:'#E8C96A', sub:`${totais.totalAtendimentos} atendimentos` },
                    { label:'Via Pix',          value:moeda(totais.pix),         color:'#2E7D7A', sub:'Antecipado + local' },
                    { label:'Dinheiro',         value:moeda(totais.dinheiro),    color:'#4CAF50', sub:'No caixa' },
                    { label:'Cartão',           value:moeda(totais.cartao),      color:'#2196F3', sub:'Maquininha' },
                  ].map(item => (
                    <div key={item.label} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px' }}>
                      <div style={{ fontSize:'18px', fontWeight:'700', color:item.color }}>{item.value}</div>
                      <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>{item.label}</div>
                      <div style={{ fontSize:'10px', color:'#555', marginTop:'2px' }}>{item.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Por barbeiro */}
                {totais.porBarbeiro.length > 0 && (
                  <>
                    <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', textTransform:'uppercase', marginBottom:'10px', letterSpacing:'1px' }}>Por barbeiro</div>
                    {totais.porBarbeiro.map(b => (
                      <div key={b.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
                            {b.nome[0]}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{b.nome}</div>
                            <div style={{ fontSize:'11px', color:textSub }}>{b.totalServicos} serviço{b.totalServicos!==1?'s':''}</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>{moeda(b.totalReceita)}</div>
                            <div style={{ fontSize:'10px', color:textSub }}>receita</div>
                          </div>
                        </div>
                        {b.percentualComissao > 0 && (
                          <div style={{ background:dark?'rgba(232,201,106,0.08)':'rgba(232,201,106,0.06)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'10px', padding:'8px 12px', display:'flex', justifyContent:'space-between' }}>
                            <span style={{ fontSize:'12px', color:textSub }}>Comissão {b.percentualComissao}%</span>
                            <span style={{ fontSize:'13px', fontWeight:'700', color:'#E8C96A' }}>{moeda(b.valorComissao)}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Total comissões */}
                    {totais.porBarbeiro.some(b=>b.valorComissao>0) && (
                      <div style={{ background:'rgba(232,201,106,0.1)', border:'1px solid rgba(232,201,106,0.3)', borderRadius:'14px', padding:'14px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:'13px', fontWeight:'700', color:'#E8C96A' }}>Total comissões</div>
                          <div style={{ fontSize:'11px', color:textSub }}>A pagar à equipe</div>
                        </div>
                        <div style={{ fontSize:'20px', fontWeight:'700', color:'#E8C96A' }}>
                          {moeda(totais.porBarbeiro.reduce((acc,b)=>acc+b.valorComissao,0))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {totais.totalAtendimentos === 0 && (
                  <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                    <div style={{ fontSize:'40px', marginBottom:'12px' }}>💰</div>
                    <div>Nenhum atendimento concluído {aba==='hoje'?'hoje':'no período'}</div>
                  </div>
                )}

                {/* Botão fechar caixa (só aparece na aba hoje) */}
                {aba === 'hoje' && totais.totalAtendimentos > 0 && (
                  <button onClick={() => setShowF(true)} disabled={fechJaFeito}
                    style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:fechJaFeito?'#2E1A14':'linear-gradient(135deg,#A07830,#C9A84C)', color:fechJaFeito?'#555':'#1A0F0D', fontWeight:'800', fontSize:'15px', cursor:fechJaFeito?'not-allowed':'pointer', marginTop:'8px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                    {fechJaFeito ? '✅ Caixa já fechado hoje' : '🔒 Fechar caixa do dia'}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modais */}
      {showComissoes && (
        <ConfigComissoes barbeiros={barbeiros} comissoes={comissoes}
          onSalvar={vals => { setComissoes(vals); setShowC(false); }}
          onFechar={() => setShowC(false)} dark={dark} />
      )}
      {showFechamento && (
        <FechamentoCaixa dados={dadosFechamento()}
          onConfirmar={() => { setShowF(false); setFechJaFeito(true); }}
          onFechar={() => setShowF(false)} dark={dark} />
      )}
    </div>
  );
}
