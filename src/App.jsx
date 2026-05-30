// App.jsx — Flyguer BarberShop
// ✅ Passo 14 — PerfilCliente + AvaliacaoServico

import React from 'react';
import { db } from './firebase';
import { getStyles, PERFIL, APP_CONFIG, COLORS } from './getStyles';
import LoginFlow from './Login';
import ConfigBarbearia from './ConfigBarbearia';
import GestaoEquipe from './GestaoEquipe';
import Agendamento from './Agendamento';
import MinhasReservas from './MinhasReservas';
import AgendaBarbeiro from './AgendaBarbeiro';
import AgendaGeral from './AgendaGeral';
import Financeiro from './Financeiro';
import PainelRecepcao from './PainelRecepcao';
import PlanosMensais from './PlanosMensais';
import AssinaturaPlano from './AssinaturaPlano';
import GerenciarAssinaturas from './GerenciarAssinaturas';
import PerfilCliente from './PerfilCliente';   // ✅ P14
import Comparativo from './Comparativo';       // ✅ P14
import InstalarApp from './InstalarApp';       // ✅ PWA
import { GlobalErrorBoundary, BannerOffline } from './OfflineGuard'; // ✅ Escudo

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', background:'#1A0F0D', color:'#F5EFE6', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', textAlign:'center' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>⚠️</div>
          <div style={{ fontSize:'20px', fontWeight:'700', color:'#C9A84C', marginBottom:'8px' }}>Algo deu errado</div>
          <div style={{ fontSize:'13px', color:'#9A8880', marginBottom:'8px' }}>Módulo: {this.props.modulo || 'App'}</div>
          <div style={{ fontSize:'12px', color:'#666', marginBottom:'24px', maxWidth:'300px' }}>{this.state.error?.message}</div>
          <button onClick={() => this.setState({ hasError:false, error:null })} style={{ padding:'12px 24px', background:'#8B3A2A', color:'#F5EFE6', border:'none', borderRadius:'10px', fontWeight:'700', cursor:'pointer', marginBottom:'10px', width:'200px' }}>Tentar novamente</button>
          <button onClick={() => window.location.reload()} style={{ padding:'12px 24px', background:'#2E1A14', color:'#F5EFE6', border:'1px solid #3A2018', borderRadius:'10px', cursor:'pointer', width:'200px' }}>Recarregar app</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LogoMark({ size = 48 }) {
  return <img src="/logo-flyguer.png" alt="Flyguer BarberShop" style={{ width:size*1.8, height:size*1.8, objectFit:'contain', filter:'drop-shadow(0 6px 24px rgba(0,0,0,0.7))', flexShrink:0, display:'block' }} />;
}

