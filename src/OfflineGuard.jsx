// OfflineGuard.jsx — Flyguer BarberShop
// ✅ Escudo anti-bug: offline, tela preta, sem conexão, fallback geral

import React from 'react';

// ── Hook de conexão ──────────────────────────────────────────
export function useOnline() {
  const [online, setOnline] = React.useState(navigator.onLine);
  React.useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

// ── Banner offline ───────────────────────────────────────────
export function BannerOffline() {
  const online = useOnline();
  const [mostrar, setMostrar] = React.useState(false);

  React.useEffect(() => {
    if (!online) setMostrar(true);
    else setTimeout(() => setMostrar(false), 2000);
  }, [online]);

  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '430px', zIndex: 9999,
      background: online ? 'linear-gradient(135deg,#2E7D7A,#3A9E9A)' : 'linear-gradient(135deg,#8B0000,#F44336)',
      color: '#fff', padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '13px', fontWeight: '600',
      transition: 'all 0.3s',
    }}>
      <span>{online ? '✅' : '📵'}</span>
      <span>{online ? 'Conexão restaurada!' : 'Sem conexão — modo offline'}</span>
    </div>
  );
}

// ── ErrorBoundary Global ─────────────────────────────────────
export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, tentativas: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('🚨 GlobalErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#1A0F0D', color: '#F5EFE6',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize: '22px', color: '#C9A84C', marginBottom: '8px' }}>
            Algo deu errado
          </div>
          <div style={{ fontSize: '13px', color: '#9A8880', marginBottom: '8px', maxWidth: '280px' }}>
            {this.state.error?.message || 'Erro inesperado no aplicativo.'}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexDirection: 'column', width: '100%', maxWidth: '280px' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null, tentativas: this.state.tentativas + 1 })}
              style={{ padding: '14px', background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '12px', color: '#F5EFE6', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              🔄 Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '14px', background: '#231410', border: '1px solid #3A2018', borderRadius: '12px', color: '#9A8880', fontSize: '14px', cursor: 'pointer' }}>
              🔃 Recarregar app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Loading Skeleton ─────────────────────────────────────────
export function LoadingSkeleton({ linhas = 3 }) {
  return (
    <div style={{ padding: '16px' }}>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} style={{ marginBottom: '12px' }}>
          <div style={{
            height: i === 0 ? '20px' : '14px',
            width: i === 0 ? '60%' : `${70 + Math.random() * 20}%`,
            background: 'linear-gradient(90deg,#231410 25%,#2E1A14 50%,#231410 75%)',
            backgroundSize: '200% 100%',
            borderRadius: '8px',
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

// ── Tela sem conexão completa ────────────────────────────────
export function TelaSemConexao({ onTentar }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#1A0F0D',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>📵</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize: '22px', color: '#E8C96A', marginBottom: '8px' }}>
        Sem conexão
      </div>
      <div style={{ fontSize: '13px', color: '#9A8880', marginBottom: '24px', maxWidth: '260px' }}>
        Verifique sua internet e tente novamente. Seus dados estão seguros.
      </div>
      <button onClick={onTentar}
        style={{ padding: '14px 28px', background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '12px', color: '#F5EFE6', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
        🔄 Tentar novamente
      </button>
    </div>
  );
}
