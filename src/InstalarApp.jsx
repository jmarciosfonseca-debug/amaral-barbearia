// InstalarApp.jsx — Flyguer BarberShop
// ✅ Banner de instalação PWA — "Adicionar à tela inicial"

import React from 'react';

export default function InstalarApp({ dark }) {
  const [mostrar, setMostrar] = React.useState(false);
  const [instalado, setInstalado] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  React.useEffect(() => {
    // Verificar se já está instalado como PWA
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) { setInstalado(true); return; }

    // Verificar se já foi dispensado
    const dispensado = localStorage.getItem('pwa-dispensado');
    if (dispensado) return;

    // iOS — não tem beforeinstallprompt, mostra guia manual
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      setTimeout(() => setMostrar(true), 3000);
      return;
    }

    // Android/Chrome — usa evento beforeinstallprompt
    if (window.__pwaPrompt) {
      setTimeout(() => setMostrar(true), 3000);
    } else {
      window.addEventListener('beforeinstallprompt', () => {
        setTimeout(() => setMostrar(true), 3000);
      });
    }
  }, []);

  async function handleInstalar() {
    if (isIOS) { setShowIOSGuide(true); return; }
    const prompt = window.__pwaPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalado(true);
    setMostrar(false);
  }

  function dispensar() {
    localStorage.setItem('pwa-dispensado', '1');
    setMostrar(false);
  }

  if (instalado || !mostrar) return null;

  return (
    <>
      {/* Banner de instalação */}
      <div style={{
        position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: '398px',
        background: 'linear-gradient(135deg,#1A0F0D,#2E1A14)',
        border: '1px solid #C9A84C', borderRadius: '16px',
        padding: '14px 16px', zIndex: 9000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <img src="/icons/icon-72x72.png" alt="BarberApp"
          style={{ width:'48px', height:'48px', borderRadius:'12px', flexShrink:0 }}
          onError={e => e.target.src='/logo-flyguer.png'} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:'700', fontSize:'13px', color:'#F5EFE6' }}>Instalar Flyguer BarberShop</div>
          <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>Acesso rápido direto do celular</div>
        </div>
        <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
          <button onClick={dispensar} style={{ background:'transparent', border:'1px solid #3A2018', borderRadius:'8px', padding:'6px 10px', color:'#9A8880', fontSize:'12px', cursor:'pointer' }}>
            Agora não
          </button>
          <button onClick={handleInstalar} style={{ background:'linear-gradient(135deg,#8B3A2A,#C9A84C)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
            Instalar
          </button>
        </div>
      </div>

      {/* Guia iOS */}
      {showIOSGuide && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9001, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'#1A0F0D', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:'430px', padding:'28px 24px 40px', border:'1px solid #3A2018', borderBottom:'none', textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>📱</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#E8C96A', marginBottom:'8px' }}>Instalar no iPhone</div>
            <div style={{ fontSize:'13px', color:'#9A8880', marginBottom:'20px' }}>Siga os passos abaixo:</div>
            {[
              { icon:'1️⃣', text:'Toque no botão Compartilhar (□↑) na barra do Safari' },
              { icon:'2️⃣', text:'Role para baixo e toque em "Adicionar à Tela de Início"' },
              { icon:'3️⃣', text:'Toque em "Adicionar" no canto superior direito' },
            ].map(s => (
              <div key={s.icon} style={{ display:'flex', alignItems:'center', gap:'12px', background:'#231410', borderRadius:'12px', padding:'12px 14px', marginBottom:'8px', textAlign:'left' }}>
                <span style={{ fontSize:'20px' }}>{s.icon}</span>
                <span style={{ fontSize:'13px', color:'#F5EFE6' }}>{s.text}</span>
              </div>
            ))}
            <button onClick={() => { setShowIOSGuide(false); setMostrar(false); localStorage.setItem('pwa-dispensado','1'); }}
              style={{ marginTop:'16px', width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontWeight:'700', fontSize:'14px', cursor:'pointer' }}>
              Entendi!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
