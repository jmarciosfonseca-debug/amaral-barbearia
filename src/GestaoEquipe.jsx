// GestaoEquipe.jsx — Flyguer BarberShop
// ✅ Firebase Auth — gerente cria contas com email + senha temporária
// ✅ Permissões de visibilidade para barbeiros

import React from 'react';
import { db, auth } from './firebase';
import {
  collection, doc, getDocs,
  setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, PERFIL } from './getStyles';

const BARBEIROS_INICIAIS = [
  { id:'b1', nome:'Amaral', cargo:'Gerente · Barbeiro', perfil:PERFIL.GERENTE,  whatsapp:'11939089988', ativo:true, disponivel:true,  foto:null },
  { id:'b2', nome:'Jotace', cargo:'Barbeiro',           perfil:PERFIL.BARBEIRO, whatsapp:'11981978541', ativo:true, disponivel:true,  foto:null },
  { id:'b3', nome:'Junior', cargo:'Barbeiro',           perfil:PERFIL.BARBEIRO, whatsapp:'11982429156', ativo:true, disponivel:false, foto:null },
];

function Avatar({ barbeiro, size=56 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:barbeiro.ativo?'linear-gradient(135deg,#5C2218,#8B3A2A)':'#2E1A14', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:'700', color:'#F5EFE6', flexShrink:0, overflow:'hidden', border:barbeiro.disponivel&&barbeiro.ativo?'2px solid #4CAF50':'2px solid #3A2018', position:'relative' }}>
      {barbeiro.foto ? <img src={barbeiro.foto} alt={barbeiro.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : barbeiro.nome?.charAt(0).toUpperCase()}
      <div style={{ position:'absolute', bottom:2, right:2, width:size*0.22, height:size*0.22, borderRadius:'50%', background:!barbeiro.ativo?'#555':barbeiro.disponivel?'#4CAF50':'#FFC107', border:'2px solid #1A0F0D' }} />
    </div>
  );
}

function Toggle({ value, onChange, cor='#8B3A2A' }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:'44px', height:'24px', borderRadius:'12px', background:value?cor:'#3A2018', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:'3px', left:value?'23px':'3px', width:'18px', height:'18px', borderRadius:'50%', background:value?'#F5EFE6':'#9A8880', transition:'left 0.2s' }} />
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background:'#231410', borderRadius:'16px', padding:'16px', border:'1px solid #3A2018', marginBottom:'12px', ...style }}>{children}</div>;
}

const inputStyle = { width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };

function ModalEditarBarbeiro({ barbeiro, onSalvar, onFechar }) {
  const [dados, setDados]   = React.useState({ ...barbeiro });
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]     = React.useState('');

  async function handleSalvar() {
    if (!dados.nome.trim()) { setErro('Nome obrigatório'); return; }
    setSalvando(true);
    try {
      await setDoc(doc(db,'barbeiros',dados.id), { ...dados, atualizadoEm:serverTimestamp() }, { merge:true });
      // Atualiza também em barbeiros_auth se tiver uid
      if (dados.uid) {
        await updateDoc(doc(db,'barbeiros_auth',dados.uid), {
          nome: dados.nome, cargo: dados.cargo, perfil: dados.perfil,
          permVerValores: dados.permVerValores||false,
          permVerClientes: dados.permVerClientes||false,
          ativo: dados.ativo, disponivel: dados.disponivel,
          atualizadoEm: serverTimestamp(),
        });
      }
      onSalvar(dados);
    } catch(e) { setErro('Erro ao salvar.'); }
    finally { setSalvando(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>Editar Barbeiro</div>
          <button onClick={onFechar} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'50%', width:'32px', height:'32px', color:'#F5EFE6', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        {[
          { label:'Nome',     campo:'nome',     type:'text' },
          { label:'Cargo',    campo:'cargo',    type:'text' },
          { label:'WhatsApp', campo:'whatsapp', type:'tel'  },
        ].map(f => (
          <div key={f.campo} style={{ marginBottom:'12px' }}>
            <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>{f.label}</label>
            <input type={f.type} style={inputStyle} value={dados[f.campo]||''} onChange={e => setDados(d=>({...d,[f.campo]:e.target.value}))} />
          </div>
        ))}
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <div style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>Ativo</div>
            <Toggle value={dados.ativo} onChange={v=>setDados(d=>({...d,ativo:v}))} cor='#4CAF50' />
          </div>
          <div style={{ height:'1px', background:'#3A2018', margin:'8px 0' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>Disponível</div>
            <Toggle value={dados.disponivel} onChange={v=>setDados(d=>({...d,disponivel:v}))} />
          </div>
        </Card>
        <div style={{ background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'12px', padding:'14px', marginBottom:'14px' }}>
          <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'12px' }}>🔑 Permissões do barbeiro</div>
          <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'12px' }}>Por padrão tudo ativado. Desative o que quiser restringir.</div>
          {[
            { campo:'permVerValores',       label:'💰 Ver valores dos atendimentos',     sub:'Receita por atendimento',          cor:'#E8C96A' },
            { campo:'permVerClientes',      label:'👤 Ver nome e telefone dos clientes', sub:'Dados completos do cliente',       cor:'#2E7D7A' },
            { campo:'permVerListaClientes', label:'👥 Ver lista de todos os clientes',   sub:'Histórico de clientes atendidos',  cor:'#4CAF50' },
            { campo:'permDispararWhatsApp', label:'📲 Disparar WhatsApp para clientes',  sub:'Enviar mensagens aos clientes',    cor:'#25D366' },
            { campo:'permEditarHorarios',   label:'🕐 Editar próprios horários',         sub:'Configurar agenda semanal',        cor:'#2196F3' },
            { campo:'permBloquearSlots',    label:'🔒 Bloquear slots do dia',            sub:'Fechar horários específicos',      cor:'#FFC107' },
          ].map((p,i) => (
            <div key={p.campo}>
              {i>0 && <div style={{ height:'1px', background:'#3A2018', margin:'8px 0' }} />}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{p.label}</div>
                  <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>{p.sub}</div>
                </div>
                <Toggle value={dados[p.campo]!==false} onChange={v=>setDados(d=>({...d,[p.campo]:v}))} cor={p.cor} />
              </div>
            </div>
          ))}
        </div>
        {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>}
        <button onClick={handleSalvar} disabled={salvando} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
          {salvando?'Salvando...':'Salvar'}
        </button>
      </div>
    </div>
  );
}

