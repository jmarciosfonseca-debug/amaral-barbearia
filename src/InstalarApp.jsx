// InstalarApp.jsx — Flyguer BarberShop
// ✅ Banner PWA profissional — "Instalar Aplicativo Oficial no Celular"
// Dispara beforeinstallprompt no Android
// Guia manual no iOS

import React from 'react';

export default function InstalarApp({ dark }) {
  const [visivel, setVisivel]         = React.useState(false);
  const [isIOS, setIsIOS]             = React.useState(false);
  const [guiaIOS, setGuiaIOS]         = React.useState(false);
  const [jaInstalado, setJaInstalado] = React.useState(false);

  React.useEffect(() => {
    // Já está rodando como PWA instalado?
    const standalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) { setJaInstalado(true); return; }

    // Já foi dispensado pelo usuário?
    if (sessionStorage.getItem('pwa-ok')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS — não tem evento, mostra guia após 4s
      const t = setTimeout(() => setVisivel(true), 4000);
      return () => clearTimeout(t);
    }

    // Android/Chrome — escuta evento
    function onReady() { setVisivel(true); }
    if (window.__pwaPrompt) {
      setTimeout(() => setVisivel(true), 2000);
    } else {
      window.addEventListener('pwa-ready', onReady);
    }

    // App instalado com sucesso
    window.addEventListener('pwa-installed', () => {
      setVisivel(false);
      setJaInstalado(true);
    });

    return () => window.removeEventListener('pwa-ready', onReady);
  }, []);

  async function handleInstalar() {
    if (isIOS) {
      setGuiaIOS(true);
      return;
    }
    const prompt = window.__pwaPrompt;
    if (!prompt) return;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setJaInstalado(true);
    } catch(e) {}
    setVisivel(false);
  }

  function dispensar() {
    sessionStorage.setItem('pwa-ok', '1');
    setVisivel(false);
  }

  if (jaInstalado || !visivel) return null;

  return (
    <>
      {/* ── Banner de instalação ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        background: 'linear-gradient(135deg, #1A0F0D, #2E1A14)',
        borderTop: '2px solid #C9A84C',
        padding: '16px 20px 32px',
        zIndex: 8000,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <img
          src="/icons/icon-96x96.png"
          alt="BarberApp"
          onError={e => e.target.src='/logo-flyguer.png'}
          style={{ width:'56px', height:'56px', borderRadius:'14px', flexShrink:0, boxShadow:'0 4px 16px rgba(0,0,0,0.4)' }}
        />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6', marginBottom:'2px' }}>
            Instalar Aplicativo Oficial
          </div>
          <div style={{ fontSize:'11px', color:'#9A8880' }}>
            Acesso rápido com ícone na tela inicial
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 }}>
          <button onClick={handleInstalar} style={{
            background: 'linear-gradient(135deg,#8B3A2A,#C9A84C)',
            border: 'none', borderRadius: '10px',
            padding: '10px 16px', color: '#1A0F0D',
            fontSize: '13px', fontWeight: '800',
            cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: "'DM Sans',sans-serif",
          }}>
            📲 Instalar
          </button>
          <button onClick={dispensar} style={{
            background: 'transparent', border: 'none',
            color: '#555', fontSize: '11px', cursor: 'pointer',
            textAlign: 'center',
          }}>
            Agora não
          </button>
        </div>
      </div>

      {/* ── Guia iOS ── */}
      {guiaIOS && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#1A0F0D', borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: '430px',
            padding: '28px 24px 48px',
            border: '1px solid #3A2018', borderBottom: 'none',
          }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <img src="/icons/icon-128x128.png" alt="" onError={e=>e.target.src='/logo-flyguer.png'}
                style={{ width:'80px', height:'80px', borderRadius:'20px', marginBottom:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }} />
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A', fontWeight:'700' }}>
                Instalar no iPhone
              </div>
              <div style={{ fontSize:'13px', color:'#9A8880', marginTop:'6px' }}>
                3 passos simples:
              </div>
            </div>

            {[
              { n:'1', icon:'⬆️', text:'Toque no botão Compartilhar na barra do Safari' },
              { n:'2', icon:'➕', text:'Role para baixo e toque em "Adicionar à Tela de Início"' },
              { n:'3', icon:'✅', text:'Toque em "Adicionar" no canto superior direito' },
            ].map(s => (
              <div key={s.n} style={{
                display:'flex', alignItems:'center', gap:'14px',
                background:'#231410', borderRadius:'14px',
                padding:'14px 16px', marginBottom:'10px',
              }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:'13px', color:'#F5EFE6', lineHeight:'1.5' }}>{s.text}</div>
              </div>
            ))}

            <button
              onClick={() => { setGuiaIOS(false); dispensar(); }}
              style={{ marginTop:'16px', width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontWeight:'700', fontSize:'14px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
            >
              Entendi! ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}
