// App.jsx — Amaral Barbearia
// ─────────────────────────────────────────────────────────────
// Stack: React (CRA) + Firebase Firestore + Vercel
// Padrão: herdado do MokLog CheckTest (Moked Consulting)
// Desenvolvido por: Marcio Fonseca + Claude (Anthropic)
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { getStyles, APP_CONFIG, PERFIL } from './getStyles';

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY — igual MokLog, protege contra crash
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturou:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0A0A0A', color: '#F5F5F0',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#C9A84C', marginBottom: '8px' }}>
            Algo deu errado
          </div>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            Módulo: {this.props.modulo || 'App'}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '24px', maxWidth: '300px' }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '12px 24px', background: '#C9A84C', color: '#0A0A0A', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', marginBottom: '10px', width: '200px' }}
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', background: '#2A2A2A', color: '#F5F5F0', border: '1px solid #333', borderRadius: '10px', cursor: 'pointer', width: '200px' }}
          >
            Recarregar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────
// COMPONENTES UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

// Logo mark — ícone ✂️ dourado
function LogoMark({ size = 48 }) {
  return (
    <div style={{
      width: size, height: size,
      background: '#C9A84C',
      borderRadius: size * 0.22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5,
      boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
    }}>
      ✂️
    </div>
  );
}

// Aviso amarelo padrão
function WarnBanner({ children }) {
  return (
    <div style={{
      background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)',
      borderRadius: '10px', padding: '10px 14px',
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      fontSize: '12px', color: '#FFC107', marginBottom: '12px',
    }}>
      <span>⚠️</span><span>{children}</span>
    </div>
  );
}

// Divisor com linha
function Divider({ style }) {
  return <div style={{ height: '1px', background: '#2A2A2A', margin: '16px 0', ...style }} />;
}

