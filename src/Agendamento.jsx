// Agendamento.jsx — Flyguer BarberShop
// ─────────────────────────────────────────────────────────────
// Passo 6: Agendamento do Cliente
// Fluxo: Barbeiro → Serviço → Data/Hora → Pagamento → Confirmação
// Regra: Trava de cancelamento no mesmo dia (exige sinal via Pix)
// Salva em: Firestore /agendamentos/{id}
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, addDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, DIAS_SEMANA } from './getStyles';

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS DE DATA
// ─────────────────────────────────────────────────────────────
function hoje() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function diaSemana(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  return DIAS_SEMANA[d.getDay()];
}

function gerarHorarios(abertura, fechamento, almoco, duracaoMin, agendados) {
  const horarios = [];
  const [hA, mA] = abertura.split(':').map(Number);
  const [hF, mF] = fechamento.split(':').map(Number);
  const inicioAlmoco = almoco?.ativo ? almoco.inicio : null;
  const fimAlmoco    = almoco?.ativo ? almoco.fim    : null;

  let atual = hA * 60 + mA;
  const fim = hF * 60 + mF;

  while (atual + duracaoMin <= fim) {
    const hh = String(Math.floor(atual / 60)).padStart(2, '0');
    const mm = String(atual % 60).padStart(2, '0');
    const hora = `${hh}:${mm}`;

    // Bloquear almoço
    let bloqueado = false;
    if (inicioAlmoco && fimAlmoco) {
      const [hAl, mAl] = inicioAlmoco.split(':').map(Number);
      const [hFl, mFl] = fimAlmoco.split(':').map(Number);
      const inicioMin = hAl * 60 + mAl;
      const fimMin    = hFl * 60 + mFl;
      if (atual >= inicioMin && atual < fimMin) bloqueado = true;
    }

    // Bloquear horários passados (se hoje)
    const agora = new Date();
    const hojeStr = hoje();

    horarios.push({
      hora,
      disponivel: !bloqueado && !agendados.includes(hora),
      bloqueado,
    });

    atual += 30; // intervalo de 30 min
  }

  return horarios;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTES UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
function StepIndicator({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '12px 0' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: '4px', flex: 1, borderRadius: '2px',
          background: i < step ? '#8B3A2A' : i === step ? '#E8C96A' : '#3A2018',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#231410', borderRadius: '16px',
        padding: '16px', border: '1px solid #3A2018',
        marginBottom: '10px', cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BotaoVoltar({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', color: '#E8C96A',
        fontSize: '14px', cursor: 'pointer', padding: '0',
      }}
    >
      ← Voltar
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// PASSO A: Escolher Barbeiro
// ─────────────────────────────────────────────────────────────
function EscolherBarbeiro({ onEscolher, onBack, dark }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    async function carregar() {
      try {
        const snap = await getDocs(query(
          collection(db, 'barbeiros'),
          where('ativo', '==', true)
        ));
        setBarbeiros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  return (
    <div style={{ ...s.app, padding: '20px', paddingBottom: '40px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={0} total={4} />

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#F5EFE6', marginBottom: '6px', marginTop: '8px' }}>
        Escolha o barbeiro
      </div>
      <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '20px' }}>
        Selecione com quem deseja se barbear
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', color: '#9A8880', padding: '40px' }}>Carregando...</div>
      ) : (
        barbeiros.map(b => (
          <Card
            key={b.id}
            onClick={() => b.disponivel && onEscolher(b)}
            style={{
              opacity: b.disponivel ? 1 : 0.5,
              border: b.disponivel ? '1px solid #3A2018' : '1px solid #2A1208',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: '700', color: '#F5EFE6',
                border: b.disponivel ? '2px solid #4CAF50' : '2px solid #555',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {b.foto
                  ? <img src={b.foto} alt={b.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : b.nome.charAt(0)
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#F5EFE6' }}>{b.nome}</div>
                <div style={{ fontSize: '12px', color: '#9A8880' }}>{b.cargo}</div>
              </div>
              <div style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600',
                background: b.disponivel ? 'rgba(76,175,80,0.15)' : 'rgba(150,150,150,0.15)',
                color: b.disponivel ? '#4CAF50' : '#888',
              }}>
                {b.disponivel ? '● Disponível' : '● Ocupado'}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PASSO B: Escolher Serviço
// ─────────────────────────────────────────────────────────────
function EscolherServico({ barbeiro, onEscolher, onBack, dark }) {
  const s = getStyles(dark);
  const [servicos, setServicos] = React.useState({ avulsos: [], combos: [] });
  const [selecionado, setSelecionado] = React.useState(null);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    async function carregar() {
      try {
        const snap = await getDoc(doc(db, 'config', 'servicos'));
        if (snap.exists()) setServicos(snap.data());
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    }
    carregar();
  }, []);

  const todosServicos = [
    ...servicos.avulsos?.filter(s => s.ativo) || [],
    ...servicos.combos?.filter(s => s.ativo) || [],
  ];

  return (
    <div style={{ ...s.app, padding: '20px', paddingBottom: '100px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={1} total={4} />

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#F5EFE6', marginBottom: '6px', marginTop: '8px' }}>
        Escolha o serviço
      </div>
      <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '4px' }}>
        Barbeiro: <strong style={{ color: '#E8C96A' }}>{barbeiro.nome}</strong>
      </div>
      <div style={{ fontSize: '11px', color: '#9A8880', marginBottom: '20px' }}>
        Toque para selecionar
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', color: '#9A8880', padding: '40px' }}>Carregando...</div>
      ) : (
        todosServicos.map(sv => {
          const sel = selecionado?.id === sv.id;
          return (
            <Card
              key={sv.id}
              onClick={() => setSelecionado(sv)}
              style={{
                border: sel ? '1.5px solid #8B3A2A' : '1px solid #3A2018',
                background: sel ? '#2E1A14' : '#231410',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#F5EFE6' }}>{sv.nome}</div>
                  <div style={{ fontSize: '12px', color: '#9A8880', marginTop: '2px' }}>
                    ⏱ {sv.duracao} min
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: sel ? '#E8C96A' : '#F5EFE6' }}>
                    R$ {sv.valor.toFixed(2).replace('.', ',')}
                  </div>
                  {sel && (
                    <div style={{ fontSize: '11px', color: '#8B3A2A', fontWeight: '600' }}>✓ Selecionado</div>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}

      {/* Botão continuar fixo */}
      {selecionado && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px', background: '#1A0F0D',
          borderTop: '1px solid #3A2018', padding: '12px 16px 28px', zIndex: 100,
        }}>
          <button
            onClick={() => onEscolher(selecionado)}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
              color: '#F5EFE6', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Continuar com {selecionado.nome} →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PASSO C: Escolher Data e Horário
// ─────────────────────────────────────────────────────────────
function EscolherDataHora({ barbeiro, servico, onEscolher, onBack, dark }) {
  const s = getStyles(dark);
  const DIAS_KEYS = ['dom','seg','ter','qua','qui','sex','sab'];

  // Próximos 14 dias
  const diasDisponiveis = React.useMemo(() => {
    const dias = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dias.push(d.toISOString().split('T')[0]);
    }
    return dias;
  }, []);

  const [dataSel, setDataSel] = React.useState(null);
  const [horaSel, setHoraSel] = React.useState(null);
  const [horarios, setHorarios] = React.useState([]);
  const [config, setConfig] = React.useState(null);
  const [carregando, setCarregando] = React.useState(false);
  const [agendados, setAgendados] = React.useState([]);

  // Carregar config da barbearia
  React.useEffect(() => {
    getDoc(doc(db, 'config', 'barbearia'))
      .then(snap => { if (snap.exists()) setConfig(snap.data()); })
      .catch(console.error);
  }, []);

  // Ao selecionar data — gerar horários disponíveis
  React.useEffect(() => {
    if (!dataSel || !config) return;
    setCarregando(true);
    setHoraSel(null);

    async function carregarHorarios() {
      try {
        // Buscar agendamentos já existentes para esse barbeiro nessa data
        const snap = await getDocs(query(
          collection(db, 'agendamentos'),
          where('barbeiroId', '==', barbeiro.id),
          where('data', '==', dataSel),
          where('status', 'in', ['confirmado', 'pendente']),
        ));
        const horasOcupadas = snap.docs.map(d => d.data().hora);
        setAgendados(horasOcupadas);

        const diaSem = DIAS_KEYS[new Date(dataSel + 'T12:00:00').getDay()];
        const horConfig = config.horarios?.[diaSem];

        if (!horConfig?.aberto) {
          setHorarios([]);
        } else {
          setHorarios(gerarHorarios(
            horConfig.abertura,
            horConfig.fechamento,
            config.almoco,
            servico.duracao,
            horasOcupadas,
          ));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    }
    carregarHorarios();
  }, [dataSel, config, barbeiro.id, servico.duracao]);

  function isDiaAberto(dataStr) {
    if (!config) return true;
    const diaSem = DIAS_KEYS[new Date(dataStr + 'T12:00:00').getDay()];
    return config.horarios?.[diaSem]?.aberto ?? true;
  }

  return (
    <div style={{ ...s.app, padding: '20px', paddingBottom: '100px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={2} total={4} />

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#F5EFE6', marginBottom: '4px', marginTop: '8px' }}>
        Escolha data e horário
      </div>
      <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '20px' }}>
        {barbeiro.nome} · {servico.nome} · {servico.duracao} min
      </div>

      {/* Seletor de datas */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: '8px', paddingBottom: '8px', marginBottom: '20px' }}>
        {diasDisponiveis.map(data => {
          const aberto = isDiaAberto(data);
          const sel = dataSel === data;
          const d = new Date(data + 'T12:00:00');
          return (
            <div
              key={data}
              onClick={() => aberto && setDataSel(data)}
              style={{
                minWidth: '56px', padding: '10px 8px', borderRadius: '12px',
                textAlign: 'center', cursor: aberto ? 'pointer' : 'not-allowed',
                background: sel ? '#8B3A2A' : aberto ? '#231410' : '#1A0F0D',
                border: sel ? '1.5px solid #E8C96A' : '1px solid #3A2018',
                opacity: aberto ? 1 : 0.4,
              }}
            >
              <div style={{ fontSize: '10px', color: sel ? '#E8C96A' : '#9A8880', fontWeight: '600' }}>
                {DIAS_SEMANA[d.getDay()]}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: sel ? '#F5EFE6' : '#F5EFE6', marginTop: '2px' }}>
                {d.getDate()}
              </div>
              <div style={{ fontSize: '10px', color: sel ? '#E8C96A' : '#9A8880' }}>
                {String(d.getMonth() + 1).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Horários */}
      {dataSel && (
        <>
          <div style={{ fontSize: '13px', color: '#E8C96A', fontWeight: '600', marginBottom: '12px' }}>
            Horários disponíveis — {formatarData(dataSel)}
          </div>

          {carregando ? (
            <div style={{ textAlign: 'center', color: '#9A8880', padding: '20px' }}>Carregando horários...</div>
          ) : horarios.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', color: '#9A8880', padding: '12px' }}>
                Fechado neste dia
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {horarios.map(h => {
                const sel = horaSel === h.hora;
                return (
                  <div
                    key={h.hora}
                    onClick={() => h.disponivel && setHoraSel(h.hora)}
                    style={{
                      padding: '10px 4px', borderRadius: '10px', textAlign: 'center',
                      cursor: h.disponivel ? 'pointer' : 'not-allowed',
                      background: sel ? '#8B3A2A' : h.disponivel ? '#231410' : '#1A0F0D',
                      border: sel ? '1.5px solid #E8C96A' : '1px solid #3A2018',
                      opacity: h.disponivel ? 1 : 0.4,
                      fontSize: '13px', fontWeight: '600',
                      color: sel ? '#F5EFE6' : h.disponivel ? '#F5EFE6' : '#555',
                    }}
                  >
                    {h.hora}
                    {!h.disponivel && !h.bloqueado && (
                      <div style={{ fontSize: '8px', color: '#F44336', marginTop: '2px' }}>Ocupado</div>
                    )}
                    {h.bloqueado && (
                      <div style={{ fontSize: '8px', color: '#9A8880', marginTop: '2px' }}>Almoço</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Botão continuar */}
      {dataSel && horaSel && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px', background: '#1A0F0D',
          borderTop: '1px solid #3A2018', padding: '12px 16px 28px', zIndex: 100,
        }}>
          <div style={{ fontSize: '12px', color: '#9A8880', textAlign: 'center', marginBottom: '8px' }}>
            {formatarData(dataSel)} às {horaSel} com {barbeiro.nome}
          </div>
          <button
            onClick={() => onEscolher({ data: dataSel, hora: horaSel })}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
              color: '#F5EFE6', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Confirmar horário →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PASSO D: Pagamento e Confirmação
// Inclui trava de cancelamento no mesmo dia
// ─────────────────────────────────────────────────────────────
function Pagamento({ cliente, barbeiro, servico, dataHora, onConfirmar, onBack, dark }) {
  const s = getStyles(dark);
  const [pagPref, setPagPref] = React.useState('local');
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const [pixConfig, setPixConfig] = React.useState('');

  // Verificar trava: cliente cancelou agendamento hoje?
  const [travado, setTravado] = React.useState(false);
  const [verificando, setVerificando] = React.useState(true);

  React.useEffect(() => {
    async function verificar() {
      try {
        // Buscar chave Pix
        const snapConfig = await getDoc(doc(db, 'config', 'barbearia'));
        if (snapConfig.exists()) setPixConfig(snapConfig.data().pix || '');

        // Verificar cancelamentos de hoje
        if (dataHora.data === hoje()) {
          const snap = await getDocs(query(
            collection(db, 'agendamentos'),
            where('clienteCpf', '==', cliente.cpf),
            where('data', '==', hoje()),
            where('status', '==', 'cancelado_cliente'),
          ));
          if (!snap.empty) setTravado(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setVerificando(false);
      }
    }
    verificar();
  }, [cliente.cpf, dataHora.data]);

  const valorSinal = (servico.valor * 0.5).toFixed(2).replace('.', ',');

  async function handleConfirmar() {
    // Se travado, só aceita Pix
    if (travado && pagPref === 'local') {
      setErro('Você deve pagar o sinal via Pix para confirmar este agendamento.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const agendamento = {
        clienteCpf:   cliente.cpf,
        clienteNome:  cliente.nome,
        clienteTel:   cliente.telefone,
        barbeiroId:   barbeiro.id,
        barbeiroNome: barbeiro.nome,
        servico:      servico.nome,
        servicoId:    servico.id,
        valor:        servico.valor,
        data:         dataHora.data,
        hora:         dataHora.hora,
        pagamento:    travado ? 'pix_sinal' : pagPref,
        sinal:        travado ? servico.valor * 0.5 : 0,
        status:       'confirmado',
        travaCancelamento: travado,
        criadoEm:     serverTimestamp(),
      };

      await addDoc(collection(db, 'agendamentos'), agendamento);
      onConfirmar(agendamento);
    } catch (e) {
      setErro('Erro ao confirmar. Tente novamente.');
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  if (verificando) {
    return (
      <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#9A8880' }}>Verificando disponibilidade...</div>
      </div>
    );
  }

  return (
    <div style={{ ...s.app, padding: '20px', paddingBottom: '120px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={3} total={4} />

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#F5EFE6', marginBottom: '4px', marginTop: '8px' }}>
        Confirmar agendamento
      </div>
      <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '20px' }}>
        Revise e escolha a forma de pagamento
      </div>

      {/* Resumo */}
      <Card style={{ borderColor: '#8B3A2A' }}>
        <div style={{ fontSize: '12px', color: '#9A8880', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Resumo
        </div>
        {[
          { label: 'Barbeiro',  value: barbeiro.nome },
          { label: 'Serviço',   value: servico.nome  },
          { label: 'Data',      value: `${diaSemana(dataHora.data)}, ${formatarData(dataHora.data)}` },
          { label: 'Horário',   value: dataHora.hora },
          { label: 'Duração',   value: `${servico.duracao} min` },
          { label: 'Valor',     value: `R$ ${servico.valor.toFixed(2).replace('.', ',')}` },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9A8880' }}>{item.label}</span>
            <span style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>{item.value}</span>
          </div>
        ))}
      </Card>

      {/* TRAVA: aviso de cancelamento no mesmo dia */}
      {travado && (
        <div style={{
          background: 'rgba(244,67,54,0.1)', border: '1.5px solid rgba(244,67,54,0.4)',
          borderRadius: '14px', padding: '14px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#F44336', marginBottom: '8px' }}>
            🔒 Política de Agendamento Recente (Mesmo Dia)
          </div>
          <div style={{ fontSize: '12px', color: '#F5EFE6', lineHeight: '1.6' }}>
            Identificamos que você realizou um cancelamento para o dia de hoje. Para garantir esta nova vaga, o sistema exige o pagamento de um <strong>sinal de 50% via Pix Antecipado</strong>.
          </div>
          <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: '#9A8880' }}>Sinal obrigatório:</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F44336' }}>
              R$ {valorSinal}
            </div>
            <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '4px' }}>
              Será abatido no pagamento final. Em caso de falta, o sinal não será reembolsado.
            </div>
          </div>
        </div>
      )}

      {/* Forma de pagamento */}
      <div style={{ fontSize: '12px', color: '#E8C96A', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Forma de pagamento
      </div>

      {/* Pagar no local */}
      <Card
        onClick={() => !travado && setPagPref('local')}
        style={{
          border: pagPref === 'local' && !travado ? '1.5px solid #8B3A2A' : '1px solid #3A2018',
          opacity: travado ? 0.4 : 1,
          cursor: travado ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>💵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: travado ? '#555' : '#F5EFE6' }}>
              Pagar no Local
              {travado && <span style={{ marginLeft: '8px', fontSize: '11px' }}>🔒</span>}
            </div>
            <div style={{ fontSize: '11px', color: '#9A8880' }}>
              {travado ? 'Bloqueado — cancelamento realizado hoje' : 'No dia do atendimento — sem burocracia'}
            </div>
          </div>
          {!travado && (
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              border: `2px solid ${pagPref === 'local' ? '#8B3A2A' : '#3A2018'}`,
              background: pagPref === 'local' ? '#8B3A2A' : 'transparent',
            }} />
          )}
        </div>
      </Card>

      {/* Pix */}
      <Card
        onClick={() => setPagPref('pix')}
        style={{ border: (pagPref === 'pix' || travado) ? '1.5px solid #2E7D7A' : '1px solid #3A2018' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>💳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#F5EFE6' }}>
              {travado ? `Pix Antecipado — Sinal R$ ${valorSinal}` : 'Pagar via Pix'}
            </div>
            <div style={{ fontSize: '11px', color: '#9A8880' }}>
              {travado ? 'Obrigatório para confirmar vaga hoje' : 'Antecipado · garante sua vaga'}
            </div>
          </div>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            border: `2px solid ${pagPref === 'pix' || travado ? '#2E7D7A' : '#3A2018'}`,
            background: pagPref === 'pix' || travado ? '#2E7D7A' : 'transparent',
          }} />
        </div>

        {/* Chave Pix */}
        {(pagPref === 'pix' || travado) && pixConfig && (
          <div style={{ marginTop: '12px', background: '#1A0F0D', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: '#9A8880', marginBottom: '4px' }}>Chave Pix:</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#2E7D7A', letterSpacing: '1px' }}>
              {pixConfig}
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(pixConfig)}
              style={{
                marginTop: '8px', padding: '6px 12px', borderRadius: '8px',
                border: '1px solid #2E7D7A', background: 'transparent',
                color: '#2E7D7A', fontSize: '12px', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              📋 Copiar chave
            </button>
            <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '8px' }}>
              {travado
                ? `Transfira R$ ${valorSinal} e confirme abaixo`
                : 'Transfira o valor e confirme abaixo'
              }
            </div>
          </div>
        )}
      </Card>

      {/* Info Pix opcional */}
      {!travado && (
        <div style={{
          background: 'rgba(46,125,122,0.08)', border: '1px solid rgba(46,125,122,0.2)',
          borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
          fontSize: '11px', color: '#2E7D7A',
        }}>
          ℹ️ O Pix antecipado é sempre opcional. Você decide a cada agendamento.
        </div>
      )}

      {erro && (
        <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Botão confirmar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px', background: '#1A0F0D',
        borderTop: '1px solid #3A2018', padding: '12px 16px 28px', zIndex: 100,
      }}>
        <button
          onClick={handleConfirmar}
          disabled={salvando}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: travado
              ? 'linear-gradient(135deg, #2E7D7A, #3A9E9A)'
              : 'linear-gradient(135deg, #5C2218, #8B3A2A)',
            color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
            cursor: salvando ? 'wait' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {salvando ? '⏳ Confirmando...'
            : travado ? `✅ Confirmar e Pagar Sinal R$ ${valorSinal}`
            : '✅ Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA: CONFIRMAÇÃO FINAL
// ─────────────────────────────────────────────────────────────
function Confirmado({ agendamento, onVoltar, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#E8C96A', marginBottom: '8px' }}>
        Agendado!
      </div>
      <div style={{ fontSize: '14px', color: '#9A8880', marginBottom: '32px' }}>
        Seu horário está confirmado
      </div>

      <div style={{
        background: '#231410', borderRadius: '16px', padding: '20px',
        border: '1.5px solid #8B3A2A', marginBottom: '24px', textAlign: 'left',
      }}>
        {[
          { icon: '✂️', label: 'Barbeiro',  value: agendamento.barbeiroNome },
          { icon: '💈', label: 'Serviço',   value: agendamento.servico      },
          { icon: '📅', label: 'Data',      value: formatarData(agendamento.data) },
          { icon: '🕐', label: 'Horário',   value: agendamento.hora         },
          { icon: '💰', label: 'Valor',     value: `R$ ${agendamento.valor.toFixed(2).replace('.', ',')}` },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span style={{ fontSize: '13px', color: '#9A8880', width: '70px' }}>{item.label}</span>
            <span style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>{item.value}</span>
          </div>
        ))}
      </div>

      {agendamento.travaCancelamento && (
        <div style={{
          background: 'rgba(46,125,122,0.1)', border: '1px solid rgba(46,125,122,0.3)',
          borderRadius: '12px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#2E7D7A',
        }}>
          ℹ️ Sinal de R$ {(agendamento.valor * 0.5).toFixed(2).replace('.', ',')} enviado via Pix. Será abatido no pagamento final.
        </div>
      )}

      <button
        onClick={onVoltar}
        style={{
          width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
          color: '#F5EFE6', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Voltar ao início
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL — Orquestra o fluxo
// ─────────────────────────────────────────────────────────────
export default function Agendamento({ cliente, onBack, dark }) {
  const [etapa, setEtapa] = React.useState('barbeiro'); // barbeiro | servico | dataHora | pagamento | confirmado

  const [barbeiro, setBarbeiro] = React.useState(null);
  const [servico,  setServico]  = React.useState(null);
  const [dataHora, setDataHora] = React.useState(null);
  const [agendamento, setAgendamento] = React.useState(null);

  if (etapa === 'confirmado' && agendamento) {
    return <Confirmado agendamento={agendamento} onVoltar={onBack} dark={dark} />;
  }

  if (etapa === 'pagamento') {
    return (
      <Pagamento
        cliente={cliente}
        barbeiro={barbeiro}
        servico={servico}
        dataHora={dataHora}
        onConfirmar={ag => { setAgendamento(ag); setEtapa('confirmado'); }}
        onBack={() => setEtapa('dataHora')}
        dark={dark}
      />
    );
  }

  if (etapa === 'dataHora') {
    return (
      <EscolherDataHora
        barbeiro={barbeiro}
        servico={servico}
        onEscolher={dh => { setDataHora(dh); setEtapa('pagamento'); }}
        onBack={() => setEtapa('servico')}
        dark={dark}
      />
    );
  }

  if (etapa === 'servico') {
    return (
      <EscolherServico
        barbeiro={barbeiro}
        onEscolher={sv => { setServico(sv); setEtapa('dataHora'); }}
        onBack={() => setEtapa('barbeiro')}
        dark={dark}
      />
    );
  }

  return (
    <EscolherBarbeiro
      onEscolher={b => { setBarbeiro(b); setEtapa('servico'); }}
      onBack={onBack}
      dark={dark}
    />
  );
}
