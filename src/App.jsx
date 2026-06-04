// App.jsx — Flyguer BarberShop
import './responsive.css';
import React from 'react';
import { db, auth, messaging, VAPID_KEY } from './firebase';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
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
import PerfilCliente from './PerfilCliente';
import Comparativo from './Comparativo';
import Promocao from './Promocao';
import ListaClientes from './ListaClientes';
import InstalarApp from './InstalarApp';
import ComunicadoGerente from './ComunicadoGerente';
import MensagemWhatsAppBusiness from './MensagemWhatsAppBusiness';
import BannerPromocao from './BannerPromocao';
import { GlobalErrorBoundary, BannerOffline } from './OfflineGuard';

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

async function solicitarPushPermissao(userId) {
  if (!messaging) return;
  try {
    const { getToken } = await import('firebase/messaging');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token && userId) {
      const { doc: fd, setDoc, getDoc: gDoc } = await import('firebase/firestore');
      const snapPerfil = await gDoc(fd(db, 'barbeiros_auth', userId));
      const perfil = snapPerfil.exists() ? snapPerfil.data() : {};
      await setDoc(fd(db, 'fcm_tokens', userId), {
        token, userId, perfil: perfil.perfil||'desconhecido',
        email: perfil.email||'', nome: perfil.nome||'',
        ativo: true, plataforma: 'web',
        userAgent: navigator.userAgent?.substring(0,100)||'',
        atualizadoEm: new Date().toISOString(),
      }, { merge: true });
    }
  } catch(e) { console.log('[FCM] Erro:', e.message); }
}

function tocarBip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

