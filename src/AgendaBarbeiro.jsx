// AgendaBarbeiro.jsx — Flyguer BarberShop
// ─────────────────────────────────────────────────────────────
// Passo 8: Agenda do Barbeiro
// - Visualiza agendamentos do dia por barbeiro
// - Navega entre dias
// - Marca como concluído
// - Toggle disponibilidade
// Lê de: Firestore /agendamentos where barbeiroId == id AND data == data
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, DIAS_SEMANA } from './getStyles';

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
function hoje() {
  return new Date().toISOString().split('T')[0];
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function diaSemanaCompleto(dataStr) {
  const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return DIAS[new Date(dataStr + 'T12:00:00').getDay()];
}

function addDias(dataStr, n) {
  const d = new Date(dataStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function isHoje(dataStr) {
  return dataStr === hoje();
}

// ─────────────────────────────────────────────────────────────
// CARD DE AGENDAMENTO
// ─────────────────────────────────────────────────────────────
function CardAgendamento({ ag, onConcluir, concluindo }) {
  const isConcluido  = ag.status === 'concluido';
  const isCancelado  = ag.status?.includes('cancelado');

  return (
    <div style={{
      background: '#231410',
      borderRadius: '16px',
      border: isConcluido ? '1px solid #2E7D7A'
        : isCancelado ? '1px solid #3A1010'
        : '1px solid #3A2018',
      marginBottom: '12px',
      overflow: 'hidden',
      opacity: isCancelado ? 0.5 : 1,
    }}>
      {/* Faixa colorida */}
      <div style={{
        height: '3px',
        background: isConcluido ? '#2E7D7A'
          : isCancelado ? '#F44336'
          : ag.pagamento === 'pix' || ag.pagamento === 'pix_sinal'
            ? '#2E7D7A' : '#8B3A2A',
      }} />

      <div style={{ padding: '14px' }}>
        {/* Horário + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '22px', fontWeight: '700', color: '#E8C96A',
          }}>
            {ag.hora}
          </div>
          <div style={{
            fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600',
            background: isConcluido ? 'rgba(46,125,122,0.2)'
              : isCancelado ? 'rgba(244,67,54,0.15)'
              : 'rgba(76,175,80,0.15)',
            color: isConcluido ? '#2E7D7A'
              : isCancelado ? '#F44336'
              : '#4CAF50',
          }}>
            {isConcluido ? '✓ Concluído'
              : isCancelado ? '✗ Cancelado'
              : '● Confirmado'}
          </div>
        </div>

        {/* Cliente e serviço */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#F5EFE6' }}>
            {ag.clienteNome?.split(' ')[0]} {ag.clienteNome?.split(' ')[1] || ''}
          </div>
          <div style={{ fontSize: '13px', color: '#9A8880', marginTop: '2px' }}>
            💈 {ag.servico}
          </div>
          <div style={{ fontSize: '12px', color: '#9A8880', marginTop: '2px' }}>
            📞 {ag.clienteTel}
          </div>
        </div>

        {/* Valor e pagamento */}
        <div style={{
          display: 'flex', gap: '10px',
          background: '#1A0F0D', borderRadius: '10px',
          padding: '10px 12px', marginBottom: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#9A8880', marginBottom: '2px' }}>Valor</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#E8C96A' }}>
              R$ {(ag.valor || 0).toFixed(2).replace('.', ',')}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#9A8880', marginBottom: '2px' }}>Pagamento</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#F5EFE6' }}>
              {ag.pagamento === 'pix' || ag.pagamento === 'pix_sinal'
                ? '💳 Pix pago' : '💵 No local'}
            </div>
          </div>
          {ag.sinal > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#9A8880', marginBottom: '2px' }}>Sinal</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#2E7D7A' }}>
                R$ {ag.sinal.toFixed(2).replace('.', ',')}
              </div>
            </div>
          )}
        </div>

        {/* Botão concluir */}
        {!isConcluido && !isCancelado && (
          <button
            onClick={() => onConcluir(ag)}
            disabled={concluindo === ag.firestoreId}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
              background: concluindo === ag.firestoreId
                ? '#2E1A14'
                : 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
              color: '#F5EFE6', fontSize: '13px', fontWeight: '700',
              cursor: concluindo === ag.firestoreId ? 'wait' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {concluindo === ag.firestoreId ? '...' : '✓ Marcar como Concluído'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function AgendaBarbeiro({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const [dataSel, setDataSel]       = React.useState(hoje());
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [carregando, setCarregando] = React.useState(true);
  const [concluindo, setConcluindo] = React.useState(null);
  const [disponivel, setDisponivel] = React.useState(usuario?.disponivel ?? true);
  const [salvandoDisp, setSalvandoDisp] = React.useState(false);

  // ── Escuta agendamentos em tempo real ────────────────────
  React.useEffect(() => {
    if (!usuario?.id) return;
    setCarregando(true);

    const q = query(
      collection(db, 'agendamentos'),
      where('barbeiroId', '==', usuario.id),
      where('data', '==', dataSel),
    );

    const unsub = onSnapshot(q, snap => {
      const ags = snap.docs
        .map(d => ({ firestoreId: d.id, ...d.data() }))
        .sort((a, b) => a.hora.localeCompare(b.hora));
      setAgendamentos(ags);
      setCarregando(false);
    }, err => {
      console.error('Erro agenda:', err);
      setCarregando(false);
    });

    return () => unsub();
  }, [usuario?.id, dataSel]);

  // ── Marcar como concluído ─────────────────────────────────
  async function handleConcluir(ag) {
    setConcluindo(ag.firestoreId);
    try {
      await updateDoc(doc(db, 'agendamentos', ag.firestoreId), {
        status: 'concluido',
        concluidoEm: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setConcluindo(null);
    }
  }

  // ── Toggle disponibilidade ────────────────────────────────
  async function toggleDisponivel() {
    setSalvandoDisp(true);
    const novo = !disponivel;
    try {
      await updateDoc(doc(db, 'barbeiros', usuario.id), {
        disponivel: novo,
        atualizadoEm: serverTimestamp(),
      });
      setDisponivel(novo);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvandoDisp(false);
    }
  }

  // ── Resumo do dia ─────────────────────────────────────────
  const confirmados = agendamentos.filter(a => a.status === 'confirmado');
  const concluidos  = agendamentos.filter(a => a.status === 'concluido');
  const totalDia    = agendamentos
    .filter(a => a.status !== 'cancelado_cliente' && a.status !== 'cancelado_barbeiro')
    .reduce((acc, a) => acc + (a.valor || 0), 0);

  // ── Próximos 7 dias para seletor ─────────────────────────
  const dias = Array.from({ length: 7 }, (_, i) => addDias(hoje(), i));

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
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>
            📅 Minha Agenda
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>
            {usuario?.nome}
          </div>
        </div>

        {/* Toggle disponibilidade */}
        <div
          onClick={salvandoDisp ? undefined : toggleDisponivel}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,0,0,0.2)', borderRadius: '20px',
            padding: '6px 12px', cursor: salvandoDisp ? 'wait' : 'pointer',
          }}
        >
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: disponivel ? '#4CAF50' : '#FFC107',
          }} />
          <span style={{ fontSize: '12px', color: '#F5EFE6', fontWeight: '600' }}>
            {salvandoDisp ? '...' : disponivel ? 'Disponível' : 'Ocupado'}
          </span>
        </div>
      </div>

      {/* Seletor de dias */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: '6px', padding: '12px 16px', borderBottom: '1px solid #3A2018' }}>
        {dias.map(data => {
          const d = new Date(data + 'T12:00:00');
          const sel = dataSel === data;
          return (
            <div
              key={data}
              onClick={() => setDataSel(data)}
              style={{
                minWidth: '52px', padding: '8px 6px', borderRadius: '12px',
                textAlign: 'center', cursor: 'pointer',
                background: sel ? '#8B3A2A' : '#231410',
                border: sel ? '1.5px solid #E8C96A' : '1px solid #3A2018',
              }}
            >
              <div style={{ fontSize: '10px', color: sel ? '#E8C96A' : '#9A8880', fontWeight: '600' }}>
                {DIAS_SEMANA[d.getDay()]}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#F5EFE6', marginTop: '2px' }}>
                {d.getDate()}
              </div>
              {isHoje(data) && (
                <div style={{ fontSize: '8px', color: '#E8C96A', fontWeight: '600' }}>HOJE</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px' }}>

        {/* Resumo do dia */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px', marginBottom: '20px',
        }}>
          {[
            { label: 'Confirmados', value: confirmados.length, color: '#4CAF50' },
            { label: 'Concluídos',  value: concluidos.length,  color: '#2E7D7A' },
            { label: 'Receita',     value: `R$${totalDia.toFixed(0)}`, color: '#E8C96A' },
          ].map(item => (
            <div key={item.label} style={{
              background: '#231410', borderRadius: '12px',
              padding: '12px 10px', textAlign: 'center',
              border: '1px solid #3A2018',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>
                {item.value}
              </div>
              <div style={{ fontSize: '10px', color: '#9A8880', marginTop: '2px' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Data selecionada */}
        <div style={{ fontSize: '13px', color: '#E8C96A', fontWeight: '600', marginBottom: '14px' }}>
          {diaSemanaCompleto(dataSel)}, {formatarData(dataSel)}
          {isHoje(dataSel) && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9A8880' }}>— Hoje</span>}
        </div>

        {/* Lista de agendamentos */}
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9A8880' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            Carregando agenda...
          </div>
        ) : agendamentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A', marginBottom: '8px' }}>
              Sem agendamentos
            </div>
            <div style={{ fontSize: '13px', color: '#9A8880' }}>
              Nenhum cliente agendado para {isHoje(dataSel) ? 'hoje' : formatarData(dataSel)}
            </div>
          </div>
        ) : (
          agendamentos.map(ag => (
            <CardAgendamento
              key={ag.firestoreId}
              ag={ag}
              onConcluir={handleConcluir}
              concluindo={concluindo}
            />
          ))
        )}
      </div>
    </div>
  );
}