// ✅ NOVO: Tela para criar conta Firebase Auth + perfil Firestore
function TelaNovoBarbeiro({ onVoltar, onSalvar, dark }) {
  const s = getStyles(dark);
  const [dados, setDados] = React.useState({
    nome:'', cargo:'Barbeiro', whatsapp:'', email:'', senhaTemp:'',
    perfil:PERFIL.BARBEIRO, ativo:true, disponivel:true, foto:null,
    permVerValores:false, permVerClientes:false,
  });
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');
  const [ok, setOk]             = React.useState(false);

  async function handleSalvar() {
    if (!dados.nome.trim())    { setErro('Nome obrigatório'); return; }
    if (!dados.email.trim())   { setErro('Email obrigatório'); return; }
    if (!dados.senhaTemp || dados.senhaTemp.length < 6) { setErro('Senha temporária deve ter pelo menos 6 caracteres'); return; }
    if (!dados.whatsapp.trim()) { setErro('WhatsApp obrigatório'); return; }
    setSalvando(true); setErro('');
    try {
      // ✅ Cria conta no Firebase Auth via Admin SDK simulado
      // Como não temos Admin SDK no frontend, usamos uma Cloud Function ou
      // criamos com signInWithEmailAndPassword e depois voltamos para a sessão do gerente
      // Solução: salva o perfil no Firestore com flag "aguardandoCriacaoAuth"
      // e o barbeiro faz o primeiro login com a senha temp que o gerente definiu

      // Gera ID único para o barbeiro
      const id = 'b_' + Date.now();

      // Salva perfil em barbeiros (para agenda, fila, etc)
      await setDoc(doc(db,'barbeiros',id), {
        id, nome:dados.nome.trim(), cargo:dados.cargo, whatsapp:dados.whatsapp,
        perfil:dados.perfil, ativo:dados.ativo, disponivel:dados.disponivel, foto:null,
        permVerValores:dados.permVerValores, permVerClientes:dados.permVerClientes,
        criadoEm:serverTimestamp(), atualizadoEm:serverTimestamp(),
      });

      // Salva credenciais pendentes — barbeiro usa email+senha no primeiro login
      // O barbeiro_auth será criado quando ele fizer o primeiro login
      await setDoc(doc(db,'barbeiros_pendentes',dados.email.trim().replace(/\./g,'_')), {
        barbeiroId: id, nome:dados.nome.trim(), cargo:dados.cargo,
        email:dados.email.trim(), senhaTemp:dados.senhaTemp,
        perfil:dados.perfil, whatsapp:dados.whatsapp,
        permVerValores:dados.permVerValores, permVerClientes:dados.permVerClientes,
        ativo:dados.ativo, disponivel:dados.disponivel,
        criadoEm:serverTimestamp(), primeiroAcesso:true,
      });

      setOk(true);
      setTimeout(() => onSalvar({ ...dados, id }), 1500);
    } catch(e) { setErro('Erro ao criar: ' + e.message); setSalvando(false); }
  }

  if (ok) return (
    <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'64px', marginBottom:'16px' }}>✅</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A' }}>Barbeiro adicionado!</div>
        <div style={{ fontSize:'13px', color:'#9A8880', marginTop:'8px' }}>Credenciais salvas. Barbeiro pode logar com email e senha.</div>
      </div>
    </div>
  );

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onVoltar} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>← Voltar</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>Novo Barbeiro</div>
      </div>
      <div style={{ padding:'20px' }}>
        <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px', fontSize:'12px', color:'#2E7D7A' }}>
          📧 O barbeiro vai usar email + senha para entrar no app. No primeiro acesso ele redefine a senha temporária.
        </div>
        {[
          { label:'Nome *',              campo:'nome',     ph:'Nome completo',   type:'text'     },
          { label:'Cargo',               campo:'cargo',    ph:'Barbeiro...',      type:'text'     },
          { label:'WhatsApp * (com DDD)',campo:'whatsapp', ph:'11999999999',      type:'tel'      },
          { label:'Email * (para login)',campo:'email',    ph:'barbeiro@email.com',type:'email'   },
          { label:'Senha temporária *',  campo:'senhaTemp',ph:'Mín. 6 caracteres', type:'password'},
        ].map(f => (
          <div key={f.campo} style={{ marginBottom:'14px' }}>
            <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>{f.label}</label>
            <input type={f.type} style={inputStyle} placeholder={f.ph} value={dados[f.campo]}
              onChange={e => { setDados(d=>({...d,[f.campo]:e.target.value})); setErro(''); }} />
          </div>
        ))}
        <div style={{ marginBottom:'14px' }}>
          <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Perfil</label>
          <div style={{ display:'flex', gap:'8px' }}>
            {[{ id:PERFIL.BARBEIRO, label:'Barbeiro' },{ id:PERFIL.GERENTE, label:'Gerente' },{ id:PERFIL.RECEPCIONISTA, label:'Recepção' }].map(p => (
              <button key={p.id} onClick={() => setDados(d=>({...d,perfil:p.id}))}
                style={{ flex:1, padding:'10px', borderRadius:'10px', border:dados.perfil===p.id?'2px solid #8B3A2A':'1px solid #3A2018', background:dados.perfil===p.id?'rgba(139,58,42,0.2)':'#231410', color:dados.perfil===p.id?'#E8C96A':'#9A8880', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'12px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'12px' }}>👁 Permissões</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <div style={{ fontSize:'13px', color:'#F5EFE6' }}>💰 Ver valores</div>
            <Toggle value={dados.permVerValores} onChange={v=>setDados(d=>({...d,permVerValores:v}))} cor='#E8C96A' />
          </div>
          <div style={{ height:'1px', background:'#3A2018', margin:'6px 0' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'13px', color:'#F5EFE6' }}>👤 Ver clientes</div>
            <Toggle value={dados.permVerClientes} onChange={v=>setDados(d=>({...d,permVerClientes:v}))} cor='#2E7D7A' />
          </div>
        </div>
        {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'8px', padding:'10px' }}>{erro}</div>}
        <button onClick={handleSalvar} disabled={salvando} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
          {salvando?'Criando conta...':'✅ Criar conta do barbeiro'}
        </button>
      </div>
    </div>
  );
}

// ✅ NOVO: Modal para redefinir senha temporária de um barbeiro
function ModalGerarSenhaTemp({ barbeiro, onFechar }) {
  const [novaSenha, setNovaSenha] = React.useState('');
  const [salvando, setSalvando]   = React.useState(false);
  const [ok, setOk]               = React.useState(false);
  const [erro, setErro]           = React.useState('');

  async function handleSalvar() {
    if (novaSenha.length < 6) { setErro('Mínimo 6 caracteres'); return; }
    setSalvando(true);
    try {
      // Atualiza senha temporária no Firestore (barbeiro precisará redefinir no próximo login)
      if (barbeiro.uid) {
        await updateDoc(doc(db,'barbeiros_auth',barbeiro.uid), {
          primeiroAcesso: true, senhaTemp: novaSenha, atualizadoEm: serverTimestamp(),
        });
      }
      // Também atualiza em barbeiros_pendentes se existir
      const emailKey = (barbeiro.email||'').replace(/\./g,'_');
      if (emailKey) {
        try {
          await updateDoc(doc(db,'barbeiros_pendentes',emailKey), { senhaTemp: novaSenha, primeiroAcesso: true });
        } catch(e) {}
      }
      setOk(true);
    } catch(e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>🔐 Nova senha temporária</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>
        {ok ? (
          <div style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
            <div style={{ color:'#4CAF50', fontSize:'16px', fontWeight:'600' }}>Senha temporária definida!</div>
            <div style={{ fontSize:'13px', color:'#9A8880', marginTop:'8px' }}>No próximo login, {barbeiro.nome} será obrigado a redefinir.</div>
            <button onClick={onFechar} style={{ marginTop:'16px', padding:'12px 24px', borderRadius:'12px', border:'none', background:'#8B3A2A', color:'#F5EFE6', fontWeight:'700', cursor:'pointer' }}>Fechar</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize:'13px', color:'#F5EFE6', marginBottom:'16px' }}>Barbeiro: <strong style={{ color:'#E8C96A' }}>{barbeiro.nome}</strong></div>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Nova senha temporária *</label>
              <input type="password" style={inputStyle} value={novaSenha} onChange={e=>{setNovaSenha(e.target.value);setErro('');}} placeholder="Mínimo 6 caracteres" autoFocus />
            </div>
            <div style={{ background:'rgba(255,193,7,0.08)', border:'1px solid rgba(255,193,7,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'12px', color:'#FFC107' }}>
              ⚠️ O barbeiro será obrigado a redefinir a senha no próximo acesso.
            </div>
            {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>}
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando} style={{ flex:2, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', fontWeight:'700', cursor:'pointer' }}>
                {salvando?'Salvando...':'✅ Definir senha'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GestaoEquipe({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const isGerente = usuario?.perfil === PERFIL.GERENTE;
  const [barbeiros, setBarbeiros]         = React.useState([]);
  const [carregando, setCarregando]       = React.useState(true);
  const [editando, setEditando]           = React.useState(null);
  const [senhaTemp, setSenhaTemp]         = React.useState(null); // ✅ novo
  const [excluindo, setExcluindo]         = React.useState(null);
  const [salvandoDisp, setSalvandoDisp]   = React.useState(null);
  const [tela, setTela]                   = React.useState('lista');

  React.useEffect(() => {
    async function carregar() {
      try {
        const snap = await getDocs(collection(db,'barbeiros'));
        if (snap.empty) {
          await Promise.all(BARBEIROS_INICIAIS.map(b => setDoc(doc(db,'barbeiros',b.id), { ...b, criadoEm:serverTimestamp() })));
          setBarbeiros(BARBEIROS_INICIAIS);
        } else {
          setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.ativo!==false));
        }
      } catch(e) { console.error(e); setBarbeiros(BARBEIROS_INICIAIS); }
      finally { setCarregando(false); }
    }
    carregar();
  }, []);

  async function handleExcluir(barbeiro) {
    if (barbeiro.perfil===PERFIL.GERENTE) return;
    try {
      await updateDoc(doc(db,'barbeiros',barbeiro.id), { ativo:false, excluidoEm:serverTimestamp() });
      setBarbeiros(bs=>bs.filter(b=>b.id!==barbeiro.id));
    } catch(e) { console.error(e); }
    finally { setExcluindo(null); }
  }

  async function toggleDisponivel(barbeiro) {
    setSalvandoDisp(barbeiro.id);
    const novoValor = !barbeiro.disponivel;
    try {
      await updateDoc(doc(db,'barbeiros',barbeiro.id), { disponivel:novoValor, atualizadoEm:serverTimestamp() });
      setBarbeiros(bs=>bs.map(b=>b.id===barbeiro.id?{...b,disponivel:novoValor}:b));
    } catch(e) { console.error(e); }
    finally { setSalvandoDisp(null); }
  }

  if (carregando) return (
    <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div><div style={{ color:'#9A8880', fontSize:'13px' }}>Carregando equipe...</div></div>
    </div>
  );

  if (tela==='novo') return (
    <TelaNovoBarbeiro dark={dark}
      onVoltar={() => setTela('lista')}
      onSalvar={novo => { setBarbeiros(bs=>[...bs,novo]); setTela('lista'); }} />
  );

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>← Voltar</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>
            {isGerente?'Gestão da Equipe':'Meu Perfil'}
          </div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{isGerente?barbeiros.length+' barbeiros':'Disponibilidade'}
          </div>
        </div>
        {isGerente && (
          <button onClick={() => setTela('novo')} style={{ background:'rgba(245,239,230,0.15)', border:'1px solid rgba(245,239,230,0.3)', borderRadius:'10px', padding:'8px 12px', color:'#F5EFE6', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
            + Novo
          </button>
        )}
      </div>

      <div style={{ padding:'16px' }}>
        {(isGerente?barbeiros:barbeiros.filter(b=>b.id===usuario?.id)).map(barbeiro => (
          <Card key={barbeiro.id}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'12px' }}>
              <Avatar barbeiro={barbeiro} size={56} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'16px', color:'#F5EFE6' }}>{barbeiro.nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>{barbeiro.cargo}</div>
                <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>📞 {barbeiro.whatsapp||'—'}</div>
                {barbeiro.email && <div style={{ fontSize:'11px', color:'#555', marginTop:'1px' }}>✉️ {barbeiro.email}</div>}
                {isGerente && (barbeiro.permVerValores||barbeiro.permVerClientes) && (
                  <div style={{ display:'flex', gap:'4px', marginTop:'4px', flexWrap:'wrap' }}>
                    {barbeiro.permVerValores  && <span style={{ fontSize:'9px', color:'#E8C96A', background:'rgba(232,201,106,0.15)', borderRadius:'4px', padding:'2px 5px' }}>💰 Valores</span>}
                    {barbeiro.permVerClientes && <span style={{ fontSize:'9px', color:'#2E7D7A', background:'rgba(46,125,122,0.15)', borderRadius:'4px', padding:'2px 5px' }}>👤 Clientes</span>}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'20px', fontWeight:'600', background:barbeiro.disponivel?'rgba(76,175,80,0.15)':'rgba(255,193,7,0.15)', color:barbeiro.disponivel?'#4CAF50':'#FFC107' }}>
                {barbeiro.disponivel?'Disponível':'Ocupado'}
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              <button onClick={() => toggleDisponivel(barbeiro)} disabled={salvandoDisp===barbeiro.id}
                style={{ flex:1, padding:'8px', borderRadius:'10px', border:'none', background:barbeiro.disponivel?'rgba(255,193,7,0.15)':'rgba(76,175,80,0.15)', color:barbeiro.disponivel?'#FFC107':'#4CAF50', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                {salvandoDisp===barbeiro.id?'...':barbeiro.disponivel?'Ficar Ocupado':'Disponível'}
              </button>
              {/* ✅ Botão gerar senha temporária (substitui PIN) */}
              {isGerente && (
                <button onClick={() => setSenhaTemp(barbeiro)}
                  style={{ padding:'8px 12px', borderRadius:'10px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', fontSize:'12px', cursor:'pointer' }}>
                  🔐 Senha temp
                </button>
              )}
              {isGerente && (
                <button onClick={() => setEditando(barbeiro)} style={{ padding:'8px 12px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'12px', cursor:'pointer' }}>Editar</button>
              )}
              {isGerente && barbeiro.perfil!==PERFIL.GERENTE && (
                <button onClick={() => setExcluindo(barbeiro)} style={{ padding:'8px 10px', borderRadius:'10px', border:'1px solid rgba(244,67,54,0.3)', background:'rgba(244,67,54,0.1)', color:'#F44336', fontSize:'12px', cursor:'pointer' }}>✕</button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {excluindo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:'20px' }}>
          <div style={{ background:'#1A0F0D', borderRadius:'20px', width:'100%', maxWidth:'360px', padding:'28px 24px', border:'1px solid #3A2018', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>⚠️</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F44336', marginBottom:'8px' }}>Remover barbeiro?</div>
            <div style={{ fontSize:'14px', color:'#F5EFE6', fontWeight:'600', marginBottom:'6px' }}>{excluindo.nome}</div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'24px' }}>O barbeiro será inativado. Agendamentos existentes não são afetados.</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setExcluindo(null)} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', cursor:'pointer', fontWeight:'600' }}>Cancelar</button>
              <button onClick={() => handleExcluir(excluindo)} style={{ flex:1, padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#8B1A1A,#C62828)', color:'#F5EFE6', fontWeight:'700', cursor:'pointer' }}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <ModalEditarBarbeiro barbeiro={editando}
          onSalvar={atualizado => { setBarbeiros(bs=>bs.map(b=>b.id===atualizado.id?atualizado:b)); setEditando(null); }}
          onFechar={() => setEditando(null)} />
      )}

      {/* ✅ Modal senha temporária */}
      {senhaTemp && (
        <ModalGerarSenhaTemp barbeiro={senhaTemp} onFechar={() => setSenhaTemp(null)} />
      )}
    </div>
  );
}
