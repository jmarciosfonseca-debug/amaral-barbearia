// PainelRecepcao.jsx — Flyguer BarberShop
// ✅ FINAL: Nome "RECEPÇÃO" | Excluir histórico | Ver clientes/valores/serviços/planos
// ✅ Fase 2: Encaixe Rápido | Notificação tempo real

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, deleteDoc, addDoc, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import LembretesRecepcao from './LembretesRecepcao';

function hoje() { return new Date().toISOString().split('T')[0]; }
function moeda(v) { return `R$ ${(v||0).toFixed(2).replace('.',',')}`; }
function formatarData(d) { if(!d) return ''; const [a,m,dia]=d.split('-'); return `${dia}/${m}/${a}`; }

const FORMAS = [
  { id:'dinheiro', label:'💵 Dinheiro', cor:'#4CAF50' },
  { id:'cartao',   label:'💳 Cartão',   cor:'#2196F3' },
  { id:'pix_local',label:'📱 Pix',      cor:'#2E7D7A' },
];

function Toast({ mensagem, tipo, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = tipo==='novo' ? 'linear-gradient(135deg,#8B3A2A,#C9A84C)' : tipo==='erro' ? 'linear-gradient(135deg,#8B0000,#F44336)' : 'linear-gradient(135deg,#2E7D7A,#3A9E9A)';
  return (
    <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', background:bg, color:'#F5EFE6', padding:'14px 24px', borderRadius:'16px', fontSize:'14px', fontWeight:'700', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', whiteSpace:'nowrap' }}>
      {mensagem}
    </div>
  );
}

function ModalPagamento({ agendamento, onConfirmar, onFechar }) {
  const [forma, setForma]   = React.useState('dinheiro');
  const [valor, setValor]   = React.useState(agendamento.valor||0);
  const [obs, setObs]       = React.useState('');
  const [salvando, setSalv] = React.useState(false);
  const sinal    = agendamento.sinal||0;
  const restante = Math.max(0, valor-sinal);
  const inp = { width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };

  async function ok() {
    setSalv(true);
    try {
      await updateDoc(doc(db,'agendamentos',agendamento.firestoreId), { status:'concluido', pagamentoFinal:forma, valorFinal:valor, sinalAbatido:sinal, valorRecebido:restante, observacaoCaixa:obs, concluidoEm:serverTimestamp(), pagoEm:serverTimestamp() });
      onConfirmar();
    } catch(e){ console.error(e); } finally { setSalv(false); }
  }

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
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Valor (R$)</label>
          <input type="number" style={inp} value={valor} onChange={e=>setValor(parseFloat(e.target.value)||0)} />
        </div>
        {sinal>0 && (
          <div style={{ background:'rgba(46,125,122,0.1)', border:'1px solid rgba(46,125,122,0.3)', borderRadius:'10px', padding:'10px 12px', marginBottom:'14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'12px', color:'#9A8880' }}>Sinal Pix já pago:</span>
              <span style={{ fontSize:'12px', color:'#2E7D7A', fontWeight:'700' }}>- {moeda(sinal)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px' }}>
              <span style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>A receber agora:</span>
              <span style={{ fontSize:'16px', color:'#E8C96A', fontWeight:'700' }}>{moeda(restante)}</span>
            </div>
          </div>
        )}
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Forma de pagamento</label>
          <div style={{ display:'flex', gap:'8px' }}>
            {FORMAS.map(f => (
              <button key={f.id} onClick={()=>setForma(f.id)} style={{ flex:1, padding:'10px 6px', borderRadius:'10px', border:forma===f.id?`2px solid ${f.cor}`:'1px solid #3A2018', background:forma===f.id?`${f.cor}22`:'#231410', color:forma===f.id?f.cor:'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Observação</label>
          <input type="text" style={inp} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex: troco..." />
        </div>
        <button onClick={ok} disabled={salvando} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer' }}>
          {salvando?'⏳ Registrando...':`✅ Confirmar ${moeda(restante)} recebido`}
        </button>
      </div>
    </div>
  );
}

// ✅ FINAL: Encaixe Rápido com busca de cliente cadastrado
function ModalEncaixeRapido({ onSalvar, onFechar }) {
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [configH, setConfigH]     = React.useState(null);
  const [horasOcup, setHOcup]     = React.useState([]);
  const [salvando, setSalv]       = React.useState(false);
  const [erro, setErro]           = React.useState('');
  const [modoCliente, setModoCliente] = React.useState('novo'); // 'novo' | 'buscar'
  const [buscaCliente, setBuscaCliente] = React.useState('');
  const [clienteEncontrado, setClienteEncontrado] = React.useState(null);
  const [buscando, setBuscando]   = React.useState(false);
  const [form, setForm] = React.useState({ clienteNome:'', clienteTel:'', barbeiroId:'', barbeiroNome:'', hora:'' });

  const inp = { width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };
  function setF(k,v){ setForm(f=>({...f,[k]:v})); setErro(''); }
  function setBarbeiro(id){ const b=barbeiros.find(b=>b.id===id); setF('barbeiroId',id); setF('barbeiroNome',b?.nome||''); }

  React.useEffect(() => {
    getDocs(collection(db,'barbeiros')).then(s=>setBarbeiros(s.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.ativo&&b.papel!=='recepcao')));
    import('firebase/firestore').then(({getDoc,doc:fd})=>{
      getDoc(fd(db,'config','barbearia')).then(s=>{ if(s.exists()) setConfigH(s.data()); });
    });
  },[]);

  React.useEffect(()=>{
    if(!form.barbeiroId){ setHOcup([]); return; }
    getDocs(query(collection(db,'agendamentos'),where('data','==',hoje()))).then(s=>{
      setHOcup(s.docs.map(d=>d.data()).filter(a=>a.barbeiroId===form.barbeiroId&&!['cancelado','cancelado_cliente','cancelado_barbearia'].includes(a.status)).map(a=>a.hora));
    });
  },[form.barbeiroId]);

  // Busca cliente cadastrado
  React.useEffect(() => {
    if (modoCliente !== 'buscar' || buscaCliente.trim().length < 2) { setClienteEncontrado(null); return; }
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const snap = await getDocs(collection(db,'clientes'));
        const bl = buscaCliente.toLowerCase();
        const nums = buscaCliente.replace(/\D/g,'');
        const lista = snap.docs.map(d=>({id:d.id,...d.data()})).filter(c =>
          c.nome?.toLowerCase().includes(bl) ||
          (nums && c.telefone?.replace(/\D/g,'').includes(nums))
        );
        if (lista.length > 0) {
          setClienteEncontrado(lista[0]);
          setF('clienteNome', lista[0].nome);
          setF('clienteTel', lista[0].telefone || '');
        } else { setClienteEncontrado(null); }
      } catch(e) {}
      setBuscando(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [buscaCliente, modoCliente]);

  function gerarSlots(){
    const DK=['dom','seg','ter','qua','qui','sex','sab'];
    const ds=DK[new Date(hoje()+'T12:00:00').getDay()];
    const hc=configH?.horarios?.[ds];
    const agora = new Date();
    const agoraMin = agora.getHours()*60 + agora.getMinutes();
    let ini=8*60, fim=24*60;
    if(hc?.aberto){ const [hA,mA]=hc.abertura.split(':').map(Number); const [hF,mF]=hc.fechamento.split(':').map(Number); ini=hA*60+mA; fim=hF===0&&mF===0?24*60:hF*60+mF; }
    if(ini < agoraMin + 5) ini = Math.ceil((agoraMin + 5) / 30) * 30;
    const slots=[]; let a=ini;
    while(a<fim){ const h=`${String(Math.floor(a/60)).padStart(2,'0')}:${String(a%60).padStart(2,'0')}`; slots.push({hora:h,ocupado:horasOcup.includes(h)}); a+=30; }
    return slots;
  }

  function notificarCliente(ag){
    const tel=ag.clienteTel?.replace(/\D/g,'');
    if(!tel) return;
    const msg=`Olá, ${ag.clienteNome?.split(' ')[0]}! 👋\n\nSeu encaixe foi confirmado:\n\n✂️ ${ag.barbeiroNome}\n🕐 Hoje às ${ag.hora}\n\nNos vemos em breve! 💈\n_Flyguer BarberShop_`;
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  }

  async function salvar(){
    if(!form.clienteNome.trim()){ setErro('Nome obrigatório'); return; }
    if(!form.barbeiroId){ setErro('Selecione o barbeiro'); return; }
    if(!form.hora){ setErro('Selecione o horário'); return; }
    if(horasOcup.includes(form.hora)){ setErro(`Horário ${form.hora} ocupado`); return; }
    setSalv(true); setErro('');
    try {
      const telNorm = (form.clienteTel||'').replace(/\D/g,'').slice(-11);
      const ag = {
        clienteNome: form.clienteNome.trim(), clienteTel: telNorm,
        clienteCpf: clienteEncontrado?.cpf || clienteEncontrado?.id || 'encaixe',
        barbeiroId: form.barbeiroId, barbeiroNome: form.barbeiroNome,
        servico: 'Encaixe', valor: 0, duracao: 30,
        data: hoje(), hora: form.hora, pagamento: 'local', sinal: 0,
        status: 'confirmado', agendadoPor: 'recepcao',
        encaixeRapido: true, semCadastro: !clienteEncontrado,
        lembrete24hEnviado: false, lembrete2hEnviado: false,
        criadoEm: serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'), ag);
      notificarCliente(ag);
      onSalvar();
    } catch(e){ setErro('Erro ao salvar.'); console.error(e); } finally { setSalv(false); }
  }

  const slots = gerarSlots();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>⚡ Encaixe Rápido</div>
            <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>Hoje · rápido e direto</div>
          </div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>

        {/* Modo cliente */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
          <button onClick={()=>setModoCliente('novo')} style={{ flex:1, padding:'10px', borderRadius:'10px', border:modoCliente==='novo'?'2px solid #8B3A2A':'1px solid #3A2018', background:modoCliente==='novo'?'rgba(139,58,42,0.2)':'#231410', color:modoCliente==='novo'?'#E8C96A':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
            ✏️ Digitar nome
          </button>
          <button onClick={()=>setModoCliente('buscar')} style={{ flex:1, padding:'10px', borderRadius:'10px', border:modoCliente==='buscar'?'2px solid #2E7D7A':'1px solid #3A2018', background:modoCliente==='buscar'?'rgba(46,125,122,0.2)':'#231410', color:modoCliente==='buscar'?'#2E7D7A':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
            🔍 Buscar cadastrado
          </button>
        </div>

        {modoCliente === 'buscar' ? (
          <div style={{ marginBottom:'12px' }}>
            <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Nome ou telefone</label>
            <div style={{ position:'relative' }}>
              <input type="text" style={inp} placeholder="Digite para buscar..." value={buscaCliente} onChange={e=>setBuscaCliente(e.target.value)} autoFocus />
              {buscando && <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', color:'#9A8880', fontSize:'12px' }}>⏳</div>}
            </div>
            {clienteEncontrado && (
              <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.3)', borderRadius:'10px', padding:'10px 12px', marginTop:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
                  {clienteEncontrado.nome[0]}
                </div>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'13px', color:'#F5EFE6' }}>{clienteEncontrado.nome}</div>
                  <div style={{ fontSize:'11px', color:'#4CAF50' }}>✅ Cadastrado · {clienteEncontrado.telefone||'—'}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom:'12px' }}>
              <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Nome do cliente *</label>
              <input type="text" style={inp} placeholder="Nome completo" value={form.clienteNome} onChange={e=>setF('clienteNome',e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom:'12px' }}>
              <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>WhatsApp <span style={{ color:'#555' }}>(opcional)</span></label>
              <input type="tel" style={inp} placeholder="11999999999" value={form.clienteTel} onChange={e=>setF('clienteTel',e.target.value)} />
            </div>
          </>
        )}

        {/* Barbeiro */}
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Barbeiro *</label>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {barbeiros.map(b => (
              <button key={b.id} onClick={()=>setBarbeiro(b.id)}
                style={{ flex:1, minWidth:'80px', padding:'10px 8px', borderRadius:'12px', border:form.barbeiroId===b.id?'2px solid #8B3A2A':'1px solid #3A2018', background:form.barbeiroId===b.id?'rgba(139,58,42,0.2)':'#231410', color:form.barbeiroId===b.id?'#E8C96A':'#9A8880', fontSize:'13px', fontWeight:'600', cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:'18px', marginBottom:'2px' }}>{b.nome[0]}</div>
                <div>{b.nome.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Horário */}
        {form.barbeiroId && (
          <div style={{ marginBottom:'16px' }}>
            <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Horário hoje *</label>
            {slots.length === 0 ? (
              <div style={{ textAlign:'center', color:'#9A8880', fontSize:'13px', padding:'12px', background:'#231410', borderRadius:'10px' }}>Sem horários disponíveis hoje</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', maxHeight:'140px', overflowY:'auto' }}>
                {slots.map(({hora,ocupado}) => (
                  <button key={hora} disabled={ocupado} onClick={()=>!ocupado&&setF('hora',hora)}
                    style={{ padding:'8px 4px', borderRadius:'8px', background:ocupado?'rgba(244,67,54,0.1)':form.hora===hora?'linear-gradient(135deg,#5C2218,#8B3A2A)':'#2E1A14', color:ocupado?'#F44336':form.hora===hora?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:ocupado?'not-allowed':'pointer', border:form.hora===hora&&!ocupado?'2px solid #8B3A2A':'1px solid #3A2018' }}>
                    {hora}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {erro && <div style={{ fontSize:'13px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'10px', padding:'10px' }}>{erro}</div>}

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ flex:2, padding:'14px', borderRadius:'14px', border:'none', background:salvando?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:salvando?'#555':'#fff', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer' }}>
            {salvando ? '⏳ Salvando...' : '⚡ Encaixar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNovoAgendamento({ onSalvar, onFechar, clientePreencher }) {
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [servicos, setServicos]   = React.useState([]);
  const [configH, setConfigH]     = React.useState(null);
  const [selSvs, setSelSvs]       = React.useState([]);
  const [semCad, setSemCad]       = React.useState(!clientePreencher);
  const [form, setForm] = React.useState({
    clienteNome: clientePreencher?.nome||'', clienteTel: clientePreencher?.telefone||'',
    clienteCpf: clientePreencher?.cpf||'manual',
    barbeiroId:'', barbeiroNome:'', data:hoje(), hora:'09:00', pagamento:'local', observacao:'',
  });
  const [salvando, setSalv]   = React.useState(false);
  const [erro, setErro]       = React.useState('');
  const [horasOcup, setHOcup] = React.useState([]);

  const totalVal = selSvs.reduce((a,s)=>a+(s.valor||0),0);
  const totalDur = selSvs.reduce((a,s)=>a+(s.duracao||0),0);
  const nomeSvs  = selSvs.map(s=>s.nome).join(' + ');

  function togSv(sv){ setSelSvs(p=>p.find(s=>s.id===sv.id)?p.filter(s=>s.id!==sv.id):[...p,sv]); setErro(''); }
  function setF(k,v){ setForm(f=>({...f,[k]:v})); setErro(''); }
  function setBarbeiro(id){ const b=barbeiros.find(b=>b.id===id); setF('barbeiroId',id); setF('barbeiroNome',b?.nome||''); }

  React.useEffect(() => {
    getDocs(collection(db,'barbeiros')).then(s=>setBarbeiros(s.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.ativo&&b.papel!=='recepcao')));
    import('firebase/firestore').then(({getDoc,doc:fd})=>{
      getDoc(fd(db,'config','servicos')).then(s=>{ if(s.exists()){ const d=s.data(); setServicos([...(d.avulsos||[]).filter(x=>x.ativo),...(d.combos||[]).filter(x=>x.ativo)]); }});
      getDoc(fd(db,'config','barbearia')).then(s=>{ if(s.exists()) setConfigH(s.data()); });
    });
  },[]);

  React.useEffect(()=>{
    if(!form.barbeiroId||!form.data){ setHOcup([]); return; }
    getDocs(query(collection(db,'agendamentos'),where('data','==',form.data))).then(s=>{
      setHOcup(s.docs.map(d=>d.data()).filter(a=>a.barbeiroId===form.barbeiroId&&!['cancelado','cancelado_cliente','cancelado_barbearia'].includes(a.status)).map(a=>a.hora));
    });
  },[form.barbeiroId,form.data]);

  function gerarSlots(){
    const DK=['dom','seg','ter','qua','qui','sex','sab'];
    const ds=DK[new Date(form.data+'T12:00:00').getDay()];
    const hc=configH?.horarios?.[ds];
    let ini=8*60,fim=24*60;
    if(hc?.aberto){ const [hA,mA]=hc.abertura.split(':').map(Number); const [hF,mF]=hc.fechamento.split(':').map(Number); ini=hA*60+mA; fim=hF===0&&mF===0?24*60:hF*60+mF; }
    const slots=[]; let a=ini;
    while(a<fim){ const h=`${String(Math.floor(a/60)).padStart(2,'0')}:${String(a%60).padStart(2,'0')}`; slots.push({hora:h,ocupado:horasOcup.includes(h)}); a+=30; }
    return slots;
  }

  function notificarCliente(ag){
    const tel=ag.clienteTel?.replace(/\D/g,'');
    if(!tel) return;
    const link='https://flyguer-barbershop.vercel.app';
    const novo=semCad&&!clientePreencher;
    const msg=novo
      ?`Olá, ${ag.clienteNome?.split(' ')[0]}! 👋\n\nSeu agendamento foi marcado:\n\n✂️ ${ag.barbeiroNome}\n💈 ${ag.servico}\n📅 ${formatarData(ag.data)} às ${ag.hora}\n💰 R$ ${(ag.valor||0).toFixed(2).replace('.',',')}\n\n📲 Cadastre-se no app:\n👉 ${link}\n\n_Flyguer BarberShop_ ✂️`
      :`Olá, ${ag.clienteNome?.split(' ')[0]}! 👋\n\nSeu agendamento foi confirmado:\n\n✂️ ${ag.barbeiroNome}\n💈 ${ag.servico}\n📅 ${formatarData(ag.data)} às ${ag.hora}\n💰 R$ ${(ag.valor||0).toFixed(2).replace('.',',')}\n\nAcompanhe pelo app: ${link}\n\n_Flyguer BarberShop_ ✂️`;
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  }

  async function salvar(){
    if(!form.clienteNome.trim()){ setErro('Nome obrigatório'); return; }
    if(!form.barbeiroId){ setErro('Selecione barbeiro'); return; }
    if(selSvs.length===0){ setErro('Selecione serviço'); return; }
    if(horasOcup.includes(form.hora)){ setErro(`Horário ${form.hora} ocupado`); return; }
    setSalv(true); setErro('');
    try {
      const telNorm = (form.clienteTel||'').replace(/\D/g,'').slice(-11);
      const ag={ ...form, servico:nomeSvs, valor:totalVal, duracao:totalDur, servicoIds:selSvs.map(s=>s.id).filter(Boolean), status:'confirmado', agendadoPor:'recepcao', sinal:0, semCadastro:semCad&&!clientePreencher, clienteTel:telNorm, lembrete24hEnviado:false, lembrete2hEnviado:false, criadoEm:serverTimestamp() };
      await addDoc(collection(db,'agendamentos'),ag);
      notificarCliente(ag);
      onSalvar();
    } catch(e){ setErro('Erro ao salvar.'); console.error(e); } finally { setSalv(false); }
  }

  const inp={ width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };
  const slots=gerarSlots();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>➕ Agendamento Manual</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>
        {!clientePreencher && (
          <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
            <button onClick={()=>setSemCad(false)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:!semCad?'2px solid #8B3A2A':'1px solid #3A2018', background:!semCad?'rgba(139,58,42,0.2)':'#231410', color:!semCad?'#E8C96A':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>👤 Com app</button>
            <button onClick={()=>setSemCad(true)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:semCad?'2px solid #2E7D7A':'1px solid #3A2018', background:semCad?'rgba(46,125,122,0.2)':'#231410', color:semCad?'#2E7D7A':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>📋 Sem cadastro</button>
          </div>
        )}
        {[{label:'Nome *',campo:'clienteNome',ph:'Nome completo',t:'text'},{label:'WhatsApp *',campo:'clienteTel',ph:'11999999999',t:'tel'}].map(f=>(
          <div key={f.campo} style={{ marginBottom:'12px' }}>
            <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>{f.label}</label>
            <input type={f.t} style={inp} placeholder={f.ph} value={form[f.campo]} onChange={e=>setF(f.campo,e.target.value)} />
          </div>
        ))}
        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Barbeiro *</label>
          <select style={inp} value={form.barbeiroId} onChange={e=>setBarbeiro(e.target.value)}>
            <option value="">Selecione...</option>
            {barbeiros.map(b=><option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Serviços *</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {servicos.map(sv=>{
              const sel=!!selSvs.find(s=>s.id===sv.id);
              return (
                <div key={sv.id} onClick={()=>togSv(sv)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', cursor:'pointer', background:sel?'#2E1A14':'#1A0F0D', border:sel?'1.5px solid #8B3A2A':'1px solid #3A2018' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'18px', height:'18px', borderRadius:'5px', flexShrink:0, border:`2px solid ${sel?'#8B3A2A':'#3A2018'}`, background:sel?'#8B3A2A':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#F5EFE6' }}>{sel?'✓':''}</div>
                    <div style={{ fontSize:'13px', fontWeight:sel?'700':'400', color:sel?'#F5EFE6':'#9A8880' }}>{sv.nome}</div>
                  </div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:sel?'#E8C96A':'#9A8880' }}>R$ {sv.valor.toFixed(2).replace('.',',')}</div>
                </div>
              );
            })}
          </div>
          {selSvs.length>0&&<div style={{ marginTop:'8px', padding:'8px 12px', borderRadius:'10px', background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:'11px', color:'#9A8880' }}>{nomeSvs}</span>
            <span style={{ fontSize:'15px', fontWeight:'700', color:'#E8C96A' }}>R$ {totalVal.toFixed(2).replace('.',',')}</span>
          </div>}
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Data</label>
          <input type="date" style={inp} value={form.data} onChange={e=>setF('data',e.target.value)} />
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Horário</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', maxHeight:'160px', overflowY:'auto' }}>
            {slots.map(({hora,ocupado})=>(
              <button key={hora} disabled={ocupado} onClick={()=>!ocupado&&setF('hora',hora)}
                style={{ padding:'8px 4px', borderRadius:'8px', background:ocupado?'rgba(244,67,54,0.15)':form.hora===hora?'linear-gradient(135deg,#5C2218,#8B3A2A)':'#2E1A14', color:ocupado?'#F44336':form.hora===hora?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:ocupado?'not-allowed':'pointer', border:form.hora===hora&&!ocupado?'2px solid #8B3A2A':'1px solid #3A2018' }}>
                {hora}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Pagamento</label>
          <div style={{ display:'flex', gap:'8px' }}>
            {[{id:'local',l:'💵 Local'},{id:'dinheiro',l:'💵 Dinheiro'},{id:'cartao',l:'💳 Cartão'},{id:'pix',l:'📱 Pix'}].map(f=>(
              <button key={f.id} onClick={()=>setF('pagamento',f.id)} style={{ flex:1, padding:'8px 4px', borderRadius:'10px', border:form.pagamento===f.id?'2px solid #8B3A2A':'1px solid #3A2018', background:form.pagamento===f.id?'rgba(139,58,42,0.2)':'#231410', color:form.pagamento===f.id?'#E8C96A':'#9A8880', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>{f.l}</button>
            ))}
          </div>
        </div>
        {erro&&<div style={{ fontSize:'13px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'10px', padding:'10px' }}>{erro}</div>}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ flex:2, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer' }}>
            {salvando?'⏳ Salvando...':'✅ Criar e Notificar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BuscaCliente({ onAgendarParaCliente }) {
  const [busca, setBusca]       = React.useState('');
  const [resultados, setResultados] = React.useState([]);
  const [hist, setHist]         = React.useState([]);
  const [buscando, setBuscando] = React.useState(false);
  const [erro, setErro]         = React.useState('');
  const [exp, setExp]           = React.useState(false);
  const [res, setRes]           = React.useState(null);
  const [promoCliente, setPromoCliente] = React.useState(null);

  React.useEffect(() => {
    setRes(null); setHist([]); setErro(''); setPromoCliente(null);
    if (busca.trim().length < 2) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const { collection: col, getDocs: gd, query: q, where: w, doc: fd, getDoc } = await import('firebase/firestore');
        const snap = await gd(col(db, 'clientes'));
        const bl = busca.toLowerCase().trim(), nums = busca.replace(/\D/g, '');
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c =>
          c.nome?.toLowerCase().includes(bl) || c.telefone?.includes(busca.trim()) ||
          (nums && (c.telefone?.replace(/\D/g,'').includes(nums) || c.cpf?.includes(nums)))
        );
        setResultados(lista);
        if (!lista.length) { setErro('Nenhum cliente encontrado.'); }
        if (lista.length === 1) {
          const cl = lista[0]; setRes(cl);
          const sa = await gd(q(col(db,'agendamentos'), w('clienteCpf','==',cl.cpf||cl.id)));
          setHist(sa.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.data?.localeCompare(a.data)).slice(0,5));
          try {
            const snapPromo = await getDoc(fd(db,'resgates_promo',`${cl.cpf}_ativa`));
            if (snapPromo.exists() && !snapPromo.data().utilizado) setPromoCliente(snapPromo.data());
          } catch(e) {}
        }
      } catch(e) { setErro('Erro: ' + e.message); }
      setBuscando(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [busca]);

  async function selecionarCliente(cl) {
    setRes(cl); setHist([]); setPromoCliente(null);
    try {
      const { collection: col, getDocs: gd, query: q, where: w, doc: fd, getDoc } = await import('firebase/firestore');
      const sa = await gd(q(col(db,'agendamentos'), w('clienteCpf','==',cl.cpf||cl.id)));
      setHist(sa.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.data?.localeCompare(a.data)).slice(0,5));
      try {
        const snapPromo = await getDoc(fd(db,'resgates_promo',`${cl.cpf}_ativa`));
        if (snapPromo.exists() && !snapPromo.data().utilizado) setPromoCliente(snapPromo.data());
      } catch(e) {}
    } catch(e) {}
  }

  const conc=hist.filter(a=>a.status==='concluido');
  const gasto=conc.reduce((a,x)=>a+(x.valorFinal||x.valor||0),0);
  const cancelados=hist.filter(a=>a.status?.includes('cancelado'));

  return (
    <div>
      <div style={{ marginBottom:'16px', position:'relative' }}>
        <input value={busca} onChange={e=>{setBusca(e.target.value);setErro('');}} placeholder="🔍 Nome, telefone ou CPF..."
          style={{ width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
        {buscando && <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', color:'#9A8880', fontSize:'12px' }}>⏳</div>}
      </div>
      {resultados.length > 1 && !res && resultados.map(cl => (
        <div key={cl.id} onClick={() => selecionarCliente(cl)}
          style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', marginBottom:'8px', cursor:'pointer' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>{(cl.nome||'?')[0].toUpperCase()}</div>
          <div><div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{cl.nome}</div><div style={{ fontSize:'11px', color:'#9A8880' }}>📞 {cl.telefone||'—'}</div></div>
        </div>
      ))}
      {erro&&<div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>}
      {res&&(
        <div style={{ background:'#231410', border:'1px solid #3A2018', borderRadius:'16px', overflow:'hidden' }}>
          <div style={{ height:'3px', background:'linear-gradient(90deg,#5C2218,#C9A84C)' }} />
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>{(res.nome||'?')[0].toUpperCase()}</div>
              <div><div style={{ fontWeight:'700', fontSize:'16px', color:'#F5EFE6' }}>{res.nome}</div><div style={{ fontSize:'12px', color:'#9A8880' }}>📞 {res.telefone||'—'}</div></div>
            </div>
            {promoCliente && (
              <div style={{ background:'linear-gradient(135deg,rgba(139,0,0,0.3),rgba(244,67,54,0.15))', border:'1px solid rgba(244,67,54,0.4)', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'18px' }}>🔥</span>
                <div><div style={{ fontSize:'12px', fontWeight:'700', color:'#F44336' }}>Promoção resgatada — não utilizada!</div><div style={{ fontSize:'11px', color:'#F5EFE6' }}>{promoCliente.promoDescricao || promoCliente.promoTitulo}</div></div>
              </div>
            )}
            {cancelados.length > 2 && (
              <div style={{ background:'rgba(255,193,7,0.08)', border:'1px solid rgba(255,193,7,0.2)', borderRadius:'10px', padding:'8px 10px', marginBottom:'10px', fontSize:'11px', color:'#FFC107' }}>
                ⚠️ {cancelados.length}x cancelamentos no histórico
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
              {[{l:'Visitas',v:conc.length,c:'#E8C96A'},{l:'Total gasto',v:`R$${gasto.toFixed(0)}`,c:'#4CAF50'}].map(x=>(
                <div key={x.l} style={{ background:'#1A0F0D', borderRadius:'10px', padding:'8px', textAlign:'center' }}>
                  <div style={{ fontSize:'15px', fontWeight:'700', color:x.c }}>{x.v}</div>
                  <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>{x.l}</div>
                </div>
              ))}
            </div>
            {hist.length>0&&(
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#9A8880', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>
                  Atendimentos <button onClick={()=>setExp(e=>!e)} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'11px', cursor:'pointer', marginLeft:'8px' }}>{exp?'▲':'▼'}</button>
                </div>
                {hist.slice(0,exp?5:2).map(ag=>(
                  <div key={ag.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background:'#1A0F0D', borderRadius:'8px', marginBottom:'3px' }}>
                    <div><div style={{ fontSize:'12px', color:'#F5EFE6', fontWeight:'600' }}>{ag.servico}</div><div style={{ fontSize:'10px', color:'#9A8880' }}>✂️ {ag.barbeiroNome} · {formatarData(ag.data)}</div></div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700' }}>R$ {(ag.valorFinal||ag.valor||0).toFixed(2)}</div>
                      <div style={{ fontSize:'10px', color:ag.status==='concluido'?'#4CAF50':ag.status?.includes('cancelado')?'#F44336':'#FFC107' }}>{ag.status==='concluido'?'✓':ag.status?.includes('cancelado')?'✗':'⏳'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>onAgendarParaCliente(res)} style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
              📅 Criar agendamento para {res.nome.split(' ')[0]}
            </button>
          </div>
        </div>
      )}
      {!res&&!erro&&!buscando&&<div style={{ textAlign:'center', padding:'40px 20px', color:'#555' }}><div style={{ fontSize:'32px', marginBottom:'8px' }}>🔍</div><div style={{ fontSize:'13px' }}>Digite nome ou telefone</div></div>}
    </div>
  );
}

// ✅ FINAL: CardFila com opção de excluir
function CardFila({ ag, onPagar, onExcluir }) {
  const isPago  = ag.status==='concluido';
  const isCanel = ag.status?.includes('cancelado');
  const pixPago = ag.pagamento==='pix'||ag.pagamento==='pix_sinal';
  if(isCanel) return null;
  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:isPago?'1px solid #2E7D7A':'1px solid #3A2018', marginBottom:'10px', overflow:'hidden' }}>
      <div style={{ height:'3px', background:isPago?'#2E7D7A':pixPago?'#3A9E9A':'#8B3A2A' }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:'700', color:'#E8C96A' }}>{ag.hora}</span>
              <span style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{ag.clienteNome?.split(' ')[0]}</span>
              {ag.agendadoPor==='recepcao'&&<span style={{ fontSize:'10px', background:'rgba(46,125,122,0.2)', color:'#2E7D7A', padding:'2px 6px', borderRadius:'8px' }}>Manual</span>}
              {ag.encaixeRapido&&<span style={{ fontSize:'10px', background:'rgba(46,125,122,0.25)', color:'#3A9E9A', padding:'2px 6px', borderRadius:'8px' }}>⚡ Encaixe</span>}
              {ag.semCadastro&&<span style={{ fontSize:'10px', background:'rgba(255,193,7,0.15)', color:'#FFC107', padding:'2px 6px', borderRadius:'8px' }}>Sem app</span>}
              {ag.amigoDeClienteNome&&<span style={{ fontSize:'10px', background:'rgba(76,175,80,0.15)', color:'#4CAF50', padding:'2px 6px', borderRadius:'8px' }}>👥 Amigo</span>}
            </div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>✂️ {ag.barbeiroNome} · 💈 {ag.servico}</div>
          </div>
          <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
            <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>{moeda(ag.valor)}</div>
            <div style={{ fontSize:'11px', color:pixPago?'#2E7D7A':'#9A8880' }}>{pixPago?'💳 Pix':'💵 Local'}</div>
            {/* ✅ FINAL: botão excluir do histórico */}
            <button onClick={() => onExcluir(ag)}
              style={{ background:'none', border:'none', color:'#555', fontSize:'11px', cursor:'pointer', padding:'2px 0' }}>🗑</button>
          </div>
        </div>
        {isPago?(
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(46,125,122,0.1)', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', color:'#2E7D7A', fontWeight:'600' }}>
            ✅ Pagamento confirmado {ag.pagamentoFinal&&<span style={{ fontSize:'11px', color:'#9A8880' }}>· {ag.pagamentoFinal}</span>}
          </div>
        ):(
          <button onClick={()=>onPagar(ag)} style={{ width:'100%', padding:'13px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            💰 Confirmar Pagamento Local
          </button>
        )}
      </div>
    </div>
  );
}

function AbaPromocaoRecepcao() {
  const [resgates, setResgates] = React.useState([]);
  const [promo, setPromo]       = React.useState(null);
  const [carregando, setCarr]   = React.useState(true);

  React.useEffect(() => {
    let unsubR;
    import('firebase/firestore').then(({ collection: col, onSnapshot: os, doc: fd, getDoc }) => {
      getDoc(fd(db,'config','promocao_ativa')).then(snap => { if (snap.exists()) setPromo(snap.data()); });
      unsubR = os(col(db,'resgates_promo'), snap => {
        setResgates(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.resgatadoEm?.seconds||0) - (a.resgatadoEm?.seconds||0)));
        setCarr(false);
      }, () => setCarr(false));
    });
    return () => unsubR?.();
  }, []);

  async function limparHistorico() {
    if (!window.confirm('Limpar histórico de resgates?')) return;
    try {
      const { collection: col, getDocs: gd, doc: fd, updateDoc } = await import('firebase/firestore');
      const snap = await gd(col(db,'resgates_promo'));
      await Promise.all(snap.docs.map(d => updateDoc(fd(db,'resgates_promo',d.id), { arquivado: true })));
    } catch(e) { console.error(e); }
  }

  const ativos    = resgates.filter(r => !r.utilizado && !r.arquivado);
  const utilizados = resgates.filter(r => r.utilizado && !r.arquivado);

  return (
    <div>
      {promo ? (
        <div style={{ background:promo.ativo?'linear-gradient(135deg,rgba(139,0,0,0.3),rgba(244,67,54,0.15))':'#231410', border:`1px solid ${promo.ativo?'rgba(244,67,54,0.4)':'#3A2018'}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:promo.ativo?'#F44336':'#9A8880', marginBottom:'8px' }}>
            {promo.ativo ? '🔥 Promoção ATIVA' : '⚫ Sem promoção ativa'}
          </div>
          {promo.titulo && <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6', marginBottom:'4px' }}>{promo.titulo}</div>}
          {promo.ativo && <div style={{ fontSize:'11px', color:'#9A8880' }}>{promo.resgatados||0} resgataram · {(promo.vagas||0)-(promo.resgatados||0)} vagas restantes</div>}
        </div>
      ) : <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>Nenhuma promoção configurada</div>}

      {ativos.length > 0 && (
        <>
          <div style={{ fontSize:'11px', color:'#FFC107', fontWeight:'700', marginBottom:'8px', textTransform:'uppercase' }}>⏳ Pendentes ({ativos.length})</div>
          {ativos.map(r => (
            <div key={r.id} style={{ background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.3)', borderRadius:'12px', padding:'12px 14px', marginBottom:'8px' }}>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{r.clienteNome}</div>
              <div style={{ fontSize:'11px', color:'#9A8880' }}>📞 {r.clienteTel||'—'}</div>
              <div style={{ fontSize:'11px', color:'#F44336', marginTop:'2px' }}>🎁 {r.promoDescricao||r.promoTitulo}</div>
            </div>
          ))}
        </>
      )}
      {utilizados.length > 0 && (
        <>
          <div style={{ fontSize:'11px', color:'#4CAF50', fontWeight:'700', marginBottom:'8px', textTransform:'uppercase', marginTop:'16px' }}>✅ Utilizados ({utilizados.length})</div>
          {utilizados.map(r => (
            <div key={r.id} style={{ background:'rgba(76,175,80,0.08)', border:'1px solid rgba(76,175,80,0.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'8px', opacity:0.8 }}>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{r.clienteNome}</div>
              <div style={{ fontSize:'11px', color:'#9A8880' }}>🎁 {r.promoDescricao||r.promoTitulo}</div>
            </div>
          ))}
        </>
      )}
      {resgates.length === 0 && !carregando && (
        <div style={{ textAlign:'center', padding:'30px', color:'#555' }}><div style={{ fontSize:'32px', marginBottom:'8px' }}>🎯</div><div style={{ fontSize:'13px' }}>Nenhum resgate ainda</div></div>
      )}
      {resgates.filter(r=>!r.arquivado).length > 0 && (
        <button onClick={limparHistorico} style={{ width:'100%', marginTop:'16px', padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'transparent', color:'#9A8880', fontSize:'13px', cursor:'pointer' }}>
          🗑️ Limpar histórico de resgates
        </button>
      )}
    </div>
  );
}

// ✅ FINAL: Aba Serviços na recepção
function AbaServicos() {
  const [servicos, setServicos] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);

  React.useEffect(() => {
    import('firebase/firestore').then(({ getDoc, doc: fd }) => {
      getDoc(fd(db,'config','servicos')).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setServicos([...(d.avulsos||[]).filter(s=>s.ativo), ...(d.combos||[]).filter(s=>s.ativo)]);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>;

  return (
    <div>
      <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>
        Serviços ativos — {servicos.length} no total
      </div>
      {servicos.map((sv, i) => (
        <div key={i} style={{ background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'12px 14px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{sv.nome}</div>
            <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>⏱ {sv.duracao} min</div>
          </div>
          <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>R$ {sv.valor.toFixed(2).replace('.',',')}</div>
        </div>
      ))}
      {servicos.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>💈</div>
          <div>Nenhum serviço cadastrado</div>
        </div>
      )}
    </div>
  );
}

export default function PainelRecepcao({ onBack, dark, onNavegarAssinaturas }) {
  const s = getStyles(dark);
  const [ags, setAgs]               = React.useState([]);
  const [carregando, setCarr]       = React.useState(true);
  const [modalPag, setModalPag]     = React.useState(null);
  const [modalNovo, setModalNovo]   = React.useState(false);
  const [modalEncaixe, setModalEncaixe] = React.useState(false);
  const [clientePrn, setClientePrn] = React.useState(null);
  const [aba, setAba]               = React.useState('fila');
  const [toast, setToast]           = React.useState(null);
  const [modalLemb, setModalLemb]   = React.useState(false);
  const [confirmExcluir, setConfirmExcluir] = React.useState(null); // ✅ FINAL
  const countRef                    = React.useRef(0);

  React.useEffect(()=>{
    let unsub = ()=>{};
    import('firebase/firestore').then(({ collection: col, query: q, where: w, onSnapshot: os }) => {
      const qr = q(col(db,'resgates_promo'), w('utilizado','==',false));
      unsub = os(qr, snap => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const r = change.doc.data();
            if (r.clienteNome) setToast({ msg: `🔥 ${r.clienteNome.split(' ')[0]} resgatou: ${r.promoTitulo}`, tipo: 'novo' });
          }
        });
      }, ()=>{});
    }).catch(()=>{});
    return () => unsub();
  },[]);

  React.useEffect(()=>{
    const q=query(collection(db,'agendamentos'),where('data','==',hoje()));
    const unsub=onSnapshot(q,snap=>{
      const lista=snap.docs.map(d=>({firestoreId:d.id,...d.data()})).sort((a,b)=>a.hora.localeCompare(b.hora));
      if(countRef.current>0&&lista.length>countRef.current){
        const novo=lista.filter(a=>!a.status?.includes('cancelado')).pop();
        if(novo) setToast({msg:`🔔 Novo agendamento! ${novo.clienteNome?.split(' ')[0]} — ${novo.hora}`,tipo:'novo'});
      }
      countRef.current=lista.length;
      setAgs(lista); setCarr(false);
    });
    return ()=>unsub();
  },[]);

  // ✅ FINAL: excluir agendamento do histórico (soft delete)
  async function handleExcluir(ag) {
    try {
      await updateDoc(doc(db,'agendamentos',ag.firestoreId), { ocultadoRecepcao: true, canceladoEm: serverTimestamp() });
      setToast({ msg:'🗑 Removido da fila', tipo:'ok' });
    } catch(e) { setToast({ msg:'Erro ao remover', tipo:'erro' }); }
    setConfirmExcluir(null);
  }

  const ativos   = ags.filter(a=>!a.status?.includes('cancelado') && !a.ocultadoRecepcao);
  const conc     = ags.filter(a=>a.status==='concluido');
  const conf     = ags.filter(a=>a.status==='confirmado');
  const recebido = conc.reduce((a,x)=>a+(x.valorRecebido||x.valor||0),0);
  const previsto = ativos.reduce((a,x)=>a+(x.valor||0),0);
  const pix      = ativos.filter(a=>a.pagamento==='pix'||a.pagamento==='pix_sinal').reduce((a,x)=>a+(x.valor||0),0);

  const abas = [
    { id:'fila',     l:`🕐 Fila (${ativos.length})`  },
    { id:'busca',    l:'🔍 Buscar'                    },
    { id:'promo',    l:'🔥 Promoção'                  },
    { id:'servicos', l:'💈 Serviços'                  }, // ✅ FINAL
    { id:'resumo',   l:'💰 Caixa'                     },
  ];

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      {/* ✅ FINAL: nome RECEPÇÃO */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'8px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>🏠 RECEPÇÃO</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</div>
        </div>
        {onNavegarAssinaturas&&<button onClick={onNavegarAssinaturas} style={{ background:'rgba(201,168,76,0.2)', border:'1px solid rgba(201,168,76,0.4)', borderRadius:'10px', padding:'8px 10px', color:'#E8C96A', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>💳 Planos</button>}
        <button onClick={()=>setModalLemb(true)} style={{ background:'rgba(255,193,7,0.15)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'10px', padding:'8px 10px', color:'#FFC107', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>🔔</button>
        <button onClick={()=>setModalEncaixe(true)} style={{ background:'rgba(46,125,122,0.25)', border:'1px solid rgba(46,125,122,0.5)', borderRadius:'10px', padding:'8px 10px', color:'#3A9E9A', fontSize:'11px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' }}>⚡ Encaixe</button>
        <button onClick={()=>setModalNovo(true)} style={{ background:'rgba(245,239,230,0.15)', border:'1px solid rgba(245,239,230,0.3)', borderRadius:'10px', padding:'8px 12px', color:'#F5EFE6', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>➕ Novo</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', padding:'12px 16px', borderBottom:'1px solid #3A2018' }}>
        {[{l:'Na fila',v:conf.length,c:'#FFC107'},{l:'Pagos',v:conc.length,c:'#2E7D7A'},{l:'Recebido',v:`R$${recebido.toFixed(0)}`,c:'#E8C96A'}].map(x=>(
          <div key={x.l} style={{ background:'#231410', borderRadius:'12px', padding:'10px', textAlign:'center', border:'1px solid #3A2018' }}>
            <div style={{ fontSize:'18px', fontWeight:'700', color:x.c }}>{x.v}</div>
            <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', overflowX:'auto' }}>
        {abas.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{ flex:1, padding:'12px 8px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer', whiteSpace:'nowrap', minWidth:'60px' }}>
            {a.l}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {aba==='fila'&&(carregando?<div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>:ativos.length===0?(
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>📅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>Nenhum agendamento hoje</div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={()=>setModalEncaixe(true)} style={{ padding:'12px 20px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>⚡ Encaixe Rápido</button>
              <button onClick={()=>setModalNovo(true)} style={{ padding:'12px 20px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>➕ Agendamento</button>
            </div>
          </div>
        ):ags.filter(a=>!a.status?.includes('cancelado')&&!a.ocultadoRecepcao).map(ag=>(
          <CardFila key={ag.firestoreId} ag={ag} onPagar={ag=>setModalPag(ag)} onExcluir={ag=>setConfirmExcluir(ag)} />
        )))}
        {aba==='busca'&&<BuscaCliente onAgendarParaCliente={cl=>{setClientePrn(cl);setModalNovo(true);}} />}
        {aba==='resumo'&&(
          <div>
            {[{l:'Total previsto',v:moeda(previsto),c:'#9A8880',s:'Se todos comparecerem'},{l:'Total recebido',v:moeda(recebido),c:'#4CAF50',s:'Confirmados'},{l:'Via Pix',v:moeda(pix),c:'#2E7D7A',s:'Pix antecipado'},{l:'Pendente',v:moeda(previsto-recebido),c:'#FFC107',s:'A receber'}].map(x=>(
              <div key={x.l} style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:'13px', color:'#9A8880' }}>{x.l}</div><div style={{ fontSize:'11px', color:'#555', marginTop:'2px' }}>{x.s}</div></div>
                <div style={{ fontSize:'20px', fontWeight:'700', color:x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        )}
        {aba==='promo'&&<AbaPromocaoRecepcao />}
        {aba==='servicos'&&<AbaServicos />} {/* ✅ FINAL */}
      </div>

      {/* ✅ FINAL: Modal confirmar exclusão */}
      {confirmExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'#1A0F0D', borderRadius:'20px', padding:'28px 24px', width:'100%', maxWidth:'340px', textAlign:'center', border:'1px solid #3A2018' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🗑️</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', color:'#F5EFE6', marginBottom:'8px' }}>Remover da fila?</div>
            <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'700', marginBottom:'6px' }}>{confirmExcluir.clienteNome} · {confirmExcluir.hora}</div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'20px' }}>O agendamento será ocultado da fila mas mantido no histórico da barbearia.</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setConfirmExcluir(null)} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', cursor:'pointer', fontWeight:'600' }}>Cancelar</button>
              <button onClick={() => handleExcluir(confirmExcluir)} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontWeight:'700', cursor:'pointer' }}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {modalPag&&<ModalPagamento agendamento={modalPag} onConfirmar={()=>{setModalPag(null);setToast({msg:'💰 Pagamento confirmado!',tipo:'ok'});}} onFechar={()=>setModalPag(null)} />}
      {modalNovo&&<ModalNovoAgendamento onSalvar={()=>{setModalNovo(false);setClientePrn(null);setAba('fila');setToast({msg:'✅ Agendamento criado!',tipo:'ok'});}} onFechar={()=>{setModalNovo(false);setClientePrn(null);}} clientePreencher={clientePrn} />}
      {modalEncaixe&&<ModalEncaixeRapido onSalvar={()=>{setModalEncaixe(false);setAba('fila');setToast({msg:'⚡ Encaixe criado!',tipo:'ok'});}} onFechar={()=>setModalEncaixe(false)} />}
      {modalLemb&&<LembretesRecepcao onFechar={()=>setModalLemb(false)} dark={dark} />}
      {toast&&<Toast mensagem={toast.msg} tipo={toast.tipo} onClose={()=>setToast(null)} />}
    </div>
  );
}