function AlertaAgendamento({ agendamento, onFechar }) {
  const [pisca, setPisca] = React.useState(true);
  React.useEffect(() => {
    const interval = setInterval(() => setPisca(p => !p), 800);
    return () => clearInterval(interval);
  }, []);
  const min = React.useMemo(() => {
    const [h, m] = agendamento.hora.split(':').map(Number);
    const alvo = new Date(); alvo.setHours(h, m, 0, 0);
    return Math.round((alvo - new Date()) / 1000 / 60);
  }, [agendamento.hora]);
  const tempo = min <= 0 ? 'AGORA!' : min < 60 ? `em ${min} min` : `em ${Math.floor(min/60)}h`;
  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', zIndex:9999, background:pisca?'linear-gradient(135deg,#8B3A2A,#C9A84C)':'linear-gradient(135deg,#C9A84C,#8B3A2A)', transition:'background 0.4s', padding:'16px 20px', borderRadius:'0 0 20px 20px', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ fontSize:'32px' }}>⏰</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:'800', fontSize:'14px', color:'#1A0F0D' }}>SEU HORÁRIO {tempo.toUpperCase()}</div>
          <div style={{ fontSize:'12px', color:'rgba(26,15,13,0.8)', marginTop:'2px' }}>✂️ {agendamento.barbeiroNome} · {agendamento.hora}</div>
        </div>
        <button onClick={onFechar} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'50%', width:'28px', height:'28px', color:'#1A0F0D', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>
      <div style={{ marginTop:'10px', display:'flex', gap:'8px' }}>
        <button onClick={() => {
          const msg = encodeURIComponent(`Confirmando presença:\n✂️ ${agendamento.barbeiroNome}\n🕐 ${agendamento.hora}\nEstou a caminho! 👋`);
          window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank');
        }} style={{ flex:1, padding:'8px', borderRadius:'10px', border:'none', background:'#25D366', color:'#fff', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
          📲 Confirmar presença
        </button>
        <button onClick={onFechar} style={{ flex:1, padding:'8px', borderRadius:'10px', border:'none', background:'rgba(0,0,0,0.2)', color:'#1A0F0D', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>OK, ciente</button>
      </div>
    </div>
  );
}

function StaffLoginScreen({ onBack, onSuccess, dark }) {
  const s = getStyles(dark);
  const [email, setEmail]     = React.useState(() => localStorage.getItem('flyguer_staff_email') || '');
  const [senha, setSenha]     = React.useState('');
  const [erro, setErro]       = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleLogin() {
    if (!email.trim() || !senha.trim()) { setErro('Preencha email e senha.'); return; }
    setLoading(true); setErro('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha.trim());
      localStorage.setItem('flyguer_staff_email', email.trim());
      const snap = await getDoc(doc(db, 'barbeiros_auth', cred.user.uid));
      if (!snap.exists()) { setErro('Perfil não encontrado.'); await signOut(auth); setLoading(false); return; }
      onSuccess({ ...snap.data(), uid: cred.user.uid });
    } catch(e) {
      const msgs = {
        'auth/user-not-found':'Email não encontrado.','auth/wrong-password':'Senha incorreta.',
        'auth/invalid-email':'Email inválido.','auth/too-many-requests':'Muitas tentativas.',
        'auth/invalid-credential':'Email ou senha incorretos.',
      };
      setErro(msgs[e.code] || 'Erro ao entrar.');
    }
    setLoading(false);
  }

  return (
    <div style={{ ...s.app, padding:'40px 20px 24px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>← Voltar</button>
      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <div style={{ display:'flex', justifyContent:'center' }}><LogoMark size={60} /></div>
        <div style={{ marginTop:'12px', fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A' }}>Acesso da equipe</div>
        <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'4px' }}>Entre com seu email e senha</div>
      </div>
      <div style={{ marginBottom:'14px' }}>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" placeholder="seu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErro('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus />
      </div>
      <div style={{ marginBottom:'14px' }}>
        <label style={s.label}>Senha</label>
        <input style={s.input} type="password" placeholder="••••••••" value={senha} onChange={e=>{setSenha(e.target.value);setErro('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
      </div>
      {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'8px', padding:'10px' }}>{erro}</div>}
      <button style={{ ...s.btnGold, opacity:loading?0.7:1 }} onClick={handleLogin} disabled={loading}>
        {loading ? '⏳ Entrando...' : 'Entrar →'}
      </button>
      <Divider />
      <WarnBanner>Primeiro acesso? Use a senha temporária enviada pelo gerente.</WarnBanner>
    </div>
  );
}

function TelaRedefinirSenha({ usuario, onConcluido, dark }) {
  const s = getStyles(dark);
  const [senhaAtual, setSenhaAtual] = React.useState('');
  const [senhaNova, setSenhaNova]   = React.useState('');
  const [senhaConf, setSenhaConf]   = React.useState('');
  const [erro, setErro]             = React.useState('');
  const [loading, setLoading]       = React.useState(false);
  const [ok, setOk]                 = React.useState(false);

  async function handleRedefinir() {
    setErro('');
    if (senhaNova.length < 6) { setErro('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (senhaNova !== senhaConf) { setErro('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, senhaNova);
      const { doc: fd, updateDoc } = await import('firebase/firestore');
      await updateDoc(fd(db, 'barbeiros_auth', user.uid), { primeiroAcesso: false });
      setOk(true);
      setTimeout(() => onConcluido(), 2000);
    } catch(e) {
      const msgs = { 'auth/wrong-password':'Senha atual incorreta.','auth/weak-password':'Senha fraca.','auth/invalid-credential':'Senha atual incorreta.' };
      setErro(msgs[e.code] || 'Erro ao redefinir senha.');
    }
    setLoading(false);
  }

  if (ok) return (
    <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'64px', marginBottom:'16px' }}>✅</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A' }}>Senha redefinida!</div>
      </div>
    </div>
  );

  return (
    <div style={{ ...s.app, padding:'40px 20px 24px' }}>
      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔐</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A' }}>Defina sua senha</div>
        <div style={{ fontSize:'13px', color:'#9A8880', marginTop:'6px' }}>Olá, {usuario.nome}! Redefina sua senha antes de continuar.</div>
      </div>
      {[
        {label:'Senha atual (temporária)',val:senhaAtual,set:setSenhaAtual},
        {label:'Nova senha',val:senhaNova,set:setSenhaNova},
        {label:'Confirmar nova senha',val:senhaConf,set:setSenhaConf},
      ].map(f=>(
        <div key={f.label} style={{ marginBottom:'14px' }}>
          <label style={s.label}>{f.label}</label>
          <input style={s.input} type="password" value={f.val} onChange={e=>{f.set(e.target.value);setErro('');}} />
        </div>
      ))}
      {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'8px', padding:'10px' }}>{erro}</div>}
      <button style={{ ...s.btnGold, opacity:loading?0.7:1 }} onClick={handleRedefinir} disabled={loading}>
        {loading ? '⏳ Salvando...' : '✅ Salvar nova senha'}
      </button>
    </div>
  );
}

function ModalTour360({ onFechar }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:9999, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#1A0F0D', borderBottom:'1px solid #3A2018' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#E8C96A', fontWeight:'700' }}>🏠 Flyguer BarberShop</div>
          <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>Tour virtual 360° — Shopping Cidade das Artes</div>
        </div>
        <button onClick={onFechar} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'50%', width:'36px', height:'36px', color:'#F5EFE6', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>
      <div style={{ flex:1, position:'relative' }}>
        <iframe src="https://tour.panoee.net/6a1e212ca475c8a5fdbdd167" style={{ width:'100%', height:'100%', border:'none' }} allow="fullscreen; gyroscope; accelerometer" allowFullScreen title="Tour 360°" />
      </div>
      <div style={{ padding:'12px 16px', background:'#1A0F0D', borderTop:'1px solid #3A2018', textAlign:'center' }}>
        <div style={{ fontSize:'11px', color:'#9A8880' }}>📍 Piso 2, Nº 22 · Arraste para explorar</div>
      </div>
    </div>
  );
}

function BannerPreAgendamento({ cliente }) {
  const [preProximo, setPreProximo] = React.useState(null);

  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const unsub = onSnapshot(
      query(collection(db,'agendamentos'), where('clienteCpf','==',cliente.cpf), where('status','==','pre_agendamento')),
      snap => {
        const agora = new Date();
        const lista = snap.docs.map(d=>d.data()).filter(ag => {
          if (!ag.data || !ag.hora) return false;
          const dataAg = new Date(`${ag.data}T${ag.hora}:00`);
          const diffH  = (dataAg - agora) / 1000 / 3600;
          return diffH > 0 && diffH <= 48;
        }).sort((a,b) => a.data?.localeCompare(b.data));
        setPreProximo(lista[0] || null);
      }
    );
    return unsub;
  }, [cliente?.cpf]);

  if (!preProximo) return null;

  const dataAg  = new Date(`${preProximo.data}T${preProximo.hora}:00`);
  const diffH   = Math.ceil((dataAg - new Date()) / 1000 / 3600);
  const urgente = diffH <= 24;

  return (
    <div style={{ margin:'12px 16px 0', background: urgente?'rgba(244,67,54,0.12)':'rgba(255,193,7,0.1)', border:`1.5px solid ${urgente?'rgba(244,67,54,0.4)':'rgba(255,193,7,0.4)'}`, borderRadius:'14px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
      <span style={{ fontSize:'22px' }}>{urgente ? '⚠️' : '📌'}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'12px', fontWeight:'700', color:urgente?'#F44336':'#FFC107' }}>
          {urgente ? 'Confirme hoje!' : `Confirme em até ${diffH}h`} — Pré-agendamento pendente
        </div>
        <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>
          ✂️ {preProximo.barbeiroNome} · {preProximo.data?.split('-').reverse().join('/')} às {preProximo.hora}
        </div>
        <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>⚠️ O horário pode sofrer alteração até a confirmação.</div>
      </div>
    </div>
  );
}

function SplashScreen({ onClienteNovo, onClienteCadastrado, onStaff, dark, onVerPromo }) {
  const s = getStyles(dark);
  const [tour360, setTour360] = React.useState(false);

  const barbeiros = [
    { id:'b1', nome:'Amaral', cargo:'👑 Gerente · Barbeiro', disponivel:true  },
    { id:'b2', nome:'Jotace', cargo:'✂️ Barbeiro',           disponivel:true  },
    { id:'b3', nome:'Júnior', cargo:'✂️ Barbeiro',           disponivel:false },
  ];

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>
      <div style={{ background:'linear-gradient(160deg,#5C2218 0%,#8B3A2A 50%,#A84832 100%)', padding:'40px 24px 32px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'16px' }}><LogoMark size={80} /></div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'26px', fontWeight:'900', color:'#F5EFE6', letterSpacing:'1px' }}>
          Flyguer <span style={{ fontWeight:'300', color:'#E8C96A' }}>BarberShop</span>
        </div>
        <div style={{ fontSize:'13px', color:'rgba(245,239,230,0.7)', marginTop:'6px', fontStyle:'italic' }}>Nossa Arte, Seu Estilo.</div>
        <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.5)', marginTop:'4px' }}>Shopping Cidade das Artes — Piso 2, Nº 22</div>
      </div>
      <div style={{ padding:'20px 20px 0' }}>
        {/* ✅ Banner promoção — sem login. Ao clicar, salva promo e vai para login */}
        <BannerPromocao
          cliente={null}
          onResgatado={(promo, motivo) => {
            if (motivo === 'login_required') {
              onVerPromo && onVerPromo(promo);
            }
          }}
        />
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
              {b.disponivel?'Disponível':'Ocupado'}
            </div>
          </div>
        ))}
        <Divider />
        <p style={{ fontSize:'13px', color:'#9A8880', textAlign:'center', marginBottom:'20px' }}>Estamos prontos para cuidar do seu estilo.</p>
        <button style={{ ...s.btnGold, marginBottom:'10px' }} onClick={onClienteNovo}>👤 Criar Conta de Cliente</button>
        <button style={{ ...s.btnDark, marginBottom:'10px' }} onClick={onClienteCadastrado}>🔑 Acessar Cadastro Existente</button>
        <button onClick={() => setTour360(true)} style={{ width:'100%', padding:'13px', borderRadius:'14px', border:'1px solid rgba(232,201,106,0.3)', background:'rgba(232,201,106,0.06)', color:'#E8C96A', fontSize:'14px', fontWeight:'600', cursor:'pointer', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          🏠 Conheça a barbearia — Tour 360°
        </button>
        <WarnBanner>Use um número de WhatsApp válido para receber confirmações.</WarnBanner>
        <div onClick={onStaff} style={{ textAlign:'center', fontSize:'11px', color:'#444', cursor:'pointer', paddingBottom:'8px' }}>Acesso da equipe</div>
      </div>
      {tour360 && <ModalTour360 onFechar={() => setTour360(false)} />}
    </div>
  );
}

