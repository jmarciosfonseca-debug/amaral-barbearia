// GestaoEquipe.jsx — Flyguer BarberShop
// ─────────────────────────────────────────────────────────────
// Passo 5: Gestão da Equipe
// GERENTE: lista, edita, ativa/inativa, define PIN inicial
// BARBEIRO: vê próprio perfil, muda disponibilidade, troca PIN
// Salva em: Firestore /barbeiros/{id}
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, PERFIL, COLORS } from './getStyles';

// ─────────────────────────────────────────────────────────────
// DADOS INICIAIS — usados na primeira carga
// ─────────────────────────────────────────────────────────────
const BARBEIROS_INICIAIS = [
  {
    id:         'b1',
    nome:       'Amaral',
    cargo:      'Gerente · Barbeiro',
    perfil:     PERFIL.GERENTE,
    whatsapp:   '11939089988',
    pin:        '12345',
    ativo:      true,
    disponivel: true,
    foto:       null,
    criadoEm:   null,
  },
  {
    id:         'b2',
    nome:       'Jotace',
    cargo:      'Barbeiro',
    perfil:     PERFIL.BARBEIRO,
    whatsapp:   '11981978541',
    pin:        '12345',
    ativo:      true,
    disponivel: true,
    foto:       null,
    criadoEm:   null,
  },
  {
    id:         'b3',
    nome:       'Júnior',
    cargo:      'Barbeiro',
    perfil:     PERFIL.BARBEIRO,
    whatsapp:   '11982429156',
    pin:        '12345',
    ativo:      true,
    disponivel: false,
    foto:       null,
    criadoEm:   null,
  },
];

// ─────────────────────────────────────────────────────────────
// COMPONENTES UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

