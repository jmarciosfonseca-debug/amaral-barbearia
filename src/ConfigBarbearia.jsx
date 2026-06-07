// ConfigBarbearia.jsx — Flyguer BarberShop
// ✅ Passo 13 — Pix Avançado: banco, nome beneficiário, tipo chave, preview

import React from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStyles, DIAS_SEMANA } from './getStyles';

const CONFIG_PADRAO = {
  nome:     'Flyguer BarberShop',
  whatsapp: '11977643509',
  pix:      '11939089988',
  pixNome:  'Alisson Ferreira da Silva',
  pixBanco: 'Nubank',
  pixTipo:  'telefone',
  pixCidade:'Sao Paulo',
  endereco: 'Shopping Cidade das Artes — Piso 2, Nº 22',
  horarios: {
    dom: { aberto: false, abertura: '09:00', fechamento: '23:30' },
    seg: { aberto: true,  abertura: '09:00', fechamento: '23:30' },
    ter: { aberto: true,  abertura: '09:00', fechamento: '23:30' },
    qua: { aberto: true,  abertura: '09:00', fechamento: '23:30' },
    qui: { aberto: true,  abertura: '09:00', fechamento: '23:30' },
    sex: { aberto: true,  abertura: '09:00', fechamento: '23:30' },
    sab: { aberto: true,  abertura: '09:00', fechamento: '23:30' },
  },
  almoco: { ativo: true, inicio: '12:00', fim: '13:00' },
};

const SERVICOS_PADRAO = {
  avulsos: [
    { id: 's1', nome: 'Corte',               valor: 45.00, duracao: 30, ativo: true },
    { id: 's2', nome: 'Corte + Sobrancelha', valor: 50.00, duracao: 40, ativo: true },
    { id: 's3', nome: 'Barba',               valor: 35.00, duracao: 25, ativo: true },
    { id: 's4', nome: 'Pezinho',             valor: 20.00, duracao: 15, ativo: true },
    { id: 's5', nome: 'Sobrancelha',         valor: 20.00, duracao: 10, ativo: true },
    { id: 's6', nome: 'Pigmentação',         valor: 35.00, duracao: 20, ativo: true },
  ],
  combos: [
    { id: 'c1', nome: 'Corte + Barba',   valor: 70.00, duracao: 55, ativo: true },
    { id: 'c2', nome: 'Pezinho + Barba', valor: 50.00, duracao: 40, ativo: true },
  ],
  planos: [
    { id: 'p1', nome: 'Bronze', valor: 139.99, cor: '#CD7F32', ativo: true, descricao: '4 cortes + 4 sobrancelhas por mês', beneficios: [] },
    { id: 'p2', nome: 'Prata',  valor: 219.99, cor: '#C0C0C0', ativo: true, descricao: '4 cortes + 4 barbas + 4 sobrancelhas por mês', beneficios: [] },
    { id: 'p3', nome: 'Ouro',   valor: 249.99, cor: '#C9A84C', ativo: true, descricao: '4 cortes + 4 barbas + 4 sobrancelhas', beneficios: ['Abono no estacionamento', '10% de desconto em produtos'] },
  ],
};

const DIAS_KEYS   = ['dom','seg','ter','qua','qui','sex','sab'];
const DIAS_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const ABAS = [
  { id: 'horarios', icon: '🕐', label: 'Horários' },
  { id: 'servicos', icon: '💈', label: 'Serviços' },
  { id: 'planos',   icon: '⭐', label: 'Planos'   },
  { id: 'contato',  icon: '📱', label: 'Contato'  },
];

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: '16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>{title}</span>
      </div>
      {subtitle && <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '3px', marginLeft: '28px' }}>{subtitle}</div>}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: '#231410', borderRadius: '16px', padding: '16px', border: '1px solid #3A2018', marginBottom: '12px', ...style }}>{children}</div>;
}

function Toggle({ value, onChange, label, sublabel }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
      <div>
        {label && <div style={{ fontSize: '14px', color: '#F5EFE6', fontWeight: '500' }}>{label}</div>}
        {sublabel && <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '2px' }}>{sublabel}</div>}
      </div>
      <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: value ? '#8B3A2A' : '#3A2018', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '3px', left: value ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: value ? '#F5EFE6' : '#9A8880', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', prefix }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      {label && <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {prefix && <span style={{ fontSize: '13px', color: '#9A8880', flexShrink: 0 }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '10px', padding: '10px 12px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
      </div>
    </div>
  );
}