function EmBreve({ titulo, onBack, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, padding:'24px 20px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>← Voltar</button>
      <div style={{ textAlign:'center', paddingTop:'60px' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔨</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A', marginBottom:'8px' }}>{titulo}</div>
        <div style={{ fontSize:'13px', color:'#9A8880' }}>Em desenvolvimento</div>
      </div>
    </div>
  );
}

// ✅ Tela de bloqueio pós-login quando CPF já resgatou a promoção
function TelaPromoJaResgatada({ cliente, onIrParaHome, onAgendar, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, padding:'32px 20px', textAlign:'center' }}>
      <div style={{ fontSize:'56px', marginBottom:'16px' }}>✅</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#E8C96A', marginBottom:'8px' }}>
        Você já garantiu sua vaga!
      </div>
      <div style={{ fontSize:'14px', color:'#9A8880', marginBottom:'24px' }}>
        Olá, {cliente.nome.split(' ')[0]}! Este CPF já resgatou esta promoção.
      </div>
      <div style={{ background:'rgba(139,0,0,0.2)', border:'1px solid rgba(244,67,54,0.3)', borderRadius:'14px', padding:'16px', marginBottom:'24px', textAlign:'left' }}>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', marginBottom:'4px' }}>Sua promoção está registrada</div>
        <div style={{ fontSize:'15px', fontWeight:'700', color:'#F5EFE6' }}>🔥 Promoção resgatada com sucesso</div>
        <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'4px' }}>Vá para agendamento para marcar seu horário</div>
      </div>
      <button
        onClick={onAgendar}
        style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontSize:'15px', fontWeight:'700', cursor:'pointer', marginBottom:'10px' }}>
        📅 Agendar meu horário agora →
      </button>
      <button
        onClick={onIrParaHome}
        style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'transparent', color:'#9A8880', fontSize:'13px', cursor:'pointer' }}>
        Ir para home
      </button>
    </div>
  );
}

