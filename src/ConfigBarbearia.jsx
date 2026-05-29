// ConfigBarbearia.jsx — Flyguer BarberShop
// ─────────────────────────────────────────────────────────────
// Passo 4: Configuração da Barbearia
// - Dias e horários de funcionamento
// - Horário de almoço (bloqueio)
// - Tabela de serviços (avulsos + combos)
// - Planos mensais (Bronze / Prata / Ouro)
// - Chave Pix + WhatsApp
// Salva em: Firestore /config/barbearia e /config/servicos
// Acesso: apenas Gerente (PERFIL.GERENTE)
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStyles, COLORS, DIAS_SEMANA } from './getStyles';

// ─────────────────────────────────────────────────────────────
// DADOS PADRÃO — carregados se Firestore estiver vazio
// ─────────────────────────────────────────────────────────────
const CONFIG_PADRAO = {
  nome:      'Flyguer BarberShop',
  whatsapp:  '11977643509',
  pix:       '11939089988',
  endereco:  'Shopping Cidade das Artes — Piso 2, Nº 22',
  horarios: {
    dom: { aberto: false, abertura: '09:00', fechamento: '18:00' },
    seg: { aberto: true,  abertura: '09:00', fechamento: '20:00' },
    ter: { aberto: true,  abertura: '09:00', fechamento: '20:00' },
    qua: { aberto: true,  abertura: '09:00', fechamento: '20:00' },
    qui: { aberto: true,  abertura: '09:00', fechamento: '20:00' },
    sex: { aberto: true,  abertura: '09:00', fechamento: '20:00' },
    sab: { aberto: true,  abertura: '09:00', fechamento: '18:00' },
  },
  almoco: {
    ativo:    true,
    inicio:   '12:00',
    fim:      '13:00',
  },
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
    { id: 'c1', nome: 'Corte + Barba',    valor: 70.00, duracao: 55, ativo: true },
    { id: 'c2', nome: 'Pezinho + Barba',  valor: 50.00, duracao: 40, ativo: true },
  ],
  planos: [
    {
      id: 'p1', nome: 'Bronze', valor: 139.99, cor: '#CD7F32', ativo: true,
      descricao: '4 cortes + 4 sobrancelhas por mês',
      beneficios: [],
    },
    {
      id: 'p2', nome: 'Prata', valor: 219.99, cor: '#C0C0C0', ativo: true,
      descricao: '4 cortes + 4 barbas + 4 sobrancelhas por mês',
      beneficios: [],
    },
    {
      id: 'p3', nome: 'Ouro', valor: 249.99, cor: '#C9A84C', ativo: true,
      descricao: '4 cortes + 4 barbas + 4 sobrancelhas',
      beneficios: ['Abono no estacionamento', '10% de desconto em produtos'],
    },
  ],
};