function WarnBanner({ children }) {
  return (
    <div style={{ background:'rgba(255,193,7,0.1)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'10px', padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'12px', color:'#FFC107', marginBottom:'12px' }}>
      <span>⚠️</span><span>{children}</span>
    </div>
  );
}

function Divider({ style }) {
  return <div style={{ height:'1px', background:'#3A2018', margin:'16px 0', ...style }} />;
}

function SplashScreen({ onClienteNovo, onClienteCadastrado, onStaff, dark }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros] = React.useState([
    { id:'b1', nome:'Amaral', cargo:'👑 Gerente · Barbeiro', disponivel:true  },
    { id:'b2', nome:'Jotace', cargo:'✂️ Barbeiro',            disponivel:true  },
    { id:'b3', nome:'Júnior', cargo:'✂️ Barbeiro',            disponivel:false },
  ]);

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, onSnapshot, query, where }) => {
      const q = query(collection(db,'barbeiros'), where('ativo','==',true));
      const unsub = onSnapshot(q, snap => {
        if (!snap.empty) setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao'));
      });
      return () => unsub();
    }).catch(console.error);
  }, []);

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>
      <div style={{ background:`linear-gradient(160deg,#5C2218 0%,#8B3A2A 50%,#A84832 100%)`, padding:'40px 24px 32px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'120px', height:'120px', background:'rgba(46,125,122,0.15)', borderRadius:'50%', filter:'blur(20px)' }} />
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'16px' }}><LogoMark size={80} /></div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'26px', fontWeight:'900', color:'#F5EFE6', letterSpacing:'1px' }}>
          Flyguer <span style={{ fontWeight:'300', color:'#E8C96A' }}>BarberShop</span>
        </div>
        <div style={{ fontSize:'13px', color:'rgba(245,239,230,0.7)', marginTop:'6px', fontStyle:'italic' }}>Nossa Arte, Seu Estilo.</div>
        <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.5)', marginTop:'4px' }}>Shopping Cidade das Artes — Piso 2, Nº 22</div>
      </div>
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Nossos barbeiros</div>
        {barbeiros.map(b => (
          <div key={b.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:'#231410', borderRadius:'14px', border:'1px solid #3A2018', marginBottom:'8px' }}>
            <div style={{ ...s.avatar, width:'48px', height:'48px', fontSize:'18px', flexShrink:0 }}>{b.nome[0]}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'600', fontSize:'15px', color:'#F5EFE6' }}>{b.nome}</div>
              <div style={{ fontSize:'11px', color:'#E8C96A', marginTop:'2px' }}>{b.cargo}</div>
            </div>
            <div style={b.disponivel?s.badgeGreen:s.badgeYellow}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:b.disponivel?'#4CAF50':'#FFC107', display:'inline-block' }} />
              {b.disponivel?'Disponível':'Ocupado agora'}
            </div>
          </div>
        ))}
        <Divider />
        <p style={{ fontSize:'13px', color:'#9A8880', textAlign:'center', marginBottom:'20px' }}>Estamos prontos para cuidar do seu estilo.</p>
        <button style={{ ...s.btnGold, marginBottom:'10px' }} onClick={onClienteNovo}>👤 Criar Conta de Cliente</button>
        <button style={{ ...s.btnDark, marginBottom:'16px' }} onClick={onClienteCadastrado}>🔒 Acessar Cadastro Existente</button>
        <WarnBanner>Use um número de WhatsApp válido para receber confirmações.</WarnBanner>
        <div onClick={onStaff} style={{ textAlign:'center', fontSize:'11px', color:'#444', cursor:'pointer', paddingBottom:'8px' }}>Acesso da equipe</div>
      </div>
    </div>
    </GlobalErrorBoundary>
  );
}