function HomeCliente({ cliente, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  const [tour360Cliente, setTour360Cliente] = React.useState(false);
  const [lembrete, setLembrete]             = React.useState(null);
  const [alertaVisivel, setAlertaVisivel]   = React.useState(false);

  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const hojeStr = new Date().toISOString().split('T')[0];
    getDocs(query(collection(db,'agendamentos'), where('clienteCpf','==',cliente.cpf), where('data','==',hojeStr), where('status','==','confirmado'))).then(snap => {
      const agora = new Date();
      const proximo = snap.docs.map(d=>d.data()).filter(a => {
        const [h,m] = a.hora.split(':').map(Number);
        const alvo = new Date(); alvo.setHours(h,m,0,0);
        const diff = (alvo - agora) / 1000 / 60;
        return diff > -30 && diff <= 120;
      }).sort((a,b)=>a.hora.localeCompare(b.hora))[0];
      if (proximo) {
        setLembrete(proximo);
        const chave = `alerta_${cliente.cpf}_${proximo.data}_${proximo.hora}`;
        if (!localStorage.getItem(chave)) {
          localStorage.setItem(chave, '1');
          setAlertaVisivel(true);
          tocarBip();
          if (navigator.vibrate) navigator.vibrate([200,100,200,100,400]);
        }
      }
    });
  }, [cliente?.cpf]);

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>
      {alertaVisivel && lembrete && <AlertaAgendamento agendamento={lembrete} onFechar={() => setAlertaVisivel(false)} />}
      <div style={{ ...s.header }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div onClick={() => onNavegar('perfil_cliente')} style={{ ...s.avatar, width:'40px', height:'40px', fontSize:'16px', overflow:'hidden', cursor:'pointer', border:'2px solid #C9A84C' }}>
            {cliente.foto ? <img src={cliente.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : cliente.nome[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#F5EFE6' }}>Olá, {cliente.nome.split(' ')[0]}! 👋</div>
            <div style={{ fontSize:'11px', color:'#9A8880' }}>Flyguer BarberShop</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:'#2E1A14', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', color:'#9A8880', cursor:'pointer' }}>Sair</button>
      </div>
      {/* ✅ Banner promoção — cliente logado executa resgate direto */}
      <div style={{ paddingTop:'4px' }}>
        <BannerPromocao
          cliente={cliente}
          onResgatado={(promo) => { onNavegar('agendamento_promo'); }}
        />
      </div>
      <BannerPreAgendamento cliente={cliente} />
      <div style={{ padding:'16px 20px' }}>
        {lembrete && !alertaVisivel && (
          <div style={{ background:'linear-gradient(135deg,#A07830,#C9A84C)', borderRadius:'14px', padding:'14px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontSize:'28px' }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'700', fontSize:'13px', color:'#1A0F0D' }}>Seu agendamento é hoje às {lembrete.hora}!</div>
              <div style={{ fontSize:'11px', color:'rgba(26,15,13,0.7)', marginTop:'2px' }}>✂️ {lembrete.barbeiroNome} · {lembrete.servico}</div>
            </div>
          </div>
        )}
        <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', borderRadius:'18px', padding:'20px', marginBottom:'20px' }}>
          <div style={{ fontSize:'12px', color:'rgba(245,239,230,0.6)', marginBottom:'4px', fontWeight:'600' }}>BEM-VINDO DE VOLTA!</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#F5EFE6', fontWeight:'700' }}>{cliente.nome.split(' ')[0]}</div>
          <div style={{ fontSize:'12px', color:'rgba(245,239,230,0.6)', marginTop:'4px' }}>Cadastro ativo ✅</div>
        </div>
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>O que deseja fazer?</div>
        {[
          { icon:'📅', label:'Fazer Agendamento', sub:'Escolha barbeiro, dia e horário', acao:()=>onNavegar('agendamento') },
          { icon:'📋', label:'Minhas Reservas',   sub:'Ver, cancelar ou reagendar',      acao:()=>onNavegar('minhas_reservas') },
          { icon:'💳', label:'Planos Mensais',    sub:'Assine e economize nos cortes',   acao:()=>onNavegar('assinatura_plano') },
          { icon:'👤', label:'Meu Perfil',        sub:'Dados, histórico e avaliações',   acao:()=>onNavegar('perfil_cliente') },
        ].map(item => (
          <div key={item.label} onClick={item.acao} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px', background:s.cardBg, borderRadius:'14px', border:`1px solid ${s.border}`, marginBottom:'10px', cursor:'pointer' }}>
            <div style={{ fontSize:'24px' }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'600', fontSize:'14px' }}>{item.label}</div>
              <div style={{ fontSize:'11px', color:s.textSub }}>{item.sub}</div>
            </div>
          </div>
        ))}
        <div onClick={() => setTour360Cliente(true)} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px', background:'rgba(232,201,106,0.06)', borderRadius:'14px', border:'1px solid rgba(232,201,106,0.2)', marginBottom:'10px', cursor:'pointer' }}>
          <div style={{ fontSize:'24px' }}>🏠</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'600', fontSize:'14px', color:'#E8C96A' }}>Conheça a Barbearia</div>
            <div style={{ fontSize:'11px', color:s.textSub }}>Tour virtual 360° da Flyguer</div>
          </div>
          <div style={{ fontSize:'16px', color:'#E8C96A' }}>▶</div>
        </div>
      </div>
      {tour360Cliente && <ModalTour360 onFechar={() => setTour360Cliente(false)} />}
    </div>
  );
}

function HomeGerente({ usuario, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  const acoes = [
    { id:'config',            icon:'⚙️',  label:'Configurações',       sub:'Horários, Pix, dados' },
    { id:'servicos',          icon:'💈',  label:'Serviços & Preços',    sub:'Tabela de serviços'   },
    { id:'equipe',            icon:'👥',  label:'Equipe',               sub:'Barbeiros e recepção'  },
    { id:'agenda',            icon:'📅',  label:'Agenda Geral',         sub:'Todos os barbeiros'   },
    { id:'financeiro',        icon:'💰',  label:'Financeiro',           sub:'Receitas e relatórios' },
    { id:'comparativo',       icon:'📊',  label:'Comparativo',          sub:'Ranking de barbeiros' },
    { id:'planos_mensais',    icon:'💳',  label:'Planos Mensais',       sub:'Criar e gerir planos'  },
    { id:'promocao',          icon:'🔴',  label:'Promoção Relâmpago',   sub:'Disparar para clientes'},
    { id:'clientes',          icon:'👥',  label:'Clientes',             sub:'Lista e assinaturas'   },
    { id:'comunicado',        icon:'📢',  label:'Comunicado',           sub:'Mensagem para a equipe'},
    { id:'whatsapp_business', icon:'📱',  label:'WhatsApp Business',    sub:'Mensagens automáticas' },
    { id:'permissoes',        icon:'🔑',  label:'Permissões',           sub:'Acesso da recepção'    },
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
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          {acoes.map(a => (
            <div key={a.id} onClick={() => onNavegar(a.id)} style={{ background:'#231410', borderRadius:'14px', padding:'16px 14px', border:'1px solid #3A2018', cursor:'pointer' }}>
              <div style={{ fontSize:'24px', marginBottom:'8px' }}>{a.icon}</div>
              <div style={{ fontWeight:'600', fontSize:'13px', marginBottom:'2px', color:'#F5EFE6' }}>{a.label}</div>
              <div style={{ fontSize:'11px', color:'#9A8880' }}>{a.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  );
}

export default function App() {
  React.useEffect(() => { if (window.__removeSplash) window.__removeSplash(); }, []);

  const [dark, setDark]               = React.useState(true);
  const [tela, setTela]               = React.useState('splash');
  const [usuario, setUsuario]         = React.useState(null);
  const [cliente, setCliente]         = React.useState(null);
  const [emBreveInfo, setEmBreveInfo] = React.useState(null);
  const [configAbaInicial, setConfigAbaInicial] = React.useState('horarios');
  const [promoParaResgatar, setPromoParaResgatar] = React.useState(null);
  const [authCarregando, setAuthCarregando] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'barbeiros_auth', user.uid));
          if (snap.exists()) {
            const perfil = snap.data();
            if (!perfil.primeiroAcesso) {
              setUsuario({ ...perfil, uid: user.uid });
              if (perfil.perfil === PERFIL.GERENTE)            setTela('home_gerente');
              else if (perfil.perfil === PERFIL.BARBEIRO)      setTela('home_barbeiro');
              else if (perfil.perfil === PERFIL.RECEPCIONISTA) setTela('recepcao');
              solicitarPushPermissao(user.uid);
            }
          }
        } catch(e) { console.error(e); }
      }
      setAuthCarregando(false);
    });
    return () => unsub();
  }, []);

  // ✅ CORREÇÃO PRINCIPAL — Checagem de duplo resgate pós-login
  async function handleLoginClienteSucesso(clienteLogado) {
    setCliente(clienteLogado);

    // Fluxo tradicional — sem promo pendente
    if (!promoParaResgatar) {
      setTela('home_cliente');
      return;
    }

    // Fluxo de promoção — verifica se CPF já resgatou ANTES de avançar
    try {
      const snapResgate = await getDoc(doc(db, 'resgates_promo', `${clienteLogado.cpf}_ativa`));
      if (snapResgate.exists()) {
        // ✅ CPF já resgatou → bloqueia e mostra tela de aviso
        // Mantém promoParaResgatar para que o botão "Agendar agora" funcione
        setTela('promo_ja_resgatada');
        return;
      }
    } catch(e) {
      console.error('[handleLoginClienteSucesso] Erro ao checar resgate:', e);
    }

    // CPF não resgatou ainda → segue para agendamento da promoção
    setTela('agendamento_promo');
  }

  async function handleStaffLogin(usuarioLogado) {
    setUsuario(usuarioLogado);
    if (usuarioLogado.primeiroAcesso) { setTela('redefinir_senha'); return; }
    if (usuarioLogado.perfil === PERFIL.GERENTE)            setTela('home_gerente');
    else if (usuarioLogado.perfil === PERFIL.BARBEIRO)      setTela('home_barbeiro');
    else if (usuarioLogado.perfil === PERFIL.RECEPCIONISTA) setTela('recepcao');
    if (auth.currentUser) solicitarPushPermissao(auth.currentUser.uid);
  }

  function handleNavegarGerente(modulo) {
    const mapa = {
      'config':            () => { setConfigAbaInicial('horarios'); setTela('config_barbearia'); },
      'servicos':          () => { setConfigAbaInicial('servicos'); setTela('config_barbearia'); },
      'equipe':            () => setTela('gestao_equipe'),
      'financeiro':        () => setTela('financeiro'),
      'comparativo':       () => setTela('comparativo'),
      'agenda':            () => setTela('agenda_geral'),
      'permissoes':        () => setTela('recepcao'),
      'planos_mensais':    () => setTela('planos_mensais'),
      'promocao':          () => setTela('promocao'),
      'clientes':          () => setTela('clientes'),
      'comunicado':        () => setTela('comunicado'),
      'whatsapp_business': () => setTela('whatsapp_business'),
    };
    if (mapa[modulo]) { mapa[modulo](); return; }
    setEmBreveInfo({ titulo: modulo });
    setTela('em_breve');
  }

  async function handleLogout() {
    try { await signOut(auth); } catch(e) {}
    setUsuario(null); setCliente(null); setPromoParaResgatar(null); setTela('splash');
  }

  function voltar() {
    if (usuario) {
      if (usuario.perfil===PERFIL.GERENTE)       setTela('home_gerente');
      else if (usuario.perfil===PERFIL.BARBEIRO) setTela('home_barbeiro');
      else setTela('staff_login');
    } else setTela('splash');
  }

  if (authCarregando) {
    return (
      <div style={{ minHeight:'100vh', background:'#1A0F0D', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#E8C96A' }}>
          <div style={{ fontSize:'48px', marginBottom:'12px' }}>✂️</div>
          <div style={{ fontSize:'14px', fontFamily:"'Playfair Display',serif" }}>Flyguer BarberShop</div>
        </div>
      </div>
    );
  }

  const toggleTema = (
    <button onClick={() => setDark(d=>!d)} style={{ position:'fixed', top:'12px', right:'12px', zIndex:'100', background:'rgba(0,0,0,0.4)', border:'1px solid #3A2018', borderRadius:'50%', width:'32px', height:'32px', fontSize:'14px', cursor:'pointer', color:'#fff', backdropFilter:'blur(4px)' }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );

  return (
    <GlobalErrorBoundary>
      <BannerOffline />
      <InstalarApp dark={dark} />
      <div style={{ maxWidth:'430px', margin:'0 auto', minHeight:'100vh', position:'relative' }} className="app-container">
        {toggleTema}
        <ErrorBoundary modulo="App">

          {tela==='splash' && (
            <SplashScreen
              onClienteNovo={()=>setTela('login_cliente')}
              onClienteCadastrado={()=>setTela('login_cliente')}
              onStaff={()=>setTela('staff_login')}
              dark={dark}
              onVerPromo={(promo) => {
                // ✅ Salva promo e leva para login
                setPromoParaResgatar(promo);
                setTela('login_cliente');
              }}
            />
          )}

          {tela==='login_cliente' && (
            <ErrorBoundary modulo="LoginCliente">
              <LoginFlow onSucesso={handleLoginClienteSucesso} onBack={()=>{setPromoParaResgatar(null);setTela('splash');}} dark={dark} />
            </ErrorBoundary>
          )}

          {/* ✅ Tela de bloqueio: CPF já resgatou esta promoção */}
          {tela==='promo_ja_resgatada' && cliente && (
            <TelaPromoJaResgatada
              cliente={cliente}
              dark={dark}
              onIrParaHome={() => { setPromoParaResgatar(null); setTela('home_cliente'); }}
              onAgendar={() => {
                // Vai para agendamento via promo para marcar o horário (resgate já existe no Firestore)
                setTela('agendamento_promo');
              }}
            />
          )}

          {tela==='home_cliente' && cliente && (
            <ErrorBoundary modulo="HomeCliente">
              <HomeCliente
                cliente={cliente}
                onLogout={()=>{setCliente(null);setPromoParaResgatar(null);setTela('splash');}}
                onNavegar={(t) => {
                  if (t==='agendamento_promo') setTela('agendamento_promo');
                  else setTela(t);
                }}
                dark={dark}
              />
            </ErrorBoundary>
          )}

          {tela==='staff_login' && <StaffLoginScreen onBack={()=>setTela('splash')} onSuccess={handleStaffLogin} dark={dark} />}
          {tela==='redefinir_senha' && usuario && <TelaRedefinirSenha usuario={usuario} onConcluido={() => { const u={...usuario,primeiroAcesso:false}; setUsuario(u); handleStaffLogin(u); }} dark={dark} />}
          {tela==='home_gerente' && usuario && <ErrorBoundary modulo="HomeGerente"><HomeGerente usuario={usuario} onLogout={handleLogout} onNavegar={handleNavegarGerente} dark={dark} /></ErrorBoundary>}
          {tela==='home_barbeiro' && usuario && <ErrorBoundary modulo="HomeBarbeiro"><HomeBarbeiro usuario={usuario} onLogout={handleLogout} onNavegar={mod=>{ if(mod==='equipe') setTela('gestao_equipe'); if(mod==='agenda_barbeiro') setTela('agenda_barbeiro'); }} dark={dark} /></ErrorBoundary>}
          {tela==='minhas_reservas' && cliente && <ErrorBoundary modulo="MinhasReservas"><MinhasReservas cliente={cliente} onBack={()=>setTela('home_cliente')} onReagendar={()=>setTela('agendamento')} dark={dark} /></ErrorBoundary>}

          {/* ✅ agendamento_promo — usa promoParaResgatar. A transação atômica acontece em AgendarViaPromo.confirmar() */}
          {tela==='agendamento_promo' && cliente && promoParaResgatar && (
            <ErrorBoundary modulo="AgendamentoPromo">
              <Agendamento
                cliente={cliente}
                onBack={()=>setTela('home_cliente')}
                dark={dark}
                promoParaResgatar={promoParaResgatar}
                onConcluido={() => { setPromoParaResgatar(null); setTela('home_cliente'); }}
              />
            </ErrorBoundary>
          )}

          {/* ✅ agendamento TRADICIONAL — promoParaResgatar sempre null */}
          {tela==='agendamento' && cliente && (
            <ErrorBoundary modulo="Agendamento">
              <Agendamento cliente={cliente} onBack={()=>setTela('home_cliente')} dark={dark} promoParaResgatar={null} />
            </ErrorBoundary>
          )}

          {tela==='recepcao' && <ErrorBoundary modulo="PainelRecepcao"><PainelRecepcao onBack={()=>usuario?.perfil===PERFIL.GERENTE?setTela('home_gerente'):setTela('splash')} dark={dark} onNavegarAssinaturas={()=>setTela('gerenciar_assinaturas')} /></ErrorBoundary>}
          {tela==='financeiro' && usuario && <ErrorBoundary modulo="Financeiro"><Financeiro onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='agenda_barbeiro' && usuario && <ErrorBoundary modulo="AgendaBarbeiro"><AgendaBarbeiro usuario={usuario} onBack={()=>setTela(usuario.perfil===PERFIL.GERENTE?'home_gerente':'home_barbeiro')} dark={dark} /></ErrorBoundary>}
          {tela==='agenda_geral' && usuario && <ErrorBoundary modulo="AgendaGeral"><AgendaGeral usuario={usuario} onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='gestao_equipe' && usuario && <ErrorBoundary modulo="GestaoEquipe"><GestaoEquipe usuario={usuario} onBack={()=>usuario.perfil===PERFIL.GERENTE?setTela('home_gerente'):setTela('home_barbeiro')} dark={dark} /></ErrorBoundary>}
          {tela==='config_barbearia' && usuario && <ErrorBoundary modulo="ConfigBarbearia"><ConfigBarbearia onBack={()=>setTela('home_gerente')} dark={dark} abaInicial={configAbaInicial} /></ErrorBoundary>}
          {tela==='planos_mensais' && usuario && <ErrorBoundary modulo="PlanosMensais"><PlanosMensais onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='assinatura_plano' && cliente && <ErrorBoundary modulo="AssinaturaPlano"><AssinaturaPlano cliente={cliente} onBack={()=>setTela('home_cliente')} dark={dark} /></ErrorBoundary>}
          {tela==='gerenciar_assinaturas' && <ErrorBoundary modulo="GerenciarAssinaturas"><GerenciarAssinaturas onBack={()=>setTela('recepcao')} dark={dark} /></ErrorBoundary>}
          {tela==='clientes' && usuario && <ErrorBoundary modulo="Clientes"><ListaClientes onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='promocao' && usuario && <ErrorBoundary modulo="Promocao"><Promocao onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='comparativo' && usuario && <ErrorBoundary modulo="Comparativo"><Comparativo onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='perfil_cliente' && cliente && <ErrorBoundary modulo="PerfilCliente"><PerfilCliente cliente={cliente} onBack={()=>setTela('home_cliente')} dark={dark} onNavegar={setTela} /></ErrorBoundary>}
          {tela==='comunicado' && usuario && <ErrorBoundary modulo="ComunicadoGerente"><ComunicadoGerente onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='whatsapp_business' && usuario && <ErrorBoundary modulo="WhatsAppBusiness"><MensagemWhatsAppBusiness onBack={()=>setTela('home_gerente')} dark={dark} /></ErrorBoundary>}
          {tela==='em_breve' && <EmBreve titulo={emBreveInfo?.titulo} onBack={voltar} dark={dark} />}

        </ErrorBoundary>
      </div>
    </GlobalErrorBoundary>
  );
}