const DIAS_KEYS   = ['dom','seg','ter','qua','qui','sex','sab'];
const DIAS_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ─────────────────────────────────────────────────────────────
// COMPONENTES INTERNOS
// ─────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: '16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '17px', fontWeight: '700',
          color: '#F5EFE6',
        }}>{title}</span>
      </div>
      {subtitle && (
        <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '3px', marginLeft: '28px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#231410',
      borderRadius: '16px',
      padding: '16px',
      border: '1px solid #3A2018',
      marginBottom: '12px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label, sublabel }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', cursor: 'pointer',
        padding: '4px 0',
      }}
    >
      <div>
        {label && <div style={{ fontSize: '14px', color: '#F5EFE6', fontWeight: '500' }}>{label}</div>}
        {sublabel && <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '2px' }}>{sublabel}</div>}
      </div>
      <div style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: value ? '#8B3A2A' : '#3A2018',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '3px',
          left: value ? '23px' : '3px',
          width: '18px', height: '18px',
          borderRadius: '50%',
          background: value ? '#F5EFE6' : '#9A8880',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', prefix }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      {label && (
        <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {prefix && (
          <span style={{ fontSize: '13px', color: '#9A8880', flexShrink: 0 }}>{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: '#2E1A14',
            border: '1px solid #3A2018',
            borderRadius: '10px',
            padding: '10px 12px',
            color: '#F5EFE6',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>
    </div>
  );
}

function TimeInput({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#2E1A14',
          border: '1px solid #3A2018',
          borderRadius: '8px',
          padding: '8px 10px',
          color: '#F5EFE6',
          fontSize: '13px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ABAS DE NAVEGAÇÃO
// ─────────────────────────────────────────────────────────────
const ABAS = [
  { id: 'horarios',  icon: '🕐', label: 'Horários'  },
  { id: 'servicos',  icon: '💈', label: 'Serviços'  },
  { id: 'planos',    icon: '⭐', label: 'Planos'    },
  { id: 'contato',   icon: '📱', label: 'Contato'   },
];

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function ConfigBarbearia({ onBack, dark }) {
  const s = getStyles(dark);

  // ── Estado ────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva]     = React.useState('horarios');
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando]     = React.useState(false);
  const [salvoOk, setSalvoOk]       = React.useState(false);
  const [erro, setErro]             = React.useState('');

  // Dados barbearia
  const [config, setConfig]         = React.useState(CONFIG_PADRAO);
  const [servicos, setServicos]     = React.useState(SERVICOS_PADRAO);

  // ── Carregar do Firestore ──────────────────────────────────
  React.useEffect(() => {
    async function carregar() {
      try {
        const [snapConfig, snapServicos] = await Promise.all([
          getDoc(doc(db, 'config', 'barbearia')),
          getDoc(doc(db, 'config', 'servicos')),
        ]);
        if (snapConfig.exists()) setConfig(snapConfig.data());
        if (snapServicos.exists()) setServicos(snapServicos.data());
      } catch (e) {
        console.error('Erro ao carregar config:', e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // ── Salvar no Firestore ────────────────────────────────────
  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await Promise.all([
        setDoc(doc(db, 'config', 'barbearia'), {
          ...config,
          atualizadoEm: serverTimestamp(),
        }),
        setDoc(doc(db, 'config', 'servicos'), {
          ...servicos,
          atualizadoEm: serverTimestamp(),
        }),
      ]);
      setSalvoOk(true);
      setTimeout(() => setSalvoOk(false), 3000);
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function setHorario(dia, campo, valor) {
    setConfig(c => ({
      ...c,
      horarios: {
        ...c.horarios,
        [dia]: { ...c.horarios[dia], [campo]: valor },
      },
    }));
  }

  function setAlmoco(campo, valor) {
    setConfig(c => ({
      ...c,
      almoco: { ...c.almoco, [campo]: valor },
    }));
  }

  function setServico(categoria, id, campo, valor) {
    setServicos(sv => ({
      ...sv,
      [categoria]: sv[categoria].map(s =>
        s.id === id ? { ...s, [campo]: valor } : s
      ),
    }));
  }

  function setPlano(id, campo, valor) {
    setServicos(sv => ({
      ...sv,
      planos: sv.planos.map(p =>
        p.id === id ? { ...p, [campo]: valor } : p
      ),
    }));
  }

  // ─────────────────────────────────────────────────────────
  // RENDER LOADING
  // ─────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ ...s.app, paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}
          >
            ←
          </button>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>
              ⚙️ Configurações
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>Flyguer BarberShop</div>
          </div>
        </div>

        {/* Botão Salvar */}
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            background: salvoOk ? '#2E7D7A' : 'rgba(245,239,230,0.15)',
            border: '1px solid rgba(245,239,230,0.3)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#F5EFE6',
            fontSize: '13px',
            fontWeight: '600',
            cursor: salvando ? 'wait' : 'pointer',
            transition: 'all 0.3s',
          }}
        >
          {salvando ? '...' : salvoOk ? '✅ Salvo!' : '💾 Salvar'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: '10px', padding: '10px 14px', margin: '12px 20px 0', fontSize: '12px', color: '#F44336' }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Abas */}
      <div style={{
        display: 'flex', gap: '4px', padding: '12px 16px',
        borderBottom: '1px solid #3A2018', overflowX: 'auto',
      }}>
        {ABAS.map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', borderRadius: '20px', border: 'none',
              background: abaAtiva === aba.id ? '#8B3A2A' : '#2E1A14',
              color: abaAtiva === aba.id ? '#F5EFE6' : '#9A8880',
              fontSize: '12px', fontWeight: abaAtiva === aba.id ? '600' : '400',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '16px 16px 0' }}>

        {/* ── ABA HORÁRIOS ── */}
        {abaAtiva === 'horarios' && (
          <div>
            <SectionTitle icon="📅" title="Dias de Funcionamento" subtitle="Ative os dias e defina os horários" />

            {DIAS_KEYS.map((dia, i) => {
              const h = config.horarios[dia];
              return (
                <Card key={dia}>
                  <Toggle
                    value={h.aberto}
                    onChange={v => setHorario(dia, 'aberto', v)}
                    label={DIAS_LABELS[i]}
                    sublabel={h.aberto ? `${h.abertura} — ${h.fechamento}` : 'Fechado'}
                  />
                  {h.aberto && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <TimeInput label="Abertura" value={h.abertura} onChange={v => setHorario(dia, 'abertura', v)} />
                      <TimeInput label="Fechamento" value={h.fechamento} onChange={v => setHorario(dia, 'fechamento', v)} />
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Almoço */}
            <div style={{ marginTop: '8px' }}>
              <SectionTitle icon="🍽️" title="Bloqueio de Almoço" subtitle="Horário bloqueado para agendamentos" />
              <Card>
                <Toggle
                  value={config.almoco.ativo}
                  onChange={v => setAlmoco('ativo', v)}
                  label="Bloquear horário de almoço"
                  sublabel="Nenhum agendamento neste período"
                />
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

        {/* ── ABA SERVIÇOS ── */}
        {abaAtiva === 'servicos' && (
          <div>
            <SectionTitle icon="✂️" title="Serviços Avulsos" subtitle="Edite valores e duração" />
            {servicos.avulsos.map(sv => (
              <Card key={sv.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#F5EFE6' }}>{sv.nome}</div>
                  <Toggle value={sv.ativo} onChange={v => setServico('avulsos', sv.id, 'ativo', v)} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                    <input
                      type="number"
                      value={sv.valor}
                      onChange={e => setServico('avulsos', sv.id, 'valor', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '8px', padding: '8px 10px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Duração (min)</label>
                    <input
                      type="number"
                      value={sv.duracao}
                      onChange={e => setServico('avulsos', sv.id, 'duracao', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '8px', padding: '8px 10px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </Card>
            ))}

            <div style={{ marginTop: '8px' }}>
              <SectionTitle icon="🤝" title="Combos" subtitle="Pacotes combinados" />
              {servicos.combos.map(sv => (
                <Card key={sv.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#F5EFE6' }}>{sv.nome}</div>
                    <Toggle value={sv.ativo} onChange={v => setServico('combos', sv.id, 'ativo', v)} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                      <input
                        type="number"
                        value={sv.valor}
                        onChange={e => setServico('combos', sv.id, 'valor', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '8px', padding: '8px 10px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Duração (min)</label>
                      <input
                        type="number"
                        value={sv.duracao}
                        onChange={e => setServico('combos', sv.id, 'duracao', parseInt(e.target.value) || 0)}
                        style={{ width: '100%', background: '#2E1A14', border: '1px solid #3A2018', borderRadius: '8px', padding: '8px 10px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA PLANOS ── */}
        {abaAtiva === 'planos' && (
          <div>
            <SectionTitle icon="⭐" title="Planos Mensais" subtitle="Assinaturas recorrentes por mês" />
            {servicos.planos.map(pl => (
              <Card key={pl.id} style={{ borderColor: pl.cor + '44' }}>
                {/* Header do plano */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: pl.cor }} />
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', color: pl.cor }}>
                      Plano {pl.nome}
                    </span>
                  </div>
                  <Toggle value={pl.ativo} onChange={v => setPlano(pl.id, 'ativo', v)} />
                </div>

                {/* Descrição */}
                <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '12px', background: '#1A0F0D', borderRadius: '8px', padding: '8px 10px' }}>
                  {pl.descricao}
                </div>

                {/* Valor */}
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: '#9A8880', display: 'block', marginBottom: '4px' }}>Valor mensal (R$)</label>
                  <input
                    type="number"
                    value={pl.valor}
                    onChange={e => setPlano(pl.id, 'valor', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', background: '#2E1A14', border: `1px solid ${pl.cor}44`, borderRadius: '8px', padding: '10px 12px', color: pl.cor, fontSize: '16px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Benefícios extras */}
                {pl.beneficios.length > 0 && (
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

        {/* ── ABA CONTATO ── */}
        {abaAtiva === 'contato' && (
          <div>
            <SectionTitle icon="📱" title="Dados de Contato" subtitle="WhatsApp e chave Pix da barbearia" />

            <Card>
              <InputField
                label="WhatsApp da barbearia (com DDD)"
                value={config.whatsapp}
                onChange={v => setConfig(c => ({ ...c, whatsapp: v }))}
                placeholder="11999999999"
                type="tel"
                prefix="📞"
              />
              <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '-4px', marginBottom: '8px' }}>
                Usado para enviar confirmações de agendamento
              </div>
            </Card>

            <Card>
              <InputField
                label="Chave Pix"
                value={config.pix}
                onChange={v => setConfig(c => ({ ...c, pix: v }))}
                placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                prefix="💳"
              />
              <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '-4px', marginBottom: '8px' }}>
                Exibida para clientes que optarem por Pix antecipado
              </div>
            </Card>

            <Card>
              <InputField
                label="Endereço"
                value={config.endereco}
                onChange={v => setConfig(c => ({ ...c, endereco: v }))}
                placeholder="Rua, número, complemento"
                prefix="📍"
              />
            </Card>

            {/* Preview do card de contato */}
            <div style={{ marginTop: '8px' }}>
              <SectionTitle icon="👁️" title="Preview" subtitle="Como os clientes veem" />
              <Card style={{ borderColor: '#8B3A2A' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#F5EFE6', marginBottom: '10px' }}>
                  Flyguer BarberShop
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#9A8880' }}>
                    📞 {config.whatsapp || 'WhatsApp não configurado'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9A8880' }}>
                    💳 Pix: {config.pix || 'Não configurado'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9A8880' }}>
                    📍 {config.endereco || 'Endereço não configurado'}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>

      {/* Botão salvar fixo no rodapé */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        background: '#1A0F0D', borderTop: '1px solid #3A2018',
        padding: '12px 16px 24px',
        zIndex: 100,
      }}>
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            width: '100%', padding: '14px',
            borderRadius: '14px', border: 'none',
            background: salvoOk
              ? 'linear-gradient(135deg, #2E7D7A, #3A9E9A)'
              : 'linear-gradient(135deg, #5C2218, #8B3A2A)',
            color: '#F5EFE6',
            fontSize: '15px', fontWeight: '700',
            cursor: salvando ? 'wait' : 'pointer',
            transition: 'all 0.3s',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {salvando ? '⏳ Salvando...' : salvoOk ? '✅ Configurações salvas!' : '💾 Salvar todas as configurações'}
        </button>
      </div>

    </div>
  );
}