function StaffLoginScreen({ onBack, onSuccess, dark }) {
  const s = getStyles(dark);
  const [pin, setPin] = React.useState('');
  const [erro, setErro] = React.useState('');
  const [usuariosMatch, setUsuariosMatch] = React.useState([]);

  const USUARIOS_DEV = [
    { pin:'12345', perfil:PERFIL.GERENTE,      nome:'Amaral',   id:'b1' },
    { pin:'12345', perfil:PERFIL.BARBEIRO,      nome:'Jotace',   id:'b2' },
    { pin:'12345', perfil:PERFIL.BARBEIRO,      nome:'Júnior',   id:'b3' },
    { pin:'REC1',  perfil:PERFIL.RECEPCIONISTA, nome:'Recepção', id:'r1' },
  ];

  function handleLogin() {
    const p = pin.trim();
    if (p.toUpperCase()==='REC1') { onSuccess({ pin:'REC1', perfil:PERFIL.RECEPCIONISTA, nome:'Recepção', id:'r1' }); return; }
    const matches = USUARIOS_DEV.filter(u => u.pin===p && u.perfil!==PERFIL.RECEPCIONISTA);
    if (matches.length===0) { setErro('PIN inválido.'); setPin(''); return; }
    setErro('');
    if (matches.length===1) onSuccess(matches[0]);
    else setUsuariosMatch(matches);
  }

  if (usuariosMatch.length > 1) {
    return (
      <div style={{ ...s.app, padding:'40px 20px 24px' }}>
        <button onClick={() => { setUsuariosMatch([]); setPin(''); }} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>← Voltar</button>
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>Quem é você?</div>
        </div>
        {usuariosMatch.map(u => (
          <button key={u.id} onClick={() => onSuccess(u)} style={{ ...s.btnGold, marginBottom:'10px', background:u.perfil===PERFIL.GERENTE?'linear-gradient(135deg,#5C2218,#8B3A2A)':'linear-gradient(135deg,#2E7D7A,#3A9E9A)' }}>
            {u.perfil===PERFIL.GERENTE?'👑':'✂️'} {u.nome}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...s.app, padding:'40px 20px 24px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>← Voltar</button>
      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <div style={{ display:'flex', justifyContent:'center' }}><LogoMark size={60} /></div>
        <div style={{ marginTop:'12px', fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A' }}>Acesso da equipe</div>
      </div>
      <div style={{ marginBottom:'14px' }}>
        <label style={s.label}>PIN de acesso</label>
        <input style={s.input} type="password" placeholder="Digite seu PIN" value={pin}
          onChange={e => { setPin(e.target.value); setErro(''); }}
          onKeyDown={e => e.key==='Enter'&&handleLogin()} autoFocus />
      </div>
      {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>}
      <button style={s.btnGold} onClick={handleLogin}>Entrar →</button>
      <Divider />
      <WarnBanner>PINs são definidos pelo gerente nas configurações do app.</WarnBanner>
    </div>
    </GlobalErrorBoundary>
  );
}

function EmBreve({ titulo, descricao, passo, onBack, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, padding:'24px 20px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>← Voltar</button>
      <div style={{ textAlign:'center', paddingTop:'60px' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔨</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A', marginBottom:'8px' }}>{titulo}</div>
        <div style={{ fontSize:'13px', color:'#9A8880', marginBottom:'16px', maxWidth:'280px', margin:'0 auto 16px' }}>{descricao}</div>
        <div style={{ ...s.badgeGold, justifyContent:'center', fontSize:'13px', padding:'8px 16px' }}>🔨 Passo {passo} — Em desenvolvimento</div>
      </div>
    </div>
    </GlobalErrorBoundary>
  );
}

// ── HOME CLIENTE ──────────────────────────────────────────────
function HomeCliente({ cliente, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  const [lembrete, setLembrete] = React.useState(null);

  // ✅ P14 — Verificar agendamento nas próximas 2h
  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const chave = cliente.cpf;
    const hojeStr = new Date().toISOString().split('T')[0];
    (async () => {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(query(
        collection(db, 'agendamentos'),
        where('clienteCpf', '==', chave),
        where('data', '==', hojeStr),
        where('status', '==', 'confirmado'),
      ));
      const agora = new Date();
      const proximo = snap.docs.map(d => d.data())
        .filter(a => {
          const [h, m] = a.hora.split(':').map(Number);
          const alvo = new Date(); alvo.setHours(h, m, 0, 0);
          const diff = (alvo - agora) / 1000 / 60;
          return diff > 0 && diff <= 120;
        })
        .sort((a, b) => a.hora.localeCompare(b.hora))[0];
      if (proximo) setLembrete(proximo);
    })();
  }, [cliente?.cpf]);

  function abrirWhatsAppLembrete(ag) {
    const msg = encodeURIComponent(
      `Olá! Estou confirmando minha presença no agendamento de hoje:%0A%0A` +
      `✂️ Barbeiro: ${ag.barbeiroNome}%0A` +
      `💈 Serviço: ${ag.servico}%0A` +
      `🕐 Horário: ${ag.hora}%0A` +
      `💰 Valor: R$ ${(ag.valor||0).toFixed(2).replace('.',',')}%0A%0A` +
      `Até logo! 👋`
    );
    window.open(`https://wa.me/5511939089988?text=${msg}`, '_blank');
  }

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>
      <div style={{ ...s.header }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {/* ✅ Avatar clicável → Perfil */}
          <div onClick={() => onNavegar('perfil_cliente')}
            style={{ ...s.avatar, width:'40px', height:'40px', fontSize:'16px', overflow:'hidden', cursor:'pointer', border:'2px solid #C9A84C' }}>
            {cliente.foto ? <img src={cliente.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : cliente.nome[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#F5EFE6' }}>Olá, {cliente.nome.split(' ')[0]}! 👋</div>
            <div style={{ fontSize:'11px', color:'#9A8880' }}>Flyguer BarberShop</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:'#2E1A14', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', color:'#9A8880', cursor:'pointer' }}>Sair</button>
      </div>
      <div style={{ padding:'20px' }}>

        {/* ✅ P14 — Banner lembrete de agendamento */}
        {lembrete && (
          <div style={{ background:'linear-gradient(135deg,#A07830,#C9A84C)', borderRadius:'14px', padding:'14px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontSize:'28px' }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'700', fontSize:'13px', color:'#1A0F0D' }}>Seu agendamento é hoje às {lembrete.hora}!</div>
              <div style={{ fontSize:'11px', color:'rgba(26,15,13,0.7)', marginTop:'2px' }}>✂️ {lembrete.barbeiroNome} · {lembrete.servico}</div>
            </div>
            <button onClick={() => abrirWhatsAppLembrete(lembrete)}
              style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'10px', padding:'8px 10px', color:'#1A0F0D', fontSize:'11px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' }}>
              📲 Confirmar
            </button>
          </div>
        )}

        <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', borderRadius:'18px', padding:'20px', marginBottom:'20px' }}>
          <div style={{ fontSize:'12px', color:'rgba(245,239,230,0.6)', marginBottom:'4px', fontWeight:'600' }}>BEM-VINDO DE VOLTA!</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#F5EFE6', fontWeight:'700' }}>{cliente.nome.split(' ')[0]}</div>
          <div style={{ fontSize:'12px', color:'rgba(245,239,230,0.6)', marginTop:'4px' }}>Cadastro ativo ✅</div>
        </div>
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>O que deseja fazer?</div>
        {[
          { icon:'📅', label:'Fazer Agendamento', sub:'Escolha barbeiro, dia e horário', acao:()=>onNavegar('agendamento')       },
          { icon:'📋', label:'Minhas Reservas',   sub:'Ver, cancelar ou reagendar',      acao:()=>onNavegar('minhas_reservas')   },
          { icon:'💳', label:'Planos Mensais',    sub:'Assine e economize nos cortes',   acao:()=>onNavegar('assinatura_plano') },
          { icon:'👤', label:'Meu Perfil',        sub:'Dados, histórico e avaliações',   acao:()=>onNavegar('perfil_cliente')   }, // ✅ P14
        ].map(item => (
          <div key={item.label} onClick={item.acao||undefined} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px', background:s.cardBg, borderRadius:'14px', border:`1px solid ${s.border}`, marginBottom:'10px', cursor:item.acao?'pointer':'default' }}>
            <div style={{ fontSize:'24px' }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'600', fontSize:'14px' }}>{item.label}</div>
              <div style={{ fontSize:'11px', color:s.textSub }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </GlobalErrorBoundary>
  );
}

// ── HOME GERENTE ──────────────────────────────────────────────
function HomeGerente({ usuario, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  const acoes = [
    { id:'config',         icon:'⚙️',  label:'Configurações',    sub:'Horários, Pix, dados',    passo:4  },
    { id:'servicos',       icon:'💈',  label:'Serviços & Preços', sub:'Tabela de serviços',      passo:4  },
    { id:'equipe',         icon:'👥',  label:'Equipe',            sub:'Barbeiros e recepção',    passo:5  },
    { id:'agenda',         icon:'📅',  label:'Agenda Geral',      sub:'Todos os barbeiros',      passo:8  },
    { id:'financeiro',     icon:'💰',  label:'Financeiro',        sub:'Receitas e relatórios',   passo:9  },
    { id:'comparativo',    icon:'📊',  label:'Comparativo',       sub:'Ranking de barbeiros',    passo:9  },
    { id:'permissoes',     icon:'🔑',  label:'Permissões',        sub:'Acesso da recepção',      passo:10 },
    { id:'planos_mensais', icon:'💳',  label:'Planos Mensais',    sub:'Criar e gerir planos',    passo:12 },
  ];
  return (
    <div style={{ ...s.app, paddingBottom:'24px' }}>
      <div style={{ ...s.headerGold, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.7)', fontWeight:'600' }}>👑 ADMINISTRAÇÃO</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:'900', color:'#F5EFE6' }}>Flyguer BarberShop</div>
        </div>
        <button onClick={onLogout} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', color:'#F5EFE6', cursor:'pointer', fontWeight:'600' }}>Sair</button>
      </div>
      <div style={{ padding:'20px' }}>
        <div style={{ ...s.card, background:'linear-gradient(135deg,#1A0F0D,#231410)', borderColor:'#8B3A2A', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ ...s.avatar, width:'52px', height:'52px', fontSize:'22px', border:'2px solid #E8C96A' }}>{usuario.nome[0]}</div>
            <div>
              <div style={{ fontWeight:'700', fontSize:'16px' }}>Olá, {usuario.nome}! 👑</div>
              <div style={{ fontSize:'12px', color:'#E8C96A', marginTop:'2px' }}>Gerente — Acesso total</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>Módulos</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          {acoes.map(a => (
            <div key={a.id} onClick={() => onNavegar(a.id)} style={{ background:'#231410', borderRadius:'14px', padding:'16px 14px', border:'1px solid #3A2018', cursor:'pointer' }}>
              <div style={{ fontSize:'24px', marginBottom:'8px' }}>{a.icon}</div>
              <div style={{ fontWeight:'600', fontSize:'13px', marginBottom:'2px', color:'#F5EFE6' }}>{a.label}</div>
              <div style={{ fontSize:'11px', color:'#9A8880' }}>{a.sub}</div>
              <div style={{ marginTop:'8px', fontSize:'10px', color:'#444' }}>Passo {a.passo}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </GlobalErrorBoundary>
  );
}

// ── HOME BARBEIRO ──────────────────────────────────────────────
function HomeBarbeiro({ usuario, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, paddingBottom:'24px' }}>
      <div style={{ ...s.header }}>
        <div>
          <div style={{ ...s.headerTitle }}>✂️ Minha Agenda</div>
          <div style={{ ...s.headerSubtitle }}>{usuario.nome}</div>
        </div>
        <button onClick={onLogout} style={{ background:'#2E1A14', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', color:'#9A8880', cursor:'pointer' }}>Sair</button>
      </div>
      <div style={{ padding:'20px' }}>
        <button style={{ ...s.btnGold }} onClick={() => onNavegar('agenda_barbeiro')}>📅 Minha Agenda</button>
        <button style={{ ...s.btnDark, marginTop:'10px' }} onClick={() => onNavegar('equipe')}>👤 Meu Perfil & Disponibilidade</button>
      </div>
    </div>
    </GlobalErrorBoundary>
  );
}

// ── APP PRINCIPAL ──────────────────────────────────────────────
export default function App() {
  React.useEffect(() => {
    // Remove splash screen quando app montar
    if (window.__removeSpash) window.__removeSpash();
  }, []);

  const [dark, setDark]       = React.useState(true);
  const [tela, setTela]       = React.useState('splash');
  const [usuario, setUsuario] = React.useState(null);
  const [cliente, setCliente] = React.useState(null);
  const [emBreveInfo, setEmBreveInfo] = React.useState(null);
  const [configAbaInicial, setConfigAbaInicial] = React.useState('horarios');

  function handleLoginClienteSucesso(clienteLogado) { setCliente(clienteLogado); setTela('home_cliente'); }

  function handleStaffLogin(usuarioLogado) {
    setUsuario(usuarioLogado);
    if (usuarioLogado.perfil===PERFIL.GERENTE)           setTela('home_gerente');
    else if (usuarioLogado.perfil===PERFIL.BARBEIRO)     setTela('home_barbeiro');
    else if (usuarioLogado.perfil===PERFIL.RECEPCIONISTA) setTela('recepcao');
  }

  function handleNavegarGerente(modulo) {
    if (modulo==='config')         { setConfigAbaInicial('horarios'); setTela('config_barbearia'); return; }
    if (modulo==='servicos')       { setConfigAbaInicial('servicos'); setTela('config_barbearia'); return; }
    if (modulo==='equipe')         { setTela('gestao_equipe');   return; }
    if (modulo==='financeiro')   { setTela('financeiro');   return; }
    if (modulo==='comparativo') { setTela('comparativo');  return; } // ✅ P14
    if (modulo==='agenda')         { setTela('agenda_geral');    return; }
    if (modulo==='permissoes')     { setTela('recepcao');        return; }
    if (modulo==='planos_mensais') { setTela('planos_mensais');  return; }
    setEmBreveInfo({ titulo:modulo, descricao:'Módulo em desenvolvimento.', passo:'?' });
    setTela('em_breve');
  }

  function handleLogout() { setUsuario(null); setTela('splash'); }

  function voltar() {
    if (usuario) {
      if (usuario.perfil===PERFIL.GERENTE)       setTela('home_gerente');
      else if (usuario.perfil===PERFIL.BARBEIRO) setTela('home_barbeiro');
      else setTela('staff_login');
    } else { setTela('splash'); }
  }

  const toggleTema = (
    <button onClick={() => setDark(d=>!d)} style={{ position:'fixed', top:'12px', right:'12px', zIndex:'100', background:'rgba(0,0,0,0.4)', border:'1px solid #3A2018', borderRadius:'50%', width:'32px', height:'32px', fontSize:'14px', cursor:'pointer', color:'#fff', backdropFilter:'blur(4px)' }} title={dark?'Modo claro':'Modo escuro'}>
      {dark?'☀️':'🌙'}
    </button>
  );

  return (
    <GlobalErrorBoundary>
      <BannerOffline />
      <InstalarApp dark={dark} />
      <div style={{ maxWidth:'430px', margin:'0 auto', minHeight:'100vh', position:'relative' }}>
      {toggleTema}
      <ErrorBoundary modulo="App">

        {tela==='splash' && <SplashScreen onClienteNovo={()=>setTela('login_cliente')} onClienteCadastrado={()=>setTela('login_cliente')} onStaff={()=>setTela('staff_login')} dark={dark} />}

        {tela==='login_cliente' && (
          <ErrorBoundary modulo="LoginCliente">
            <LoginFlow onSucesso={handleLoginClienteSucesso} onBack={()=>setTela('splash')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='home_cliente' && cliente && (
          <ErrorBoundary modulo="HomeCliente">
            <HomeCliente cliente={cliente} onLogout={()=>{setCliente(null);setTela('splash');}} onNavegar={setTela} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='staff_login' && <StaffLoginScreen onBack={()=>setTela('splash')} onSuccess={handleStaffLogin} dark={dark} />}

        {tela==='home_gerente' && usuario && (
          <ErrorBoundary modulo="HomeGerente">
            <HomeGerente usuario={usuario} onLogout={handleLogout} onNavegar={handleNavegarGerente} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='home_barbeiro' && usuario && (
          <ErrorBoundary modulo="HomeBarbeiro">
            <HomeBarbeiro usuario={usuario} onLogout={handleLogout} onNavegar={mod=>{
              if (mod==='equipe') setTela('gestao_equipe');
              if (mod==='agenda_barbeiro') setTela('agenda_barbeiro');
            }} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='minhas_reservas' && cliente && (
          <ErrorBoundary modulo="MinhasReservas">
            <MinhasReservas cliente={cliente} onBack={()=>setTela('home_cliente')} onReagendar={()=>setTela('agendamento')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='agendamento' && cliente && (
          <ErrorBoundary modulo="Agendamento">
            <Agendamento cliente={cliente} onBack={()=>setTela('home_cliente')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='recepcao' && (
          <ErrorBoundary modulo="PainelRecepcao">
            <PainelRecepcao
              onBack={()=>usuario?.perfil===PERFIL.GERENTE?setTela('home_gerente'):setTela('splash')}
              dark={dark}
              onNavegarAssinaturas={()=>setTela('gerenciar_assinaturas')}
            />
          </ErrorBoundary>
        )}

        {tela==='financeiro' && usuario && (
          <ErrorBoundary modulo="Financeiro">
            <Financeiro onBack={()=>setTela('home_gerente')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='agenda_barbeiro' && usuario && (
          <ErrorBoundary modulo="AgendaBarbeiro">
            <AgendaBarbeiro usuario={usuario} onBack={()=>setTela(usuario.perfil===PERFIL.GERENTE?'home_gerente':'home_barbeiro')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='agenda_geral' && usuario && (
          <ErrorBoundary modulo="AgendaGeral">
            <AgendaGeral usuario={usuario} onBack={()=>setTela('home_gerente')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='gestao_equipe' && usuario && (
          <ErrorBoundary modulo="GestaoEquipe">
            <GestaoEquipe usuario={usuario} onBack={()=>usuario.perfil===PERFIL.GERENTE?setTela('home_gerente'):setTela('home_barbeiro')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='config_barbearia' && usuario && (
          <ErrorBoundary modulo="ConfigBarbearia">
            <ConfigBarbearia onBack={()=>setTela('home_gerente')} dark={dark} abaInicial={configAbaInicial} />
          </ErrorBoundary>
        )}

        {tela==='planos_mensais' && usuario && (
          <ErrorBoundary modulo="PlanosMensais">
            <PlanosMensais onBack={()=>setTela('home_gerente')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='assinatura_plano' && cliente && (
          <ErrorBoundary modulo="AssinaturaPlano">
            <AssinaturaPlano cliente={cliente} onBack={()=>setTela('home_cliente')} dark={dark} />
          </ErrorBoundary>
        )}

        {tela==='gerenciar_assinaturas' && (
          <ErrorBoundary modulo="GerenciarAssinaturas">
            <GerenciarAssinaturas onBack={()=>setTela('recepcao')} dark={dark} />
          </ErrorBoundary>
        )}

        {/* ✅ P14 — Comparativo */}
        {tela==='comparativo' && usuario && (
          <ErrorBoundary modulo="Comparativo">
            <Comparativo onBack={()=>setTela('home_gerente')} dark={dark} />
          </ErrorBoundary>
        )}

        {/* ✅ P14 — Perfil do Cliente */}
        {tela==='perfil_cliente' && cliente && (
          <ErrorBoundary modulo="PerfilCliente">
            <PerfilCliente
              cliente={cliente}
              onBack={()=>setTela('home_cliente')}
              dark={dark}
              onNavegar={setTela}
            />
          </ErrorBoundary>
        )}

        {tela==='em_breve' && (
          <EmBreve titulo={emBreveInfo?.titulo} descricao={emBreveInfo?.descricao} passo={emBreveInfo?.passo} onBack={voltar} dark={dark} />
        )}

      </ErrorBoundary>
      </div>
    </GlobalErrorBoundary>
  );
}
