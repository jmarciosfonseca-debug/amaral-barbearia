// PainelRecepcao.jsx — Flyguer BarberShop
// ✅ Passo 13 — prop onNavegarAssinaturas + botão Planos + badge Pix
// ✅ Passo 14 — Busca de cliente por nome/telefone

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, getDocs,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import { notificarClienteAgendamentoManual } from './notificacoes';

function hoje() { return new Date().toISOString().split('T')[0]; }
function moeda(valor) { return `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`; }
function formatarData(dataStr) { if (!dataStr) return ''; const [a,m,d] = dataStr.split('-'); return `${d}/${m}/${a}`; }

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro',  label: '💵 Dinheiro', cor: '#4CAF50' },
  { id: 'cartao',    label: '💳 Cartão',   cor: '#2196F3' },
  { id: 'pix_local', label: '📱 Pix',      cor: '#2E7D7A' },
];

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function Toast({ mensagem, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', padding:'12px 24px', borderRadius:'16px', fontSize:'14px', fontWeight:'700', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.4)', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
      {mensagem}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL PAGAMENTO
// ─────────────────────────────────────────────────────────────
function ModalPagamento({ agendamento, onConfirmar, onFechar }) {
  const [forma, setForma]       = React.useState('dinheiro');
  const [valor, setValor]       = React.useState(agendamento.valor || 0);
  const [obs, setObs]           = React.useState('');
  const [salvando, setSalvando] = React.useState(false);
  const sinalPago     = agendamento.sinal || 0;
  const valorRestante = Math.max(0, valor - sinalPago);

  async function handleConfirmar() {
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status: 'concluido', pagamentoFinal: forma, valorFinal: valor,
        sinalAbatido: sinalPago, valorRecebido: valorRestante,
        observacaoCaixa: obs, concluidoEm: serverTimestamp(), pagoEm: serverTimestamp(),
      });
      onConfirmar();
    } catch(e) { console.error(e); }
    finally { setSalvando(false); }
  }

  const inputStyle = { width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>💰 Confirmar Pagamento</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ background:'#231410', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px', border:'1px solid #3A2018' }}>
          <div style={{ fontSize:'15px', fontWeight:'700', color:'#F5EFE6', marginBottom:'4px' }}>{agendamento.clienteNome?.split(' ').slice(0,2).join(' ')}</div>
          <div style={{ fontSize:'12px', color:'#9A8880' }}>✂️ {agendamento.barbeiroNome} · 💈 {agendamento.servico} · 🕐 {agendamento.hora}</div>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Valor do serviço (R$)</label>
          <input type="number" style={inputStyle} value={valor} onChange={e => setValor(parseFloat(e.target.value)||0)} />
        </div>
        {sinalPago > 0 && (
          <div style={{ background:'rgba(46,125,122,0.1)', border:'1px solid rgba(46,125,122,0.3)', borderRadius:'10px', padding:'10px 12px', marginBottom:'14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'12px', color:'#9A8880' }}>Sinal Pix já pago:</span>
              <span style={{ fontSize:'12px', color:'#2E7D7A', fontWeight:'700' }}>- {moeda(sinalPago)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px' }}>
              <span style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>A receber agora:</span>
              <span style={{ fontSize:'16px', color:'#E8C96A', fontWeight:'700' }}>{moeda(valorRestante)}</span>
            </div>
          </div>
        )}
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Forma de pagamento recebida</label>
          <div style={{ display:'flex', gap:'8px' }}>
            {FORMAS_PAGAMENTO.map(f => (
              <button key={f.id} onClick={() => setForma(f.id)} style={{ flex:1, padding:'10px 6px', borderRadius:'10px', border:forma===f.id?`2px solid ${f.cor}`:'1px solid #3A2018', background:forma===f.id?`${f.cor}22`:'#231410', color:forma===f.id?f.cor:'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Observação (opcional)</label>
          <input type="text" style={inputStyle} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: cliente pagou com troco" />
        </div>
        <button onClick={handleConfirmar} disabled={salvando} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          {salvando ? '⏳ Registrando...' : `✅ Confirmar ${moeda(valorRestante)} recebido`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL NOVO AGENDAMENTO
// ─────────────────────────────────────────────────────────────
function ModalNovoAgendamento({ agendamentosHoje, onSalvar, onFechar, clientePreencher }) {
  const [barbeiros, setBarbeiros]           = React.useState([]);
  const [servicos, setServicos]             = React.useState([]);
  const [configHorarios, setConfigHorarios] = React.useState(null);
  const [servicosSel, setServicosSel]       = React.useState([]);
  const [form, setForm] = React.useState({
    clienteNome: clientePreencher?.nome || '', clienteTel: clientePreencher?.telefone || '', clienteCpf: clientePreencher?.cpf || 'manual',
    barbeiroId: '', barbeiroNome: '', data: hoje(), hora: '09:00', pagamento: 'local', observacao: '',
  });
  const [salvando, setSalvando]             = React.useState(false);
  const [erro, setErro]                     = React.useState('');
  const [horariosOcupados, setHorariosOcupados] = React.useState([]);

  const totalValor   = servicosSel.reduce((acc,s)=>acc+(s.valor||0),0);
  const totalDuracao = servicosSel.reduce((acc,s)=>acc+(s.duracao||0),0);
  const nomeServicos = servicosSel.map(s=>s.nome).join(' + ');

  function toggleServico(sv) { setServicosSel(prev => prev.find(s=>s.id===sv.id) ? prev.filter(s=>s.id!==sv.id) : [...prev,sv]); setErro(''); }

  React.useEffect(() => {
    getDocs(collection(db,'barbeiros')).then(snap => setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.ativo&&b.papel!=='recepcao')));
    import('firebase/firestore').then(({ getDoc, doc: fDoc }) => {
      getDoc(fDoc(db,'config','servicos')).then(snap => { if(snap.exists()) { const d=snap.data(); setServicos([...(d.avulsos||[]).filter(s=>s.ativo),...(d.combos||[]).filter(s=>s.ativo)]); } });
      getDoc(fDoc(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfigHorarios(snap.data()); });
    });
  }, []);

  React.useEffect(() => {
    if (!form.barbeiroId||!form.data) { setHorariosOcupados([]); return; }
    getDocs(query(collection(db,'agendamentos'), where('data','==',form.data))).then(snap => {
      setHorariosOcupados(snap.docs.map(d=>d.data()).filter(a=>a.barbeiroId===form.barbeiroId&&!['cancelado','cancelado_cliente','cancelado_barbearia'].includes(a.status)).map(a=>a.hora));
    });
  }, [form.barbeiroId, form.data]);

  function setField(campo, valor) { setForm(f=>({...f,[campo]:valor})); setErro(''); }
  function handleBarbeiroChange(id) { const b=barbeiros.find(b=>b.id===id); setField('barbeiroId',id); setField('barbeiroNome',b?.nome||''); }

  function gerarHorarios() {
    const DIAS_KEYS=['dom','seg','ter','qua','qui','sex','sab'];
    const diaSem=DIAS_KEYS[new Date(form.data+'T12:00:00').getDay()];
    const horConfig=configHorarios?.horarios?.[diaSem];
    let inicio=8*60, fim=24*60;
    if (horConfig?.aberto) { const [hA,mA]=horConfig.abertura.split(':').map(Number); const [hF,mF]=horConfig.fechamento.split(':').map(Number); inicio=hA*60+mA; fim=hF===0&&mF===0?24*60:hF*60+mF; }
    const slots=[]; let atual=inicio;
    while (atual<fim) { const hora=`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`; slots.push({ hora, ocupado:horariosOcupados.includes(hora) }); atual+=30; }
    return slots;
  }

  async function handleSalvar() {
    if (!form.clienteNome.trim()) { setErro('Nome do cliente obrigatório'); return; }
    if (!form.barbeiroId)         { setErro('Selecione o barbeiro'); return; }
    if (servicosSel.length===0)   { setErro('Selecione ao menos um serviço'); return; }
    if (horariosOcupados.includes(form.hora)) { setErro(`⚠️ Horário ${form.hora} já ocupado!`); return; }
    setSalvando(true); setErro('');
    try {
      const novoAg = { ...form, servico:nomeServicos, valor:totalValor, duracao:totalDuracao, servicoIds:servicosSel.map(s=>s.id).filter(Boolean), status:'confirmado', agendadoPor:'recepcao', sinal:0, criadoEm:serverTimestamp() };
      await addDoc(collection(db,'agendamentos'), novoAg);
      if (form.clienteTel) notificarClienteAgendamentoManual(novoAg);
      onSalvar();
    } catch(e) { setErro('Erro ao salvar. Tente novamente.'); console.error(e); }
    finally { setSalvando(false); }
  }

  const inputStyle = { width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };
  const horarios = gerarHorarios();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>➕ Agendamento Manual</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>

        {[{ label:'Nome do cliente *', campo:'clienteNome', placeholder:'Nome completo', type:'text' },{ label:'Telefone / WhatsApp', campo:'clienteTel', placeholder:'11999999999', type:'tel' }].map(f => (
          <div key={f.campo} style={{ marginBottom:'12px' }}>
            <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>{f.label}</label>
            <input type={f.type} style={inputStyle} placeholder={f.placeholder} value={form[f.campo]} onChange={e => setField(f.campo,e.target.value)} />
          </div>
        ))}

        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Barbeiro *</label>
          <select style={inputStyle} value={form.barbeiroId} onChange={e => handleBarbeiroChange(e.target.value)}>
            <option value="">Selecione...</option>
            {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Serviços * <span style={{ color:'#555' }}>(selecione um ou mais)</span></label>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {servicos.map(sv => {
              const sel = !!servicosSel.find(s=>s.id===sv.id);
              return (
                <div key={sv.id} onClick={() => toggleServico(sv)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', cursor:'pointer', background:sel?'#2E1A14':'#1A0F0D', border:sel?'1.5px solid #8B3A2A':'1px solid #3A2018' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'18px', height:'18px', borderRadius:'5px', flexShrink:0, border:`2px solid ${sel?'#8B3A2A':'#3A2018'}`, background:sel?'#8B3A2A':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#F5EFE6' }}>{sel?'✓':''}</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:sel?'700':'400', color:sel?'#F5EFE6':'#9A8880' }}>{sv.nome}</div>
                      {sv.duracao && <div style={{ fontSize:'10px', color:'#555' }}>⏱ {sv.duracao} min</div>}
                    </div>
                  </div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:sel?'#E8C96A':'#9A8880' }}>R$ {sv.valor.toFixed(2).replace('.',',')}</div>
                </div>
              );
            })}
          </div>
          {servicosSel.length > 0 && (
            <div style={{ marginTop:'10px', padding:'10px 14px', borderRadius:'10px', background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'11px', color:'#9A8880' }}>{servicosSel.length} serviço(s){totalDuracao>0?` · ${totalDuracao} min`:''}</div>
                <div style={{ fontSize:'11px', color:'#555', marginTop:'2px' }}>{nomeServicos}</div>
              </div>
              <div style={{ fontSize:'18px', fontWeight:'700', color:'#E8C96A' }}>R$ {totalValor.toFixed(2).replace('.',',')}</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Data</label>
          <input type="date" style={inputStyle} value={form.data} onChange={e => setField('data',e.target.value)} />
        </div>

        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Horário {form.barbeiroId&&<span style={{ color:'#555' }}>— ocupados em vermelho</span>}</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', maxHeight:'160px', overflowY:'auto' }}>
            {horarios.map(({ hora, ocupado }) => (
              <button key={hora} disabled={ocupado} onClick={() => !ocupado&&setField('hora',hora)}
                style={{ padding:'8px 4px', borderRadius:'8px', background:ocupado?'rgba(244,67,54,0.15)':form.hora===hora?'linear-gradient(135deg,#5C2218,#8B3A2A)':'#2E1A14', color:ocupado?'#F44336':form.hora===hora?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:ocupado?'not-allowed':'pointer', textDecoration:ocupado?'line-through':'none', fontFamily:"'DM Sans',sans-serif", border:form.hora===hora&&!ocupado?'2px solid #8B3A2A':'1px solid #3A2018' }}>
                {hora}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Pagamento</label>
          <div style={{ display:'flex', gap:'8px' }}>
            {[{ id:'local',label:'💵 Local' },{ id:'dinheiro',label:'💵 Dinheiro' },{ id:'cartao',label:'💳 Cartão' },{ id:'pix',label:'📱 Pix' }].map(f => (
              <button key={f.id} onClick={() => setField('pagamento',f.id)} style={{ flex:1, padding:'8px 4px', borderRadius:'10px', border:form.pagamento===f.id?'2px solid #8B3A2A':'1px solid #3A2018', background:form.pagamento===f.id?'rgba(139,58,42,0.2)':'#231410', color:form.pagamento===f.id?'#E8C96A':'#9A8880', fontSize:'11px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{f.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Observação</label>
          <input type="text" style={inputStyle} placeholder="Notas adicionais..." value={form.observacao} onChange={e => setField('observacao',e.target.value)} />
        </div>

        {erro && <div style={{ fontSize:'13px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'10px', padding:'10px' }}>{erro}</div>}

        <button onClick={handleSalvar} disabled={salvando} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          {salvando ? '⏳ Salvando...' : '✅ Criar Agendamento'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ✅ P14 — BUSCA DE CLIENTE
// ─────────────────────────────────────────────────────────────
function BuscaCliente({ onAgendarParaCliente }) {
  const [busca, setBusca]           = React.useState('');
  const [resultado, setResultado]   = React.useState(null);
  const [historico, setHistorico]   = React.useState([]);
  const [buscando, setBuscando]     = React.useState(false);
  const [erro, setErro]             = React.useState('');
  const [expandido, setExpandido]   = React.useState(false);

  async function buscarCliente() {
    if (!busca.trim()) { setErro('Digite nome ou telefone para buscar.'); return; }
    setBuscando(true); setErro(''); setResultado(null); setHistorico([]);
    try {
      const { collection: col, query: q, where: w, getDocs: gd, orderBy: ob } = await import('firebase/firestore');
      const snap = await gd(col(db, 'clientes'));
      const buscaLower = busca.toLowerCase().trim();
      const clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.nome?.toLowerCase().includes(buscaLower) || c.telefone?.includes(busca.trim()));

      if (clientes.length === 0) { setErro('Nenhum cliente encontrado.'); setBuscando(false); return; }

      const cliente = clientes[0];
      setResultado(cliente);

      // Buscar histórico de agendamentos
      const snapAg = await gd(q(col(db, 'agendamentos'), w('clienteCpf', '==', cliente.cpf || cliente.id)));
      const ags = snapAg.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.data?.localeCompare(a.data));
      setHistorico(ags.slice(0, 5));
    } catch(e) { setErro('Erro ao buscar: ' + e.message); }
    setBuscando(false);
  }

  const concluidos = historico.filter(a => a.status === 'concluido');
  const totalGasto = concluidos.reduce((acc,a) => acc + (a.valorFinal || a.valor || 0), 0);

  return (
    <div>
      {/* Campo de busca */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); setErro(''); }}
          onKeyDown={e => e.key==='Enter'&&buscarCliente()}
          placeholder="🔍 Nome ou telefone do cliente..."
          style={{ flex:1, background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', fontFamily:"'DM Sans',sans-serif" }}
        />
        <button onClick={buscarCliente} disabled={buscando}
          style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'10px', padding:'10px 16px', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer', flexShrink:0 }}>
          {buscando ? '...' : 'Buscar'}
        </button>
      </div>

      {erro && <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>}

      {/* Resultado */}
      {resultado && (
        <div style={{ background:'#231410', border:'1px solid #3A2018', borderRadius:'16px', overflow:'hidden' }}>
          <div style={{ height:'3px', background:'linear-gradient(90deg,#5C2218,#C9A84C)' }} />
          <div style={{ padding:'16px' }}>

            {/* Info cliente */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'700', color:'#F5EFE6', overflow:'hidden', flexShrink:0 }}>
                {resultado.foto ? <img src={resultado.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (resultado.nome||'?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'16px', color:'#F5EFE6' }}>{resultado.nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>📞 {resultado.telefone || '—'}</div>
                <div style={{ fontSize:'11px', color:'#9A8880' }}>CPF: {resultado.cpf ? `***.${resultado.cpf.slice(3,6)}.***.${resultado.cpf.slice(-2)}` : '—'}</div>
              </div>
            </div>

            {/* Stats rápidos */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
              {[
                { label:'Visitas', value: concluidos.length, color:'#E8C96A' },
                { label:'Total gasto', value:`R$${totalGasto.toFixed(0)}`, color:'#4CAF50' },
                { label:'Preferência', value: resultado.preferencia || '—', color:'#2E7D7A', small:true },
              ].map(item => (
                <div key={item.label} style={{ background:'#1A0F0D', borderRadius:'10px', padding:'8px', textAlign:'center' }}>
                  <div style={{ fontSize:item.small?'11px':'15px', fontWeight:'700', color:item.color }}>{item.value}</div>
                  <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Últimos agendamentos */}
            {historico.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', color:'#9A8880', fontWeight:'600', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Últimos atendimentos
                  <button onClick={() => setExpandido(e=>!e)} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'11px', cursor:'pointer', marginLeft:'8px' }}>
                    {expandido ? '▲ menos' : '▼ mais'}
                  </button>
                </div>
                {historico.slice(0, expandido?5:2).map(ag => (
                  <div key={ag.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#1A0F0D', borderRadius:'8px', marginBottom:'4px' }}>
                    <div>
                      <div style={{ fontSize:'12px', color:'#F5EFE6', fontWeight:'600' }}>{ag.servico}</div>
                      <div style={{ fontSize:'10px', color:'#9A8880' }}>✂️ {ag.barbeiroNome} · {formatarData(ag.data)}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700' }}>R$ {(ag.valorFinal||ag.valor||0).toFixed(2)}</div>
                      <div style={{ fontSize:'10px', color:ag.status==='concluido'?'#4CAF50':ag.status?.includes('cancelado')?'#F44336':'#FFC107' }}>
                        {ag.status==='concluido'?'✓ Concluído':ag.status?.includes('cancelado')?'✗ Cancelado':'⏳'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ações */}
            <button onClick={() => onAgendarParaCliente(resultado)}
              style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              📅 Criar agendamento para {resultado.nome.split(' ')[0]}
            </button>
          </div>
        </div>
      )}

      {!resultado && !erro && !buscando && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'#555' }}>
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>🔍</div>
          <div style={{ fontSize:'13px' }}>Digite o nome ou telefone do cliente</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD FILA
// ─────────────────────────────────────────────────────────────
function CardFila({ ag, onPagar }) {
  const isPago      = ag.status === 'concluido';
  const isCancelado = ag.status?.includes('cancelado');
  const pixPago     = ag.pagamento === 'pix' || ag.pagamento === 'pix_sinal';

  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:isPago?'1px solid #2E7D7A':isCancelado?'1px solid #3A1010':'1px solid #3A2018', marginBottom:'10px', overflow:'hidden', opacity:isCancelado?0.5:1 }}>
      <div style={{ height:'3px', background:isPago?'#2E7D7A':pixPago?'#3A9E9A':'#8B3A2A' }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:'700', color:'#E8C96A' }}>{ag.hora}</span>
              <span style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{ag.clienteNome?.split(' ')[0]}</span>
              {ag.agendadoPor==='recepcao' && <span style={{ fontSize:'10px', background:'rgba(46,125,122,0.2)', color:'#2E7D7A', padding:'2px 6px', borderRadius:'8px' }}>Manual</span>}
            </div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>✂️ {ag.barbeiroNome} · 💈 {ag.servico}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>{moeda(ag.valor)}</div>
            <div style={{ fontSize:'11px', color:pixPago?'#2E7D7A':'#9A8880' }}>{pixPago?'💳 Pix pago':'💵 No local'}</div>
          </div>
        </div>

        {/* ✅ P13 — Badge Pix pendente */}
        {(ag.pagamento==='pix'||ag.pagamento==='pix_sinal') && ag.status!=='concluido' && (
          <div style={{ background:'rgba(130,10,209,0.1)', border:'1px solid rgba(130,10,209,0.3)', borderRadius:'10px', padding:'8px 12px', marginBottom:'8px', fontSize:'12px', color:'#820AD1', fontWeight:'600' }}>
            💜 Pix enviado — confirme ao receber comprovante
          </div>
        )}

        {isPago ? (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(46,125,122,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', color:'#2E7D7A', fontWeight:'600' }}>
            ✅ Pagamento confirmado {ag.pagamentoFinal && <span style={{ fontSize:'11px', color:'#9A8880' }}>· {ag.pagamentoFinal}</span>}
          </div>
        ) : isCancelado ? (
          <div style={{ fontSize:'12px', color:'#F44336', textAlign:'center' }}>✗ Cancelado</div>
        ) : (
          <div style={{ display:'flex', gap:'8px' }}>
            {!pixPago ? (
              <button onClick={() => onPagar(ag)} style={{ flex:2, padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                💰 Confirmar Pagamento
              </button>
            ) : (
              <div style={{ flex:2, padding:'10px', borderRadius:'10px', background:'rgba(46,125,122,0.15)', textAlign:'center', fontSize:'13px', color:'#2E7D7A', fontWeight:'600' }}>
                💳 Pix já confirmado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function PainelRecepcao({ onBack, dark, onNavegarAssinaturas }) {
  const s = getStyles(dark);
  const [agendamentos, setAgendamentos]     = React.useState([]);
  const [carregando, setCarregando]         = React.useState(true);
  const [modalPagamento, setModalPagamento] = React.useState(null);
  const [modalNovo, setModalNovo]           = React.useState(false);
  const [clientePreencher, setClientePreencher] = React.useState(null); // ✅ P14
  const [aba, setAba]                       = React.useState('fila');
  const [toast, setToast]                   = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db,'agendamentos'), where('data','==',hoje()));
    const unsub = onSnapshot(q, snap => {
      setAgendamentos(snap.docs.map(d=>({firestoreId:d.id,...d.data()})).sort((a,b)=>a.hora.localeCompare(b.hora)));
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  const ativos      = agendamentos.filter(a => !a.status?.includes('cancelado'));
  const confirmados = agendamentos.filter(a => a.status==='confirmado');
  const concluidos  = agendamentos.filter(a => a.status==='concluido');
  const totalPrevisto = ativos.reduce((acc,a)=>acc+(a.valor||0),0);
  const totalRecebido = concluidos.reduce((acc,a)=>acc+(a.valorRecebido||a.valor||0),0);
  const totalPix    = ativos.filter(a=>a.pagamento==='pix'||a.pagamento==='pix_sinal').reduce((acc,a)=>acc+(a.valor||0),0);

  function handleAgendamentoSalvo() { setModalNovo(false); setClientePreencher(null); setAba('fila'); setToast('✅ Agendamento criado!'); }
  function handlePagamentoConfirmado() { setModalPagamento(null); setToast('💰 Pagamento confirmado!'); }

  // ✅ P14 — Ao clicar "Agendar para cliente" na busca
  function handleAgendarParaCliente(cliente) {
    setClientePreencher(cliente);
    setModalNovo(true);
  }

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'8px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>🏠 Recepção</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</div>
        </div>
        {/* ✅ P13 — Botão Planos */}
        {onNavegarAssinaturas && (
          <button onClick={onNavegarAssinaturas} style={{ background:'rgba(201,168,76,0.2)', border:'1px solid rgba(201,168,76,0.4)', borderRadius:'10px', padding:'8px 10px', color:'#E8C96A', fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            💳 Planos
          </button>
        )}
        <button onClick={() => setModalNovo(true)} style={{ background:'rgba(245,239,230,0.15)', border:'1px solid rgba(245,239,230,0.3)', borderRadius:'10px', padding:'8px 12px', color:'#F5EFE6', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          ➕ Novo
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', padding:'12px 16px', borderBottom:'1px solid #3A2018' }}>
        {[
          { label:'Na fila',  value:confirmados.length,              color:'#FFC107' },
          { label:'Pagos',    value:concluidos.length,               color:'#2E7D7A' },
          { label:'Recebido', value:`R$${totalRecebido.toFixed(0)}`, color:'#E8C96A' },
        ].map(item => (
          <div key={item.label} style={{ background:'#231410', borderRadius:'12px', padding:'10px', textAlign:'center', border:'1px solid #3A2018' }}>
            <div style={{ fontSize:'18px', fontWeight:'700', color:item.color }}>{item.value}</div>
            <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', overflowX:'auto' }}>
        {[
          { id:'fila',   label:`🕐 Fila (${ativos.length})` },
          { id:'busca',  label:'🔍 Buscar Cliente'           }, // ✅ P14
          { id:'resumo', label:'💰 Caixa'                    },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, padding:'12px 8px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>

        {/* ABA FILA */}
        {aba==='fila' && (
          carregando ? <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>
          : ativos.length===0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>📅</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>Nenhum agendamento hoje</div>
              <button onClick={() => setModalNovo(true)} style={{ padding:'12px 24px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>➕ Criar agendamento</button>
            </div>
          ) : agendamentos.map(ag => <CardFila key={ag.firestoreId} ag={ag} onPagar={ag => setModalPagamento(ag)} />)
        )}

        {/* ✅ ABA BUSCA */}
        {aba==='busca' && <BuscaCliente onAgendarParaCliente={handleAgendarParaCliente} />}

        {/* ABA CAIXA */}
        {aba==='resumo' && (
          <div>
            {[
              { label:'Total previsto',  value:moeda(totalPrevisto),              color:'#9A8880', sub:'Se todos comparecerem'  },
              { label:'Total recebido',  value:moeda(totalRecebido),              color:'#4CAF50', sub:'Pagamentos confirmados'  },
              { label:'Via Pix',         value:moeda(totalPix),                   color:'#2E7D7A', sub:'Pix antecipado + local'  },
              { label:'Pendente',        value:moeda(totalPrevisto-totalRecebido),color:'#FFC107', sub:'A receber ainda'         },
            ].map(item => (
              <div key={item.label} style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'13px', color:'#9A8880' }}>{item.label}</div>
                  <div style={{ fontSize:'11px', color:'#555', marginTop:'2px' }}>{item.sub}</div>
                </div>
                <div style={{ fontSize:'20px', fontWeight:'700', color:item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalPagamento && <ModalPagamento agendamento={modalPagamento} onConfirmar={handlePagamentoConfirmado} onFechar={() => setModalPagamento(null)} />}
      {modalNovo && <ModalNovoAgendamento agendamentosHoje={agendamentos} onSalvar={handleAgendamentoSalvo} onFechar={() => { setModalNovo(false); setClientePreencher(null); }} clientePreencher={clientePreencher} />}
      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
    </div>
  );
}
