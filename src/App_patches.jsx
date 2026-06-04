// ═══════════════════════════════════════════════════════════════
// App.jsx — PATCHES para aplicar no arquivo atual
// Três blocos independentes a inserir/substituir
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// PATCH 1 — Imports adicionais (no topo, junto com os outros imports)
// ───────────────────────────────────────────────────────────────
import FichaPublicaBarbeiro from './FichaPublicaBarbeiro';

// ───────────────────────────────────────────────────────────────
// PATCH 2 — Leitura de URL params para Deep Link
// Coloque DENTRO de export default function App(), logo após os useState
// ───────────────────────────────────────────────────────────────

  // ✅ Deep Link — lê params da URL ao abrir o app
  // Ex: ?barbeiro=b2&data=2026-06-04&hora=14:00
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bId    = params.get('barbeiro');
    const bData  = params.get('data');
    const bHora  = params.get('hora');
    if (bId && bData && bHora) {
      // Salva o deep link no estado — será usado após o login
      setDeepLink({ barbeiroId:bId, data:bData, hora:bHora });
      // Limpa a URL sem recarregar
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

// ───────────────────────────────────────────────────────────────
// PATCH 3 — Novos estados (junto com os outros useState do App)
// ───────────────────────────────────────────────────────────────

  const [deepLink, setDeepLink]               = React.useState(null);
  const [fichaBareiro, setFichaBareiro]        = React.useState(null); // { id, nome, ... }

// ───────────────────────────────────────────────────────────────
// PATCH 4 — handleLoginClienteSucesso atualizado
// Substitui a função atual
// ───────────────────────────────────────────────────────────────

  async function handleLoginClienteSucesso(clienteLogado) {
    setCliente(clienteLogado);

    // ✅ Deep Link tem prioridade — vai para agendamento com barbeiro/data/hora pré-selecionados
    if (deepLink) {
      setDeepLink(null); // limpa para não reutilizar
      // Passa deep link como promoParaResgatar reutilizando o fluxo de agendamento
      // Na verdade, navega para agendamento com barbeiroPreSelecionado
      setAgendamentoDeepLink(deepLink);
      setTela('agendamento_deeplink');
      return;
    }

    // Fluxo tradicional — sem promo pendente
    if (!promoParaResgatar) {
      setTela('home_cliente');
      return;
    }

    // Fluxo de promoção
    try {
      const snapResgate = await getDoc(doc(db, 'resgates_promo', `${clienteLogado.cpf}_ativa`));
      if (snapResgate.exists()) {
        setTela('promo_ja_resgatada');
        return;
      }
    } catch(e) { console.error(e); }

    setTela('agendamento_promo');
  }

// ───────────────────────────────────────────────────────────────
// PATCH 5 — Estado adicional para deep link de agendamento
// ───────────────────────────────────────────────────────────────

  const [agendamentoDeepLink, setAgendamentoDeepLink] = React.useState(null);

// ───────────────────────────────────────────────────────────────
// PATCH 6 — SplashScreen atualizada com clique no barbeiro
// Substitui o componente SplashScreen inteiro
// ───────────────────────────────────────────────────────────────

function SplashScreen({ onClienteNovo, onClienteCadastrado, onStaff, dark, onVerPromo, onVerFicha }) {
  const s = getStyles(dark);
  const [tour360, setTour360] = React.useState(false);
  const [barbeiros, setBarbeiros] = React.useState([
    { id:'b1', nome:'Amaral', cargo:'👑 Gerente · Barbeiro', disponivel:true  },
    { id:'b2', nome:'Jotace', cargo:'✂️ Barbeiro',           disponivel:true  },
    { id:'b3', nome:'Júnior', cargo:'✂️ Barbeiro',           disponivel:false },
  ]);

  // ✅ Carrega barbeiros reais do Firestore
  React.useEffect(()=>{
    import('firebase/firestore').then(({ getDocs, collection: col, query: q, where: wh })=>{
      getDocs(q(col(db,'barbeiros'), wh('ativo','==',true))).then(snap=>{
        if(!snap.empty){
          setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao'));
        }
      }).catch(()=>{});
    });
  },[]);

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
        <BannerPromocao
          cliente={null}
          onResgatado={(promo, motivo) => {
            if (motivo === 'login_required') onVerPromo && onVerPromo(promo);
          }}
        />
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Nossos barbeiros</div>
        {barbeiros.map(b => (
          // ✅ Card do barbeiro clicável — abre a ficha pública
          <div key={b.id}
            onClick={() => onVerFicha && onVerFicha(b)}
            style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:'#231410', borderRadius:'14px', border:'1px solid #3A2018', marginBottom:'8px', cursor:'pointer', transition:'background 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='#2A1810'}
            onMouseLeave={e=>e.currentTarget.style.background='#231410'}>
            {/* Avatar clicável */}
            <div style={{ ...s.avatar, width:'48px', height:'48px', fontSize:'18px', flexShrink:0, overflow:'hidden', border:b.disponivel?'2px solid #4CAF50':'2px solid #FFC107' }}>
              {b.foto ? <img src={b.foto} alt={b.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : b.nome[0]}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'600', fontSize:'15px', color:'#F5EFE6' }}>{b.nome}</div>
              <div style={{ fontSize:'11px', color:'#E8C96A', marginTop:'2px' }}>{b.cargo}</div>
              {b.bio && <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'180px' }}>{b.bio}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
              <div style={{ ...b.disponivel?s.badgeGreen:s.badgeYellow }}>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:b.disponivel?'#4CAF50':'#FFC107', display:'inline-block' }} />
                {b.disponivel?'Disponível':'Ocupado'}
              </div>
              <div style={{ fontSize:'10px', color:'#555' }}>Ver perfil →</div>
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

// ───────────────────────────────────────────────────────────────
// PATCH 7 — No return do App, adicione estas rotas (junto com as outras)
// ───────────────────────────────────────────────────────────────

          {/* ✅ Ficha pública do barbeiro — acessível da Splash sem login */}
          {tela==='ficha_barbeiro' && fichaBareiro && (
            <FichaPublicaBarbeiro
              barbeiroId={fichaBareiro.id}
              cliente={cliente}
              dark={dark}
              onBack={() => setTela('splash')}
              onAgendar={(barbeiro, modo) => {
                // Salva o barbeiro pré-selecionado para o agendamento
                setAgendamentoDeepLink({ barbeiroPreSelecionado: barbeiro });
                if (cliente) {
                  setTela('agendamento');
                } else if (modo === 'cadastro') {
                  setTela('login_cliente');
                } else {
                  setTela('login_cliente');
                }
              }}
            />
          )}

          {/* ✅ Agendamento via Deep Link (barbeiro + data + hora pré-selecionados) */}
          {tela==='agendamento_deeplink' && cliente && agendamentoDeepLink && (
            <ErrorBoundary modulo="AgendamentoDeepLink">
              <Agendamento
                cliente={cliente}
                onBack={() => setTela('home_cliente')}
                dark={dark}
                promoParaResgatar={null}
                deepLinkParams={agendamentoDeepLink}
              />
            </ErrorBoundary>
          )}

// ───────────────────────────────────────────────────────────────
// PATCH 8 — SplashScreen no JSX do return — substitui a chamada atual
// ───────────────────────────────────────────────────────────────

          {tela==='splash' && (
            <SplashScreen
              onClienteNovo={()=>setTela('login_cliente')}
              onClienteCadastrado={()=>setTela('login_cliente')}
              onStaff={()=>setTela('staff_login')}
              dark={dark}
              onVerPromo={(promo) => {
                setPromoParaResgatar(promo);
                setTela('login_cliente');
              }}
              onVerFicha={(barbeiro) => {
                // ✅ Abre ficha pública sem precisar de login
                setFichaBareiro(barbeiro);
                setTela('ficha_barbeiro');
              }}
            />
          )}

// ───────────────────────────────────────────────────────────────
// PATCH 9 — Em Agendamento.jsx, aceitar deepLinkParams
// No componente principal Agendamento, adicione ao início:
// ───────────────────────────────────────────────────────────────

export default function Agendamento({ cliente, onBack, dark, promoParaResgatar, deepLinkParams }) {
  // ✅ Se deepLinkParams tem barbeiroPreSelecionado, pula para escolha de data
  // Se tem barbeiroId + data + hora completos, pula direto para pagamento
  const [etapa, setEtapa] = React.useState(() => {
    if (promoParaResgatar) return 'agendar_promo';
    if (deepLinkParams?.hora) return 'servico'; // barbeiro já selecionado
    return 'barbeiro';
  });

  const [barbeiro, setBarbeiro] = React.useState(null);
  // ... resto dos estados iguais

  // Carregar barbeiro do deep link
  React.useEffect(() => {
    if (!deepLinkParams?.barbeiroId) return;
    getDoc(doc(db, 'barbeiros', deepLinkParams.barbeiroId)).then(snap => {
      if (snap.exists()) {
        setBarbeiro({ id: snap.id, ...snap.data() });
        setDataHoraPreSelecionada({ data: deepLinkParams.data, hora: deepLinkParams.hora });
      }
    }).catch(console.error);
  }, [deepLinkParams?.barbeiroId]);

  // Carregar barbeiro pré-selecionado da ficha pública
  React.useEffect(() => {
    if (!deepLinkParams?.barbeiroPreSelecionado) return;
    setBarbeiro(deepLinkParams.barbeiroPreSelecionado);
  }, [deepLinkParams?.barbeiroPreSelecionado]);
}