// ─────────────────────────────────────────────────────────────
// TELA: SPLASH / ENTRADA
// Mostra os barbeiros cadastrados + botões de acesso
// ─────────────────────────────────────────────────────────────
function SplashScreen({ onClienteNovo, onClienteCadastrado, onStaff, dark }) {
  const s = getStyles(dark);

  // TODO (Passo 5): buscar barbeiros do Firestore em tempo real
  // Por enquanto usa lista estática pra validar o layout
  const barbeiros = [
    { id: '1', nome: 'Cadu',  cargo: '👑 Gerente · Barbeiro', disponivel: true  },
    { id: '2', nome: 'Igor',  cargo: '✂️ Barbeiro',            disponivel: true  },
    { id: '3', nome: 'Rod',   cargo: '✂️ Barbeiro',            disponivel: false },
  ];

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      {/* Hero dourado */}
      <div style={{
        background: `linear-gradient(135deg, #A07830 0%, #C9A84C 50%, #E8C96A 100%)`,
        padding: '40px 24px 32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Círculo decorativo */}
        <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'100px', height:'100px', background:'rgba(255,255,255,0.1)', borderRadius:'50%' }} />

        <LogoMark size={64} />
        <div style={{ marginTop: '12px', fontFamily:"'Playfair Display',serif", fontSize:'26px', fontWeight:'900', color:'#0A0A0A' }}>
          Amaral <span style={{ fontWeight:'300' }}>Barbearia</span>
        </div>
        <div style={{ fontSize:'12px', color:'rgba(0,0,0,0.6)', marginTop:'4px' }}>
          Shopping Cidade das Artes — Piso 2, Nº 22
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Barbeiros disponíveis */}
        <div style={{ fontSize:'11px', color:'#C9A84C', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>
          Nossos barbeiros
        </div>

        {barbeiros.map(b => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px', background: '#1E1E1E',
            borderRadius: '14px', border: '1px solid #282828',
            marginBottom: '8px',
          }}>
            {/* Avatar inicial */}
            <div style={{ ...s.avatar, width:'48px', height:'48px', fontSize:'18px', flexShrink:0 }}>
              {b.nome[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight:'600', fontSize:'15px' }}>{b.nome}</div>
              <div style={{ fontSize:'11px', color:'#C9A84C', marginTop:'2px' }}>{b.cargo}</div>
            </div>
            <div style={ b.disponivel ? s.badgeGreen : s.badgeYellow }>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: b.disponivel ? '#4CAF50' : '#FFC107', display:'inline-block' }} />
              {b.disponivel ? 'Disponível' : 'Ocupado'}
            </div>
          </div>
        ))}

        <Divider />

        {/* Botões de acesso */}
        <p style={{ fontSize:'13px', color:'#888', textAlign:'center', marginBottom:'20px' }}>
          Estamos prontos para cuidar do seu estilo.
        </p>

        <button style={{ ...s.btnGold, marginBottom:'10px' }} onClick={onClienteNovo}>
          👤 Sou Cliente Novo
        </button>
        <button style={{ ...s.btnDark, marginBottom:'16px' }} onClick={onClienteCadastrado}>
          🔒 Já tenho cadastro
        </button>

        <WarnBanner>
          Use um número de WhatsApp válido para receber confirmações.
        </WarnBanner>

        <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'#888', marginBottom:'24px', cursor:'pointer' }}>
          <input type="checkbox" style={{ accentColor:'#C9A84C' }} />
          Receber novidades por WhatsApp
        </label>

        {/* Acesso staff — discreto no rodapé */}
        <div
          onClick={onStaff}
          style={{ textAlign:'center', fontSize:'11px', color:'#444', cursor:'pointer', paddingBottom:'8px' }}
        >
          Acesso da equipe
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA: LOGIN STAFF — PIN de acesso (barbeiro / gerente)
// Padrão herdado do MokLog (PIN numérico simples)
// ─────────────────────────────────────────────────────────────
function StaffLoginScreen({ onBack, onSuccess, dark }) {
  const s = getStyles(dark);
  const [pin, setPin] = React.useState('');
  const [erro, setErro] = React.useState('');

  // TODO (Passo 5): buscar PINs do Firestore
  // Por enquanto usa PINs hardcoded para desenvolvimento
  const PINS_DEV = {
    '0001': { perfil: PERFIL.GERENTE,  nome: 'Cadu',  id: 'b1' },
    '1002': { perfil: PERFIL.BARBEIRO, nome: 'Igor',  id: 'b2' },
    '1003': { perfil: PERFIL.BARBEIRO, nome: 'Rod',   id: 'b3' },
    'REC1': { perfil: PERFIL.RECEPCIONISTA, nome: 'Maria', id: 'r1' },
  };

  function handleLogin() {
    const usuario = PINS_DEV[pin.toUpperCase()];
    if (!usuario) {
      setErro('PIN inválido. Tente novamente.');
      setPin('');
      return;
    }
    setErro('');
    onSuccess(usuario);
  }

  return (
    <div style={{ ...s.app, padding: '40px 20px 24px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#C9A84C', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>
        ← Voltar
      </button>

      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <LogoMark size={56} />
        <div style={{ marginTop:'12px', fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#C9A84C' }}>
          Acesso da equipe
        </div>
        <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>Amaral Barbearia</div>
      </div>

      <div style={{ marginBottom:'14px' }}>
        <label style={ s.label }>PIN de acesso</label>
        <input
          style={ s.input }
          type="password"
          placeholder="Digite seu PIN"
          value={pin}
          onChange={e => { setPin(e.target.value); setErro(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
      </div>

      {erro && (
        <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>
          {erro}
        </div>
      )}

      <button style={ s.btnGold } onClick={handleLogin}>
        Entrar →
      </button>

      <Divider />

      <WarnBanner>
        PINs são definidos pelo gerente nas configurações do app.
      </WarnBanner>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA: PLACEHOLDER — módulos ainda não implementados
// Remove conforme cada passo for concluído
// ─────────────────────────────────────────────────────────────
function EmBreve({ titulo, descricao, passo, onBack, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, padding: '24px 20px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#C9A84C', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>
        ← Voltar
      </button>
      <div style={{ textAlign:'center', paddingTop:'60px' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔨</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#C9A84C', marginBottom:'8px' }}>
          {titulo}
        </div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'16px', maxWidth:'280px', margin:'0 auto 16px' }}>
          {descricao}
        </div>
        <div style={{ ...s.badgeGold, justifyContent:'center', fontSize:'13px', padding:'8px 16px' }}>
          🔨 Passo {passo} — Em desenvolvimento
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA: HOME GERENTE — painel rápido
// Será expandido no Passo 9
// ─────────────────────────────────────────────────────────────
function HomeGerente({ usuario, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  const acoes = [
    { id: 'config',      icon: '⚙️',  label: 'Configurações',    sub: 'Horários, Pix, dados',  passo: 4 },
    { id: 'servicos',    icon: '💈',  label: 'Serviços & Preços', sub: 'Tabela de serviços',    passo: 4 },
    { id: 'equipe',      icon: '👥',  label: 'Equipe',            sub: 'Barbeiros e recepção',  passo: 5 },
    { id: 'agenda',      icon: '📅',  label: 'Agenda Geral',      sub: 'Todos os barbeiros',    passo: 8 },
    { id: 'financeiro',  icon: '💰',  label: 'Financeiro',        sub: 'Receitas e relatórios', passo: 9 },
    { id: 'comparativo', icon: '📊',  label: 'Comparativo',       sub: 'Ranking de barbeiros',  passo: 9 },
    { id: 'permissoes',  icon: '🔑',  label: 'Permissões',        sub: 'Acesso da recepção',    passo: 10 },
  ];

  return (
    <div style={{ ...s.app, paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ ...s.headerGold, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:'11px', color:'rgba(0,0,0,0.6)', fontWeight:'600' }}>👑 ADMINISTRAÇÃO</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:'900', color:'#0A0A0A' }}>
            Amaral Barbearia
          </div>
        </div>
        <button onClick={onLogout} style={{ background:'rgba(0,0,0,0.15)', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', color:'#0A0A0A', cursor:'pointer', fontWeight:'600' }}>
          Sair
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Boas vindas */}
        <div style={{ ...s.card, background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)', borderColor:'#C9A84C', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ ...s.avatar, width:'52px', height:'52px', fontSize:'22px', border:'2px solid #C9A84C' }}>
              {usuario.nome[0]}
            </div>
            <div>
              <div style={{ fontWeight:'700', fontSize:'16px' }}>Olá, {usuario.nome}! 👑</div>
              <div style={{ fontSize:'12px', color:'#C9A84C', marginTop:'2px' }}>Gerente — Acesso total</div>
            </div>
          </div>
        </div>

        {/* Grid de módulos */}
        <div style={{ fontSize:'11px', color:'#C9A84C', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>
          Módulos
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          {acoes.map(a => (
            <div
              key={a.id}
              onClick={() => onNavegar(a.id)}
              style={{
                background: '#1E1E1E',
                borderRadius: '14px',
                padding: '16px 14px',
                border: '1px solid #282828',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize:'24px', marginBottom:'8px' }}>{a.icon}</div>
              <div style={{ fontWeight:'600', fontSize:'13px', marginBottom:'2px' }}>{a.label}</div>
              <div style={{ fontSize:'11px', color:'#888' }}>{a.sub}</div>
              <div style={{ marginTop:'8px', fontSize:'10px', color:'#444' }}>Passo {a.passo}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA: HOME BARBEIRO — agenda resumida
// Será expandido no Passo 8
// ─────────────────────────────────────────────────────────────
function HomeBarbeiro({ usuario, onLogout, onNavegar, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, paddingBottom: '24px' }}>
      <div style={{ ...s.header }}>
        <div>
          <div style={ s.headerTitle }>✂️ Minha Agenda</div>
          <div style={ s.headerSubtitle }>{usuario.nome}</div>
        </div>
        <button onClick={onLogout} style={{ background:'#2A2A2A', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', color:'#888', cursor:'pointer' }}>
          Sair
        </button>
      </div>

      <div style={{ padding:'20px' }}>
        <div style={{ ...s.card, textAlign:'center', padding:'32px 20px', borderColor:'#C9A84C' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>📅</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#C9A84C', marginBottom:'8px' }}>
            Agenda em desenvolvimento
          </div>
          <div style={{ fontSize:'13px', color:'#888' }}>
            Passo 8 — Em breve você verá seus agendamentos aqui.
          </div>
        </div>

        <button style={{ ...s.btnGold }} onClick={() => onNavegar('agenda')}>
          📅 Ver Agenda (em breve)
        </button>
        <button style={{ ...s.btnDark, marginTop:'10px' }} onClick={() => onNavegar('fixos')}>
          🔒 Clientes Fixos (em breve)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP PRINCIPAL — gerencia navegação e estado global
// ─────────────────────────────────────────────────────────────
export default function App() {
  // Estado de tema — igual MokLog
  const [dark, setDark] = React.useState(true);

  // Estado de navegação
  // tela: 'splash' | 'staff_login' | 'cliente_novo' | 'cliente_login' |
  //       'home_gerente' | 'home_barbeiro' | 'em_breve'
  const [tela, setTela] = React.useState('splash');

  // Usuário logado (staff)
  const [usuario, setUsuario] = React.useState(null);

  // Para tela em_breve
  const [emBreveInfo, setEmBreveInfo] = React.useState(null);

  // ── Handlers de navegação ──────────────────────────────────

  function handleClienteNovo() {
    setEmBreveInfo({
      titulo: 'Cadastro de Cliente',
      descricao: 'Formulário completo com CPF, senha e preferências.',
      passo: 3,
    });
    setTela('em_breve');
  }

  function handleClienteCadastrado() {
    setEmBreveInfo({
      titulo: 'Login do Cliente',
      descricao: 'Acesso via CPF + senha (5 últimos dígitos do CPF).',
      passo: 3,
    });
    setTela('em_breve');
  }

  function handleStaffLogin(usuarioLogado) {
    setUsuario(usuarioLogado);
    if (usuarioLogado.perfil === PERFIL.GERENTE) {
      setTela('home_gerente');
    } else if (usuarioLogado.perfil === PERFIL.BARBEIRO) {
      setTela('home_barbeiro');
    } else if (usuarioLogado.perfil === PERFIL.RECEPCIONISTA) {
      setEmBreveInfo({
        titulo: 'Painel da Recepção',
        descricao: 'Painel web com agendamentos, criação manual e financeiro.',
        passo: 10,
      });
      setTela('em_breve');
    }
  }

  function handleNavegarGerente(modulo) {
    const passos = {
      config:      4, servicos: 4, equipe: 5,
      agenda:      8, financeiro: 9, comparativo: 9, permissoes: 10,
    };
    setEmBreveInfo({
      titulo: modulo.charAt(0).toUpperCase() + modulo.slice(1),
      descricao: `Módulo ${modulo} em desenvolvimento.`,
      passo: passos[modulo] || '?',
    });
    setTela('em_breve');
  }

  function handleLogout() {
    setUsuario(null);
    setTela('splash');
  }

  function voltar() {
    if (usuario) {
      if (usuario.perfil === PERFIL.GERENTE)  setTela('home_gerente');
      else if (usuario.perfil === PERFIL.BARBEIRO) setTela('home_barbeiro');
      else setTela('staff_login');
    } else {
      setTela('splash');
    }
  }

  // ── Render ─────────────────────────────────────────────────

  // Toggle de tema — ícone fixo no canto (igual MokLog)
  const toggleTema = (
    <button
      onClick={() => setDark(d => !d)}
      style={{
        position: 'fixed', top: '12px', right: '12px', zIndex: '999',
        background: 'rgba(0,0,0,0.5)', border: '1px solid #333',
        borderRadius: '50%', width: '36px', height: '36px',
        fontSize: '16px', cursor: 'pointer', color: '#fff',
        backdropFilter: 'blur(4px)',
      }}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );

  return (
    <div style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      {toggleTema}

      <ErrorBoundary modulo="App">

        {tela === 'splash' && (
          <SplashScreen
            onClienteNovo={handleClienteNovo}
            onClienteCadastrado={handleClienteCadastrado}
            onStaff={() => setTela('staff_login')}
            dark={dark}
          />
        )}

        {tela === 'staff_login' && (
          <StaffLoginScreen
            onBack={() => setTela('splash')}
            onSuccess={handleStaffLogin}
            dark={dark}
          />
        )}

        {tela === 'home_gerente' && usuario && (
          <ErrorBoundary modulo="HomeGerente">
            <HomeGerente
              usuario={usuario}
              onLogout={handleLogout}
              onNavegar={handleNavegarGerente}
              dark={dark}
            />
          </ErrorBoundary>
        )}

        {tela === 'home_barbeiro' && usuario && (
          <ErrorBoundary modulo="HomeBarbeiro">
            <HomeBarbeiro
              usuario={usuario}
              onLogout={handleLogout}
              onNavegar={() => {}}
              dark={dark}
            />
          </ErrorBoundary>
        )}

        {tela === 'em_breve' && (
          <EmBreve
            titulo={emBreveInfo?.titulo}
            descricao={emBreveInfo?.descricao}
            passo={emBreveInfo?.passo}
            onBack={voltar}
            dark={dark}
          />
        )}

      </ErrorBoundary>
    </div>
  );
}