function Avatar({ barbeiro, size = 56 }) {
  const iniciais = barbeiro.nome.charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: barbeiro.ativo
        ? 'linear-gradient(135deg, #5C2218, #8B3A2A)'
        : '#2E1A14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '700', color: '#F5EFE6',
      flexShrink: 0, overflow: 'hidden',
      border: barbeiro.disponivel && barbeiro.ativo
        ? '2px solid #4CAF50'
        : '2px solid #3A2018',
      position: 'relative',
    }}>
      {barbeiro.foto
        ? <img src={barbeiro.foto} alt={barbeiro.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : iniciais
      }
      {/* Indicador de disponibilidade */}
      <div style={{
        position: 'absolute', bottom: 2, right: 2,
        width: size * 0.22, height: size * 0.22,
        borderRadius: '50%',
        background: !barbeiro.ativo ? '#555'
          : barbeiro.disponivel ? '#4CAF50' : '#FFC107',
        border: '2px solid #1A0F0D',
      }} />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: '44px', height: '24px', borderRadius: '12px',
      background: value ? '#8B3A2A' : '#3A2018',
      position: 'relative', cursor: 'pointer',
      transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: value ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: value ? '#F5EFE6' : '#9A8880',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#231410', borderRadius: '16px',
      padding: '16px', border: '1px solid #3A2018',
      marginBottom: '12px', ...style,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: EDITAR BARBEIRO (apenas gerente)
// ─────────────────────────────────────────────────────────────
function ModalEditarBarbeiro({ barbeiro, onSalvar, onFechar }) {
  const [dados, setDados] = React.useState({ ...barbeiro });
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState('');

  async function handleSalvar() {
    if (!dados.nome.trim()) { setErro('Nome obrigatório'); return; }
    setSalvando(true);
    try {
      await setDoc(doc(db, 'barbeiros', dados.id), {
        ...dados,
        atualizadoEm: serverTimestamp(),
      }, { merge: true });
      onSalvar(dados);
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const inputStyle = {
    width: '100%', background: '#2E1A14', border: '1px solid #3A2018',
    borderRadius: '10px', padding: '10px 12px', color: '#F5EFE6',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 999, padding: '0',
    }}>
      <div style={{
        background: '#1A0F0D', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: '430px', padding: '24px 20px 40px',
        border: '1px solid #3A2018', borderBottom: 'none',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>
            ✏️ Editar Barbeiro
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Avatar placeholder */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Avatar barbeiro={dados} size={80} />
          <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '8px' }}>
            Foto será adicionada em breve
          </div>
        </div>

        {/* Nome */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Nome</label>
          <input style={inputStyle} value={dados.nome} onChange={e => setDados(d => ({ ...d, nome: e.target.value }))} />
        </div>

        {/* Cargo */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Cargo</label>
          <input style={inputStyle} value={dados.cargo} onChange={e => setDados(d => ({ ...d, cargo: e.target.value }))} />
        </div>

        {/* WhatsApp */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>WhatsApp (com DDD)</label>
          <input style={inputStyle} type="tel" value={dados.whatsapp} onChange={e => setDados(d => ({ ...d, whatsapp: e.target.value }))} placeholder="11999999999" />
        </div>

        {/* PIN */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>PIN de acesso</label>
          <input style={inputStyle} type="password" value={dados.pin} onChange={e => setDados(d => ({ ...d, pin: e.target.value }))} placeholder="5 dígitos" maxLength={5} />
          <div style={{ fontSize: '10px', color: '#9A8880', marginTop: '4px' }}>
            PIN padrão: 12345 — o barbeiro deve trocar após o primeiro acesso
          </div>
        </div>

        {/* Toggles */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>Ativo</div>
              <div style={{ fontSize: '11px', color: '#9A8880' }}>Aparece no app para clientes</div>
            </div>
            <Toggle value={dados.ativo} onChange={v => setDados(d => ({ ...d, ativo: v }))} />
          </div>
          <div style={{ height: '1px', background: '#3A2018', margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>Disponível agora</div>
              <div style={{ fontSize: '11px', color: '#9A8880' }}>Aceita novos agendamentos</div>
            </div>
            <Toggle value={dados.disponivel} onChange={v => setDados(d => ({ ...d, disponivel: v }))} />
          </div>
        </Card>

        {erro && <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>{erro}</div>}

        <button
          onClick={handleSalvar}
          disabled={salvando}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
            color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
            cursor: salvando ? 'wait' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {salvando ? '⏳ Salvando...' : '💾 Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: TROCAR PIN (barbeiro troca o próprio PIN)
// ─────────────────────────────────────────────────────────────
function ModalTrocarPIN({ barbeiro, onSalvar, onFechar }) {
  const [pinAtual, setPinAtual]   = React.useState('');
  const [pinNovo, setPinNovo]     = React.useState('');
  const [pinConf, setPinConf]     = React.useState('');
  const [salvando, setSalvando]   = React.useState(false);
  const [erro, setErro]           = React.useState('');
  const [ok, setOk]               = React.useState(false);

  async function handleTrocar() {
    setErro('');
    if (pinAtual !== barbeiro.pin) { setErro('PIN atual incorreto.'); return; }
    if (pinNovo.length < 4)        { setErro('PIN deve ter pelo menos 4 dígitos.'); return; }
    if (pinNovo !== pinConf)       { setErro('PINs novos não coincidem.'); return; }
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'barbeiros', barbeiro.id), {
        pin: pinNovo,
        atualizadoEm: serverTimestamp(),
      });
      setOk(true);
      setTimeout(() => { onSalvar({ ...barbeiro, pin: pinNovo }); }, 1500);
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const inputStyle = {
    width: '100%', background: '#2E1A14', border: '1px solid #3A2018',
    borderRadius: '10px', padding: '10px 12px', color: '#F5EFE6',
    fontSize: '18px', outline: 'none', boxSizing: 'border-box',
    letterSpacing: '6px', textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{
        background: '#1A0F0D', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: '430px', padding: '24px 20px 40px',
        border: '1px solid #3A2018', borderBottom: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>
            🔑 Trocar PIN
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {ok ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ color: '#4CAF50', fontSize: '16px', fontWeight: '600' }}>PIN atualizado com sucesso!</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>PIN atual</label>
              <input style={inputStyle} type="password" value={pinAtual} onChange={e => setPinAtual(e.target.value)} maxLength={5} placeholder="••••" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Novo PIN</label>
              <input style={inputStyle} type="password" value={pinNovo} onChange={e => setPinNovo(e.target.value)} maxLength={5} placeholder="••••" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Confirmar novo PIN</label>
              <input style={inputStyle} type="password" value={pinConf} onChange={e => setPinConf(e.target.value)} maxLength={5} placeholder="••••" />
            </div>

            {erro && <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>{erro}</div>}

            <button
              onClick={handleTrocar}
              disabled={salvando}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
                color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
                cursor: salvando ? 'wait' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {salvando ? '⏳ Salvando...' : '🔑 Confirmar troca de PIN'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function GestaoEquipe({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const isGerente = usuario?.perfil === PERFIL.GERENTE;

  const [barbeiros, setBarbeiros]       = React.useState([]);
  const [carregando, setCarregando]     = React.useState(true);
  const [editando, setEditando]         = React.useState(null);   // barbeiro sendo editado
  const [trocandoPin, setTrocandoPin]   = React.useState(null);   // barbeiro trocando PIN
  const [salvandoDisp, setSalvandoDisp] = React.useState(null);   // id salvando disponibilidade

  // ── Carregar barbeiros do Firestore ───────────────────────
  React.useEffect(() => {
    async function carregar() {
      try {
        const snap = await getDocs(collection(db, 'barbeiros'));
        if (snap.empty) {
          // Primeira vez — popula com dados iniciais
          await Promise.all(
            BARBEIROS_INICIAIS.map(b =>
              setDoc(doc(db, 'barbeiros', b.id), {
                ...b,
                criadoEm: serverTimestamp(),
              })
            )
          );
          setBarbeiros(BARBEIROS_INICIAIS);
        } else {
          setBarbeiros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.error('Erro ao carregar barbeiros:', e);
        setBarbeiros(BARBEIROS_INICIAIS);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // ── Atualizar disponibilidade (barbeiro faz isso sozinho) ─
  async function toggleDisponivel(barbeiro) {
    setSalvandoDisp(barbeiro.id);
    const novoValor = !barbeiro.disponivel;
    try {
      await updateDoc(doc(db, 'barbeiros', barbeiro.id), {
        disponivel: novoValor,
        atualizadoEm: serverTimestamp(),
      });
      setBarbeiros(bs => bs.map(b => b.id === barbeiro.id ? { ...b, disponivel: novoValor } : b));
    } catch (e) {
      console.error('Erro ao atualizar disponibilidade:', e);
    } finally {
      setSalvandoDisp(null);
    }
  }

  // ── Após edição do gerente ────────────────────────────────
  function handleSalvarEdicao(dadosAtualizados) {
    setBarbeiros(bs => bs.map(b => b.id === dadosAtualizados.id ? dadosAtualizados : b));
    setEditando(null);
  }

  // ── Após troca de PIN ─────────────────────────────────────
  function handleSalvarPIN(dadosAtualizados) {
    setBarbeiros(bs => bs.map(b => b.id === dadosAtualizados.id ? dadosAtualizados : b));
    setTrocandoPin(null);
  }

  // ── Loading ───────────────────────────────────────────────
  if (carregando) {
    return (
      <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
          <div style={{ color: '#9A8880', fontSize: '13px' }}>Carregando equipe...</div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}
        >
          ←
        </button>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>
            👥 {isGerente ? 'Gestão da Equipe' : 'Meu Perfil'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>
            {isGerente ? 'Gerencie barbeiros e recepção' : 'Edite sua disponibilidade e PIN'}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Gerente: lista todos | Barbeiro: vê só o próprio */}
        {(isGerente ? barbeiros : barbeiros.filter(b => b.id === usuario?.id)).map(barbeiro => (
          <Card key={barbeiro.id} style={{ opacity: barbeiro.ativo ? 1 : 0.6 }}>

            {/* Linha principal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
              <Avatar barbeiro={barbeiro} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#F5EFE6' }}>{barbeiro.nome}</span>
                  {barbeiro.perfil === PERFIL.GERENTE && (
                    <span style={{ fontSize: '10px', background: 'rgba(201,168,76,0.2)', color: '#E8C96A', padding: '2px 8px', borderRadius: '10px' }}>👑 Gerente</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#9A8880', marginTop: '2px' }}>{barbeiro.cargo}</div>
                <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '2px' }}>
                  📞 {barbeiro.whatsapp || 'Não informado'}
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600',
                background: barbeiro.ativo ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
                color: barbeiro.ativo ? '#4CAF50' : '#F44336',
              }}>
                {barbeiro.ativo ? '✓ Ativo' : '✗ Inativo'}
              </div>
              <div style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600',
                background: barbeiro.disponivel ? 'rgba(76,175,80,0.15)' : 'rgba(255,193,7,0.15)',
                color: barbeiro.disponivel ? '#4CAF50' : '#FFC107',
              }}>
                {barbeiro.disponivel ? '● Disponível' : '● Ocupado'}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: '8px' }}>

              {/* Disponibilidade — qualquer um pode mudar a própria */}
              {(isGerente || barbeiro.id === usuario?.id) && (
                <button
                  onClick={() => toggleDisponivel(barbeiro)}
                  disabled={salvandoDisp === barbeiro.id}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                    background: barbeiro.disponivel
                      ? 'rgba(255,193,7,0.15)' : 'rgba(76,175,80,0.15)',
                    color: barbeiro.disponivel ? '#FFC107' : '#4CAF50',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {salvandoDisp === barbeiro.id ? '...'
                    : barbeiro.disponivel ? '⏸ Ficar Ocupado' : '▶ Ficar Disponível'}
                </button>
              )}

              {/* Trocar PIN — qualquer um pode trocar o próprio */}
              {(isGerente || barbeiro.id === usuario?.id) && (
                <button
                  onClick={() => setTrocandoPin(barbeiro)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', border: '1px solid #3A2018',
                    background: '#2E1A14', color: '#9A8880',
                    fontSize: '12px', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  🔑 PIN
                </button>
              )}

              {/* Editar — apenas gerente */}
              {isGerente && (
                <button
                  onClick={() => setEditando(barbeiro)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
                    color: '#F5EFE6', fontSize: '12px', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ✏️ Editar
                </button>
              )}
            </div>

          </Card>
        ))}

        {/* Info PIN padrão */}
        <div style={{
          background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)',
          borderRadius: '12px', padding: '12px 14px',
          fontSize: '12px', color: '#FFC107',
          display: 'flex', gap: '8px', alignItems: 'flex-start',
        }}>
          <span>⚠️</span>
          <span>PIN padrão inicial: <strong>12345</strong> — cada barbeiro deve trocar após o primeiro acesso usando o botão 🔑 PIN.</span>
        </div>

      </div>

      {/* Modais */}
      {editando && (
        <ModalEditarBarbeiro
          barbeiro={editando}
          onSalvar={handleSalvarEdicao}
          onFechar={() => setEditando(null)}
        />
      )}

      {trocandoPin && (
        <ModalTrocarPIN
          barbeiro={trocandoPin}
          onSalvar={handleSalvarPIN}
          onFechar={() => setTrocandoPin(null)}
        />
      )}

    </div>
  );
}