function TimeInput({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '8px', padding: '8px 10px', color: '#F5EFE6', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

const servicoInputStyle = { width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '8px', padding: '8px 10px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const selectStyle = { width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '10px', padding: '10px 12px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" };

function ModalNovoServico({ categoria, onSalvar, onFechar }) {
  const [dados, setDados] = React.useState({ nome: '', valor: '', duracao: '' });
  const [erro, setErro]   = React.useState('');

  function handleSalvar() {
    if (!dados.nome.trim())               { setErro('Nome obrigatório'); return; }
    if (!dados.valor || dados.valor <= 0) { setErro('Valor inválido'); return; }
    onSalvar({ id: `${categoria[0]}${Date.now()}`, nome: dados.nome.trim(), valor: parseFloat(dados.valor), duracao: parseInt(dados.duracao) || 30, ativo: true });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#1A0F0D', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '430px', padding: '24px 20px 40px', border: '1px solid #3A2018', borderBottom: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>
            ➕ {categoria === 'avulsos' ? 'Novo Serviço' : 'Novo Combo'}
          </div>
          <button onClick={onFechar} style={{ background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '50%', width: '32px', height: '32px', color: '#F5EFE6', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Nome *</label>
          <input style={{ ...servicoInputStyle, borderRadius: '10px', padding: '10px 12px' }} placeholder="Ex: Hidratação, Relaxamento..." value={dados.nome} onChange={e => setDados(d => ({ ...d, nome: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Valor (R$) *</label>
            <input type="number" style={servicoInputStyle} placeholder="0,00" value={dados.valor} onChange={e => setDados(d => ({ ...d, valor: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Duração (min)</label>
            <input type="number" style={servicoInputStyle} placeholder="30" value={dados.duracao} onChange={e => setDados(d => ({ ...d, duracao: e.target.value }))} />
          </div>
        </div>
        {erro && <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>{erro}</div>}
        <button onClick={handleSalvar} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #5C2218, #8B3A2A)', color: '#F5EFE6', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          ✅ Adicionar
        </button>
      </div>
    </div>
  );
}

export default function ConfigBarbearia({ onBack, onVoltarAgenda, dark, abaInicial = 'horarios' }) {
  const s = getStyles(dark);
  const [abaAtiva, setAbaAtiva]     = React.useState(abaInicial);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando]     = React.useState(false);
  const [salvoOk, setSalvoOk]       = React.useState(false);
  const [erro, setErro]             = React.useState('');
  const [config, setConfig]         = React.useState(CONFIG_PADRAO);
  const [servicos, setServicos]     = React.useState(SERVICOS_PADRAO);
  const [modalServico, setModalServico] = React.useState(null);

  React.useEffect(() => {
    async function carregar() {
      try {
        const [snapConfig, snapServicos] = await Promise.all([
          getDoc(doc(db, 'config', 'barbearia')),
          getDoc(doc(db, 'config', 'servicos')),
        ]);
        if (snapConfig.exists())   setConfig({ ...CONFIG_PADRAO, ...snapConfig.data() });
        if (snapServicos.exists()) setServicos(snapServicos.data());
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, []);

  React.useEffect(() => { setAbaAtiva(abaInicial); }, [abaInicial]);

  async function salvar() {
    setSalvando(true); setErro('');
    try {
      await Promise.all([
        setDoc(doc(db, 'config', 'barbearia'), { ...config, atualizadoEm: serverTimestamp() }),
        setDoc(doc(db, 'config', 'servicos'),  { ...servicos, atualizadoEm: serverTimestamp() }),
      ]);
      setSalvoOk(true);
      setTimeout(() => setSalvoOk(false), 3000);
    } catch (e) { setErro('Erro ao salvar. Tente novamente.'); console.error(e); }
    finally { setSalvando(false); }
  }

  function setHorario(dia, campo, valor) { setConfig(c => ({ ...c, horarios: { ...c.horarios, [dia]: { ...c.horarios[dia], [campo]: valor } } })); }
  function setAlmoco(campo, valor) { setConfig(c => ({ ...c, almoco: { ...c.almoco, [campo]: valor } })); }
  function setServico(categoria, id, campo, valor) { setServicos(sv => ({ ...sv, [categoria]: sv[categoria].map(s => s.id === id ? { ...s, [campo]: valor } : s) })); }
  function setPlano(id, campo, valor) { setServicos(sv => ({ ...sv, planos: sv.planos.map(p => p.id === id ? { ...p, [campo]: valor } : p) })); }
  function adicionarServico(categoria, novo) { setServicos(sv => ({ ...sv, [categoria]: [...(sv[categoria] || []), novo] })); setModalServico(null); }

  if (carregando) {
    return (
      <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
          <div style={{ color: '#9A8880', fontSize: '13px' }}>Carregando configurações...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.app, paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #5C2218, #8B3A2A)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botão Voltar — sempre disponível */}
          <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#F5EFE6', cursor: 'pointer', fontSize: '13px', fontWeight:'600', display:'flex', alignItems:'center', gap:'4px' }}>← Voltar</button>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>
              {abaAtiva === 'servicos' ? '💈 Serviços & Preços' : '⚙️ Configurações'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>Flyguer BarberShop</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Atalho para agenda — só aparece para o gerente */}
          {onVoltarAgenda && (
            <button onClick={onVoltarAgenda}
              style={{ background: 'rgba(232,201,106,0.15)', border: '1px solid rgba(232,201,106,0.4)', borderRadius: '10px', padding: '8px 12px', color: '#E8C96A', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
              📅 Minha Agenda
            </button>
          )}
          <button onClick={salvar} disabled={salvando} style={{ background: salvoOk ? '#2E7D7A' : 'rgba(245,239,230,0.15)', border: '1px solid rgba(245,239,230,0.3)', borderRadius: '10px', padding: '8px 14px', color: '#F5EFE6', fontSize: '13px', fontWeight: '600', cursor: salvando ? 'wait' : 'pointer', transition: 'all 0.3s' }}>
            {salvando ? '...' : salvoOk ? '✅ Salvo!' : '💾 Salvar'}
          </button>
        </div>
      </div>

      {erro && <div style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '10px', padding: '10px 14px', margin: '12px 20px 0', fontSize: '12px', color: '#F44336' }}>⚠️ {erro}</div>}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', borderBottom: '1px solid #3A2018', overflowX: 'auto' }}>
        {ABAS.map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '20px', border: 'none', background: abaAtiva === aba.id ? '#8B3A2A' : '#2E1A14', color: abaAtiva === aba.id ? '#F5EFE6' : '#9A8880', fontSize: '12px', fontWeight: abaAtiva === aba.id ? '600' : '400', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── HORÁRIOS ── */}
        {abaAtiva === 'horarios' && (
          <div>
            <SectionTitle icon="📅" title="Dias de Funcionamento" subtitle="Ative os dias e defina os horários" />
            {DIAS_KEYS.map((dia, i) => {
              const h = config.horarios[dia];
              return (
                <Card key={dia}>
                  <Toggle value={h.aberto} onChange={v => setHorario(dia, 'aberto', v)} label={DIAS_LABELS[i]} sublabel={h.aberto ? `${h.abertura} — ${h.fechamento}` : 'Fechado'} />
                  {h.aberto && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <TimeInput label="Abertura" value={h.abertura} onChange={v => setHorario(dia, 'abertura', v)} />
                      <TimeInput label="Fechamento" value={h.fechamento} onChange={v => setHorario(dia, 'fechamento', v)} />
                    </div>
                  )}
                </Card>
              );
            })}
            <div style={{ marginTop: '8px' }}>
              <SectionTitle icon="🍽️" title="Bloqueio de Almoço" subtitle="Horário bloqueado para agendamentos" />
              <Card>
                <Toggle value={config.almoco.ativo} onChange={v => setAlmoco('ativo', v)} label="Bloquear horário de almoço" sublabel="Nenhum agendamento neste período" />
                {config.almoco.ativo && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <TimeInput label="Início" value={config.almoco.inicio} onChange={v => setAlmoco('inicio', v)} />
                    <TimeInput label="Fim" value={config.almoco.fim} onChange={v => setAlmoco('fim', v)} />
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── SERVIÇOS ── */}
        {abaAtiva === 'servicos' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <SectionTitle icon="✂️" title="Serviços Avulsos" subtitle="Edite valores e duração" />
              <button onClick={() => setModalServico('avulsos')} style={{ background: 'rgba(139,58,42,0.2)', border: '1px solid #8B3A2A', borderRadius: '10px', padding: '6px 12px', color: '#E8C96A', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>➕ Novo</button>
            </div>
            {(servicos.avulsos || []).map(sv => (
              <Card key={sv.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#F5EFE6' }}>{sv.nome}</div>
                  <Toggle value={sv.ativo} onChange={v => setServico('avulsos', sv.id, 'ativo', v)} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                    <input type="number" value={sv.valor} onChange={e => setServico('avulsos', sv.id, 'valor', parseFloat(e.target.value) || 0)} style={servicoInputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Duração (min)</label>
                    <input type="number" value={sv.duracao} onChange={e => setServico('avulsos', sv.id, 'duracao', parseInt(e.target.value) || 0)} style={servicoInputStyle} />
                  </div>
                </div>
              </Card>
            ))}

            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <SectionTitle icon="🤝" title="Combos" subtitle="Pacotes combinados" />
              <button onClick={() => setModalServico('combos')} style={{ background: 'rgba(46,125,122,0.2)', border: '1px solid #2E7D7A', borderRadius: '10px', padding: '6px 12px', color: '#2E7D7A', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>➕ Novo</button>
            </div>
            {(servicos.combos || []).map(sv => (
              <Card key={sv.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#F5EFE6' }}>{sv.nome}</div>
                  <Toggle value={sv.ativo} onChange={v => setServico('combos', sv.id, 'ativo', v)} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                    <input type="number" value={sv.valor} onChange={e => setServico('combos', sv.id, 'valor', parseFloat(e.target.value) || 0)} style={servicoInputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Duração (min)</label>
                    <input type="number" value={sv.duracao} onChange={e => setServico('combos', sv.id, 'duracao', parseInt(e.target.value) || 0)} style={servicoInputStyle} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── PLANOS ── */}
        {abaAtiva === 'planos' && (
          <div>
            <SectionTitle icon="⭐" title="Planos Mensais" subtitle="Assinaturas recorrentes por mês" />
            {(servicos.planos || []).map(pl => (
              <Card key={pl.id} style={{ borderColor: pl.cor + '44' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: pl.cor }} />
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', color: pl.cor }}>Plano {pl.nome}</span>
                  </div>
                  <Toggle value={pl.ativo} onChange={v => setPlano(pl.id, 'ativo', v)} />
                </div>
                <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '12px', background: '#1A0F0D', borderRadius: '8px', padding: '8px 10px' }}>{pl.descricao}</div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Valor mensal (R$)</label>
                  <input type="number" value={pl.valor} onChange={e => setPlano(pl.id, 'valor', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', background: '#2E1A14', border: `1px solid ${pl.cor}44`, borderRadius: '8px', padding: '10px 12px', color: pl.cor, fontSize: '16px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {pl.beneficios?.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', color: '#9A8880', marginBottom: '6px' }}>Benefícios inclusos:</div>
                    {pl.beneficios.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#F5EFE6', marginBottom: '4px' }}>
                        <span style={{ color: pl.cor }}>✓</span> {b}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── CONTATO ── */}
        {abaAtiva === 'contato' && (
          <div>
            <SectionTitle icon="📱" title="Dados de Contato" subtitle="WhatsApp e Pix da barbearia" />

            {/* WhatsApp */}
            <Card>
              <InputField label="WhatsApp da barbearia (com DDD)" value={config.whatsapp} onChange={v => setConfig(c => ({ ...c, whatsapp: v }))} placeholder="11999999999" type="tel" prefix="📞" />
              <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '-4px', marginBottom: '4px' }}>Usado para enviar confirmações de agendamento</div>
            </Card>

            {/* ✅ PIX AVANÇADO */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#820AD1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>💜</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#F5EFE6' }}>Configuração Pix</div>
                  <div style={{ fontSize: '11px', color: '#9A8880' }}>Dados para recebimento antecipado dos clientes</div>
                </div>
              </div>

              {/* Banco */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Banco</label>
                <select value={config.pixBanco || 'Nubank'} onChange={e => setConfig(c => ({ ...c, pixBanco: e.target.value }))} style={selectStyle}>
                  {['Nubank','Itaú','Bradesco','Inter','Caixa','Banco do Brasil','Santander','Sicoob','Outro'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Nome beneficiário */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Nome do beneficiário</label>
                <input value={config.pixNome || ''} onChange={e => setConfig(c => ({ ...c, pixNome: e.target.value }))} placeholder="Nome completo do titular"
                  style={{ width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '10px', padding: '10px 12px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif" }} />
              </div>

              {/* Tipo de chave */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Tipo de chave</label>
                <select value={config.pixTipo || 'telefone'} onChange={e => setConfig(c => ({ ...c, pixTipo: e.target.value }))} style={selectStyle}>
                  <option value="telefone">📱 Telefone</option>
                  <option value="cpf">👤 CPF</option>
                  <option value="cnpj">🏢 CNPJ</option>
                  <option value="email">📧 Email</option>
                  <option value="aleatoria">🔑 Chave aleatória</option>
                </select>
              </div>

              {/* Chave Pix */}
              <InputField label="Chave Pix" value={config.pix} onChange={v => setConfig(c => ({ ...c, pix: v }))} placeholder="Ex: 11939089988" prefix="💳" />
              <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '-4px', marginBottom: '12px' }}>Exibida para clientes que optarem por Pix antecipado</div>

              {/* Preview */}
              {config.pix && (
                <div style={{ background: 'rgba(130,10,209,0.1)', border: '1px solid rgba(130,10,209,0.3)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#9A8880', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview para o cliente</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#820AD1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>💜</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#820AD1' }}>{config.pixBanco || 'Nubank'}</div>
                      <div style={{ fontSize: '12px', color: '#F5EFE6' }}>{config.pixNome || 'Nome não configurado'}</div>
                      <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '2px' }}>
                        {config.pixTipo === 'telefone' ? '📱' : config.pixTipo === 'email' ? '📧' : config.pixTipo === 'cpf' ? '👤' : '🔑'} {config.pix}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Endereço */}
            <Card>
              <InputField label="Endereço" value={config.endereco} onChange={v => setConfig(c => ({ ...c, endereco: v }))} placeholder="Rua, número, complemento" prefix="📍" />
            </Card>

            {/* Preview geral */}
            <div style={{ marginTop: '8px' }}>
              <SectionTitle icon="👁️" title="Preview Geral" subtitle="Como os clientes veem" />
              <Card style={{ borderColor: '#8B3A2A' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#F5EFE6', marginBottom: '10px' }}>Flyguer BarberShop</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#9A8880' }}>📞 {config.whatsapp || 'WhatsApp não configurado'}</div>
                  <div style={{ fontSize: '12px', color: '#9A8880' }}>💜 Pix: {config.pix || 'Não configurado'} ({config.pixBanco || 'Banco'})</div>
                  <div style={{ fontSize: '12px', color: '#9A8880' }}>📍 {config.endereco || 'Endereço não configurado'}</div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Botão salvar fixo */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: '#1A0F0D', borderTop: '1px solid #3A2018', padding: '12px 16px 24px', zIndex: 100 }}>
        <button onClick={salvar} disabled={salvando} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: salvoOk ? 'linear-gradient(135deg, #2E7D7A, #3A9E9A)' : 'linear-gradient(135deg, #5C2218, #8B3A2A)', color: '#F5EFE6', fontSize: '15px', fontWeight: '700', cursor: salvando ? 'wait' : 'pointer', transition: 'all 0.3s', fontFamily: "'DM Sans', sans-serif" }}>
          {salvando ? '⏳ Salvando...' : salvoOk ? '✅ Configurações salvas!' : '💾 Salvar todas as configurações'}
        </button>
      </div>

      {modalServico && (
        <ModalNovoServico categoria={modalServico} onSalvar={novo => adicionarServico(modalServico, novo)} onFechar={() => setModalServico(null)} />
      )}
    </div>
  );
}
