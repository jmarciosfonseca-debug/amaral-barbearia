// GestaoEquipe.jsx — Flyguer BarberShop
// ✅ NOVO: Modal para adicionar barbeiro
// ✅ MANTIDO: Editar, PIN, disponibilidade

import React from 'react';
import { db } from './firebase';
import {
  collection, doc, getDocs,
  setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, PERFIL } from './getStyles';

const BARBEIROS_INICIAIS = [
  { id: 'b1', nome: 'Amaral', cargo: 'Gerente · Barbeiro', perfil: PERFIL.GERENTE,  whatsapp: '11939089988', pin: '12345', ativo: true, disponivel: true,  foto: null },
  { id: 'b2', nome: 'Jotace', cargo: 'Barbeiro',           perfil: PERFIL.BARBEIRO, whatsapp: '11981978541', pin: '12345', ativo: true, disponivel: true,  foto: null },
  { id: 'b3', nome: 'Júnior', cargo: 'Barbeiro',           perfil: PERFIL.BARBEIRO, whatsapp: '11982429156', pin: '12345', ativo: true, disponivel: false, foto: null },
];

function Avatar({ barbeiro, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: barbeiro.ativo ? 'linear-gradient(135deg, #5C2218, #8B3A2A)' : '#2E1A14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '700', color: '#F5EFE6',
      flexShrink: 0, overflow: 'hidden',
      border: barbeiro.disponivel && barbeiro.ativo ? '2px solid #4CAF50' : '2px solid #3A2018',
      position: 'relative',
    }}>
      {barbeiro.foto
        ? <img src={barbeiro.foto} alt={barbeiro.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : barbeiro.nome?.charAt(0).toUpperCase()
      }
      <div style={{
        position: 'absolute', bottom: 2, right: 2,
        width: size * 0.22, height: size * 0.22, borderRadius: '50%',
        background: !barbeiro.ativo ? '#555' : barbeiro.disponivel ? '#4CAF50' : '#FFC107',
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
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px', left: value ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: value ? '#F5EFE6' : '#9A8880', transition: 'left 0.2s',
      }} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#231410', borderRadius: '16px', padding: '16px', border: '1px solid #3A2018', marginBottom: '12px', ...style }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', background: '#2E1A14', border: '1px solid #3A2018',
  borderRadius: '10px', padding: '10px 12px', color: '#F5EFE6',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'DM Sans', sans-serif",
};

// ─────────────────────────────────────────────────────────────
// MODAL: ADICIONAR NOVO BARBEIRO ✅ NOVO
// ─────────────────────────────────────────────────────────────
function ModalNovoBarbeiro({ onSalvar, onFechar }) {
  const [dados, setDados] = React.useState({
    nome: '', cargo: 'Barbeiro', whatsapp: '', pin: '12345',
    perfil: PERFIL.BARBEIRO, ativo: true, disponivel: true, foto: null,
  });
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');

  async function handleSalvar() {
    if (!dados.nome.trim())       { setErro('Nome obrigatório'); return; }
    if (!dados.whatsapp.trim())   { setErro('WhatsApp obrigatório'); return; }
    if (dados.pin.length < 4)     { setErro('PIN deve ter pelo menos 4 dígitos'); return; }
    setSalvando(true);
    try {
      // Gera ID único baseado no nome
      const id = 'b_' + Date.now();
      await setDoc(doc(db, 'barbeiros', id), {
        ...dados,
        id,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      onSalvar({ ...dados, id });
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#1A0F0D', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '430px', padding: '24px 20px 40px', border: '1px solid #3A2018', borderBottom: 'none', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>➕ Novo Barbeiro</div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {[
          { label: 'Nome *', campo: 'nome', placeholder: 'Nome completo', type: 'text' },
          { label: 'Cargo', campo: 'cargo', placeholder: 'Ex: Barbeiro, Sócio...', type: 'text' },
          { label: 'WhatsApp * (com DDD)', campo: 'whatsapp', placeholder: '11999999999', type: 'tel' },
        ].map(f => (
          <div key={f.campo} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <input type={f.type} style={inputStyle} placeholder={f.placeholder}
              value={dados[f.campo]} onChange={e => setDados(d => ({ ...d, [f.campo]: e.target.value }))} />
          </div>
        ))}

        {/* PIN inicial */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>PIN inicial *</label>
          <input type="password" style={inputStyle} value={dados.pin} maxLength={5}
            onChange={e => setDados(d => ({ ...d, pin: e.target.value }))} placeholder="Mínimo 4 dígitos" />
          <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>O barbeiro pode trocar após o primeiro acesso</div>
        </div>

        {/* Perfil */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '8px' }}>Perfil</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: PERFIL.BARBEIRO, label: '✂️ Barbeiro' },
              { id: PERFIL.GERENTE,  label: '👑 Gerente'  },
            ].map(p => (
              <button key={p.id} onClick={() => setDados(d => ({ ...d, perfil: p.id }))} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: dados.perfil === p.id ? '2px solid #8B3A2A' : '1px solid #3A2018',
                background: dados.perfil === p.id ? 'rgba(139,58,42,0.2)' : '#231410',
                color: dados.perfil === p.id ? '#E8C96A' : '#9A8880',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>{p.label}</button>
            ))}
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

        <button onClick={handleSalvar} disabled={salvando} style={{
          width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
          color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
          cursor: salvando ? 'wait' : 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {salvando ? '⏳ Salvando...' : '✅ Adicionar Barbeiro'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: EDITAR BARBEIRO
// ─────────────────────────────────────────────────────────────
function ModalEditarBarbeiro({ barbeiro, onSalvar, onFechar }) {
  const [dados, setDados]     = React.useState({ ...barbeiro });
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');

  async function handleSalvar() {
    if (!dados.nome.trim()) { setErro('Nome obrigatório'); return; }
    setSalvando(true);
    try {
      await setDoc(doc(db, 'barbeiros', dados.id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      onSalvar(dados);
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
    } finally { setSalvando(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#1A0F0D', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '430px', padding: '24px 20px 40px', border: '1px solid #3A2018', borderBottom: 'none', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>✏️ Editar Barbeiro</div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Avatar barbeiro={dados} size={80} />
          <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '8px' }}>Foto será adicionada em breve</div>
        </div>

        {[
          { label: 'Nome', campo: 'nome', type: 'text' },
          { label: 'Cargo', campo: 'cargo', type: 'text' },
          { label: 'WhatsApp (com DDD)', campo: 'whatsapp', type: 'tel', placeholder: '11999999999' },
        ].map(f => (
          <div key={f.campo} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <input type={f.type} style={inputStyle} value={dados[f.campo] || ''} placeholder={f.placeholder || ''}
              onChange={e => setDados(d => ({ ...d, [f.campo]: e.target.value }))} />
          </div>
        ))}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>PIN de acesso</label>
          <input type="password" style={inputStyle} value={dados.pin || ''} maxLength={5}
            onChange={e => setDados(d => ({ ...d, pin: e.target.value }))} placeholder="5 dígitos" />
          <div style={{ fontSize: '10px', color: '#9A8880', marginTop: '4px' }}>PIN padrão: 12345 — o barbeiro deve trocar após o primeiro acesso</div>
        </div>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div><div style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>Ativo</div><div style={{ fontSize: '11px', color: '#9A8880' }}>Aparece no app para clientes</div></div>
            <Toggle value={dados.ativo} onChange={v => setDados(d => ({ ...d, ativo: v }))} />
          </div>
          <div style={{ height: '1px', background: '#3A2018', margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>Disponível agora</div><div style={{ fontSize: '11px', color: '#9A8880' }}>Aceita novos agendamentos</div></div>
            <Toggle value={dados.disponivel} onChange={v => setDados(d => ({ ...d, disponivel: v }))} />
          </div>
        </Card>

        {erro && <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>{erro}</div>}

        <button onClick={handleSalvar} disabled={salvando} style={{
          width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
          color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
          cursor: salvando ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          {salvando ? '⏳ Salvando...' : '💾 Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: TROCAR PIN
// ─────────────────────────────────────────────────────────────
function ModalTrocarPIN({ barbeiro, onSalvar, onFechar }) {
  const [pinAtual, setPinAtual] = React.useState('');
  const [pinNovo, setPinNovo]   = React.useState('');
  const [pinConf, setPinConf]   = React.useState('');
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');
  const [ok, setOk]             = React.useState(false);

  const pinInputStyle = { ...inputStyle, fontSize: '18px', letterSpacing: '6px', textAlign: 'center' };

  async function handleTrocar() {
    setErro('');
    if (pinAtual !== barbeiro.pin)  { setErro('PIN atual incorreto.'); return; }
    if (pinNovo.length < 4)         { setErro('PIN deve ter pelo menos 4 dígitos.'); return; }
    if (pinNovo !== pinConf)        { setErro('PINs novos não coincidem.'); return; }
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'barbeiros', barbeiro.id), { pin: pinNovo, atualizadoEm: serverTimestamp() });
      setOk(true);
      setTimeout(() => onSalvar({ ...barbeiro, pin: pinNovo }), 1500);
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
    } finally { setSalvando(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#1A0F0D', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '430px', padding: '24px 20px 40px', border: '1px solid #3A2018', borderBottom: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>🔑 Trocar PIN</div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        {ok ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ color: '#4CAF50', fontSize: '16px', fontWeight: '600' }}>PIN atualizado com sucesso!</div>
          </div>
        ) : (
          <>
            {[
              { label: 'PIN atual', val: pinAtual, set: setPinAtual },
              { label: 'Novo PIN', val: pinNovo,   set: setPinNovo },
              { label: 'Confirmar novo PIN', val: pinConf, set: setPinConf },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input type="password" style={pinInputStyle} value={f.val} onChange={e => f.set(e.target.value)} maxLength={5} placeholder="••••" />
              </div>
            ))}
            {erro && <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>{erro}</div>}
            <button onClick={handleTrocar} disabled={salvando} style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
              color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
              cursor: salvando ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
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
  const [editando, setEditando]         = React.useState(null);
  const [trocandoPin, setTrocandoPin]   = React.useState(null);
  const [adicionando, setAdicionando]   = React.useState(false); // ✅ NOVO
  const [salvandoDisp, setSalvandoDisp] = React.useState(null);

  React.useEffect(() => {
    async function carregar() {
      try {
        const snap = await getDocs(collection(db, 'barbeiros'));
        if (snap.empty) {
          await Promise.all(BARBEIROS_INICIAIS.map(b => setDoc(doc(db, 'barbeiros', b.id), { ...b, criadoEm: serverTimestamp() })));
          setBarbeiros(BARBEIROS_INICIAIS);
        } else {
          setBarbeiros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.error(e);
        setBarbeiros(BARBEIROS_INICIAIS);
      } finally { setCarregando(false); }
    }
    carregar();
  }, []);

  const [excluindo, setExcluindo] = React.useState(null);

  async function handleExcluir(barbeiro) {
    if (barbeiro.perfil === PERFIL.GERENTE) return;
    try {
      await updateDoc(doc(db, 'barbeiros', barbeiro.id), {
        ativo: false,
        excluidoEm: serverTimestamp(),
      });
      setBarbeiros(bs => bs.filter(b => b.id !== barbeiro.id));
    } catch (e) { console.error(e); }
    finally { setExcluindo(null); }
  }

  async function toggleDisponivel(barbeiro) {
    setSalvandoDisp(barbeiro.id);
    const novoValor = !barbeiro.disponivel;
    try {
      await updateDoc(doc(db, 'barbeiros', barbeiro.id), { disponivel: novoValor, atualizadoEm: serverTimestamp() });
      setBarbeiros(bs => bs.map(b => b.id === barbeiro.id ? { ...b, disponivel: novoValor } : b));
    } catch (e) { console.error(e); }
    finally { setSalvandoDisp(null); }
  }

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

  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #5C2218, #8B3A2A)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>
            👥 {isGerente ? 'Gestão da Equipe' : 'Meu Perfil'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>
            {isGerente ? `${barbeiros.filter(b => b.ativo).length} barbeiros ativos` : 'Edite sua disponibilidade e PIN'}
          </div>
        </div>
        {/* ✅ Botão adicionar — só gerente */}
        {isGerente && (
          <button onClick={() => setAdicionando(true)} style={{
            background: 'rgba(245,239,230,0.15)', border: '1px solid rgba(245,239,230,0.3)',
            borderRadius: '10px', padding: '8px 12px', color: '#F5EFE6',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            ➕ Novo
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {(isGerente ? barbeiros : barbeiros.filter(b => b.id === usuario?.id)).map(barbeiro => (
          <Card key={barbeiro.id} style={{ opacity: barbeiro.ativo ? 1 : 0.6 }}>
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
                <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '2px' }}>📞 {barbeiro.whatsapp || 'Não informado'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', background: barbeiro.ativo ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)', color: barbeiro.ativo ? '#4CAF50' : '#F44336' }}>
                {barbeiro.ativo ? '✓ Ativo' : '✗ Inativo'}
              </div>
              <div style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', background: barbeiro.disponivel ? 'rgba(76,175,80,0.15)' : 'rgba(255,193,7,0.15)', color: barbeiro.disponivel ? '#4CAF50' : '#FFC107' }}>
                {barbeiro.disponivel ? '● Disponível' : '● Ocupado'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(isGerente || barbeiro.id === usuario?.id) && (
                <button onClick={() => toggleDisponivel(barbeiro)} disabled={salvandoDisp === barbeiro.id} style={{
                  flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                  background: barbeiro.disponivel ? 'rgba(255,193,7,0.15)' : 'rgba(76,175,80,0.15)',
                  color: barbeiro.disponivel ? '#FFC107' : '#4CAF50',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                  {salvandoDisp === barbeiro.id ? '...' : barbeiro.disponivel ? '⏸ Ficar Ocupado' : '▶ Disponível'}
                </button>
              )}
              {(isGerente || barbeiro.id === usuario?.id) && (
                <button onClick={() => setTrocandoPin(barbeiro)} style={{
                  padding: '8px 12px', borderRadius: '10px', border: '1px solid #3A2018',
                  background: '#2E1A14', color: '#9A8880', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>🔑 PIN</button>
              )}
              {isGerente && (
                <button onClick={() => setEditando(barbeiro)} style={{
                  padding: '8px 12px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
                  color: '#F5EFE6', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>✏️ Editar</button>
              )}
              {/* ✅ Excluir — só gerente, não pode excluir a si mesmo */}
              {isGerente && barbeiro.perfil !== PERFIL.GERENTE && (
                <button onClick={() => setExcluindo(barbeiro)} style={{
                  padding: '8px 10px', borderRadius: '10px',
                  border: '1px solid rgba(244,67,54,0.3)',
                  background: 'rgba(244,67,54,0.1)',
                  color: '#F44336', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>🗑️</button>
              )}
            </div>
          </Card>
        ))}

        <div style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: '#FFC107', display: 'flex', gap: '8px' }}>
          <span>⚠️</span>
          <span>PIN padrão inicial: <strong>12345</strong> — cada barbeiro deve trocar após o primeiro acesso.</span>
        </div>
      </div>

      {/* Modais */}
      {/* ✅ Modal confirmação exclusão */}
      {excluindo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div style={{ background: '#1A0F0D', borderRadius: '20px', width: '100%', maxWidth: '360px', padding: '28px 24px', border: '1px solid #3A2018', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#F44336', marginBottom: '8px' }}>
              Remover barbeiro?
            </div>
            <div style={{ fontSize: '14px', color: '#F5EFE6', fontWeight: '600', marginBottom: '6px' }}>{excluindo.nome}</div>
            <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '24px' }}>
              O barbeiro será inativado e não aparecerá mais no app. Os agendamentos existentes não serão afetados.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setExcluindo(null)} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #3A2018',
                background: '#231410', color: '#9A8880', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>Cancelar</button>
              <button onClick={() => handleExcluir(excluindo)} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #8B1A1A, #C62828)',
                color: '#F5EFE6', fontSize: '14px', fontWeight: '700',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>🗑️ Remover</button>
            </div>
          </div>
        </div>
      )}
        <ModalNovoBarbeiro
          onSalvar={novo => { setBarbeiros(bs => [...bs, novo]); setAdicionando(false); }}
          onFechar={() => setAdicionando(false)}
        />
      )}
      {editando && (
        <ModalEditarBarbeiro
          barbeiro={editando}
          onSalvar={atualizado => { setBarbeiros(bs => bs.map(b => b.id === atualizado.id ? atualizado : b)); setEditando(null); }}
          onFechar={() => setEditando(null)}
        />
      )}
      {trocandoPin && (
        <ModalTrocarPIN
          barbeiro={trocandoPin}
          onSalvar={atualizado => { setBarbeiros(bs => bs.map(b => b.id === atualizado.id ? atualizado : b)); setTrocandoPin(null); }}
          onFechar={() => setTrocandoPin(null)}
        />
      )}
    </div>
  );
}
