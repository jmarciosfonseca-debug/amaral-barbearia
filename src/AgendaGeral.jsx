// AgendaGeral.jsx — Flyguer BarberShop
// Agenda Geral do Gerente: calendário mensal + lista do dia + filtro barbeiro

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, getDocs, onSnapshot,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';

function hoje() { return new Date().toISOString().split('T')[0]; }
function formatarData(s) { if (!s) return ''; const [a,m,d] = s.split('-'); return `${d}/${m}/${a}`; }
function diaSemanaCompleto(s) {
  const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return DIAS[new Date(s + 'T12:00:00').getDay()];
}
function moeda(v) { return `R$ ${(v||0).toFixed(2).replace('.',',')}` }

// ── Calendário ──────────────────────────────────────────────
function Calendario({ ano, mes, dataSel, onSelecionar, marcados }) {
  const DS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate();
  const hojeStr     = hoje();
  const celulas = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {DS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#9A8880', fontWeight: '600', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {celulas.map((dia, idx) => {
          if (!dia) return <div key={`v${idx}`} />;
          const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
          const ehHoje  = dataStr === hojeStr;
          const ehSel   = dataStr === dataSel;
          const temAg   = (marcados[dataStr] || 0) > 0;
          return (
            <div key={dataStr} onClick={() => onSelecionar(dataStr)} style={{
              textAlign: 'center', padding: '6px 2px', borderRadius: '8px', cursor: 'pointer',
              background: ehSel ? '#8B3A2A' : ehHoje ? 'rgba(139,58,42,0.2)' : '#231410',
              border: ehSel ? '1.5px solid #E8C96A' : ehHoje ? '1px solid #8B3A2A' : '1px solid #3A2018',
            }}>
              <div style={{ fontSize: '13px', fontWeight: ehHoje || ehSel ? '700' : '400', color: ehSel ? '#F5EFE6' : ehHoje ? '#E8C96A' : '#F5EFE6' }}>
                {dia}
              </div>
              {temAg
                ? <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: ehSel ? '#E8C96A' : '#8B3A2A', margin: '2px auto 0' }} />
                : <div style={{ height: '7px' }} />
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Card Agendamento ────────────────────────────────────────
function CardAg({ ag, onConcluir, concluindo }) {
  const isConcluido = ag.status === 'concluido';
  const isCancelado = ag.status?.includes('cancelado');
  return (
    <div style={{
      background: '#231410', borderRadius: '14px', marginBottom: '10px', overflow: 'hidden',
      border: isConcluido ? '1px solid #2E7D7A' : isCancelado ? '1px solid #3A1010' : '1px solid #3A2018',
      opacity: isCancelado ? 0.5 : 1,
    }}>
      <div style={{ height: '3px', background: isConcluido ? '#2E7D7A' : isCancelado ? '#F44336' : '#8B3A2A' }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: '#E8C96A' }}>{ag.hora}</span>
              <span style={{ fontWeight: '700', fontSize: '14px', color: '#F5EFE6' }}>{ag.clienteNome?.split(' ')[0]}</span>
              {ag.agendadoPor === 'recepcao' && (
                <span style={{ fontSize: '9px', background: 'rgba(46,125,122,0.2)', color: '#2E7D7A', padding: '2px 6px', borderRadius: '6px' }}>Manual</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#9A8880', marginTop: '2px' }}>✂️ {ag.barbeiroNome} · 💈 {ag.servico}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#E8C96A' }}>{moeda(ag.valor)}</div>
            <div style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', fontWeight: '600',
              background: isConcluido ? 'rgba(46,125,122,0.2)' : isCancelado ? 'rgba(244,67,54,0.15)' : 'rgba(76,175,80,0.15)',
              color: isConcluido ? '#2E7D7A' : isCancelado ? '#F44336' : '#4CAF50',
            }}>
              {isConcluido ? '✓ Concluído' : isCancelado ? '✗ Cancelado' : '● Confirmado'}
            </div>
          </div>
        </div>
        {!isConcluido && !isCancelado && (
          <button onClick={() => onConcluir(ag)} disabled={concluindo === ag.firestoreId} style={{
            width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
            background: concluindo === ag.firestoreId ? '#2E1A14' : 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
            color: '#F5EFE6', fontSize: '12px', fontWeight: '700',
            cursor: concluindo === ag.firestoreId ? 'wait' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {concluindo === ag.firestoreId ? '...' : '✓ Marcar Concluído'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Principal ───────────────────────────────────────────────
export default function AgendaGeral({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const agora = new Date();
  const MESES_LABEL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const [anoMes, setAnoMes]         = React.useState({ ano: agora.getFullYear(), mes: agora.getMonth() });
  const [dataSel, setDataSel]       = React.useState(hoje());
  const [barbeiros, setBarbeiros]   = React.useState([]);
  const [filtro, setFiltro]         = React.useState('todos');
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [marcados, setMarcados]     = React.useState({});
  const [carregando, setCarregando] = React.useState(true);
  const [concluindo, setConcluindo] = React.useState(null);

  // Carregar barbeiros
  React.useEffect(() => {
    getDocs(collection(db, 'barbeiros')).then(snap => {
      setBarbeiros(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => b.ativo && b.papel !== 'recepcao'));
    }).catch(console.error);
  }, []);

  // Marcar dias com agendamentos no mês
  React.useEffect(() => {
    const { ano, mes } = anoMes;
    const inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
    const fim    = `${ano}-${String(mes+1).padStart(2,'0')}-31`;
    getDocs(query(collection(db, 'agendamentos'), where('data', '>=', inicio), where('data', '<=', fim)))
      .then(snap => {
        const c = {};
        snap.docs.forEach(d => {
          const { data, status } = d.data();
          if (!status?.includes('cancelado')) c[data] = (c[data] || 0) + 1;
        });
        setMarcados(c);
      }).catch(console.error);
  }, [anoMes]);

  // Agendamentos do dia em tempo real
  React.useEffect(() => {
    setCarregando(true);
    const unsub = onSnapshot(
      query(collection(db, 'agendamentos'), where('data', '==', dataSel)),
      snap => {
        setAgendamentos(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })).sort((a, b) => a.hora.localeCompare(b.hora)));
        setCarregando(false);
      },
      err => { console.error(err); setCarregando(false); }
    );
    return () => unsub();
  }, [dataSel]);

  const agsFiltrados = agendamentos.filter(a =>
    !a.status?.includes('cancelado') &&
    (filtro === 'todos' || a.barbeiroId === filtro)
  );
  const confirmados = agsFiltrados.filter(a => a.status === 'confirmado').length;
  const concluidos  = agsFiltrados.filter(a => a.status === 'concluido').length;
  const totalDia    = agsFiltrados.reduce((acc, a) => acc + (a.valor || 0), 0);

  async function handleConcluir(ag) {
    setConcluindo(ag.firestoreId);
    try {
      await updateDoc(doc(db, 'agendamentos', ag.firestoreId), { status: 'concluido', concluidoEm: serverTimestamp() });
    } catch (e) { console.error(e); }
    finally { setConcluindo(null); }
  }

  function handleSelData(data) {
    setDataSel(data);
    const [a, m] = data.split('-').map(Number);
    if (m - 1 !== anoMes.mes || a !== anoMes.ano) setAnoMes({ ano: a, mes: m - 1 });
  }

  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #5C2218, #8B3A2A)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>📅 Agenda Geral</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>Todos os barbeiros</div>
        </div>
        <button onClick={() => handleSelData(hoje())} style={{ background: 'rgba(245,239,230,0.15)', border: '1px solid rgba(245,239,230,0.3)', borderRadius: '8px', padding: '6px 10px', color: '#F5EFE6', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
          Hoje
        </button>
      </div>

      {/* Navegação mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #3A2018' }}>
        <button onClick={() => setAnoMes(({ ano, mes }) => mes === 0 ? { ano: ano-1, mes: 11 } : { ano, mes: mes-1 })}
          style={{ background: '#231410', border: '1px solid #3A2018', borderRadius: '8px', padding: '6px 14px', color: '#F5EFE6', cursor: 'pointer', fontSize: '16px' }}>‹</button>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', color: '#E8C96A', fontWeight: '700' }}>
          {MESES_LABEL[anoMes.mes]} {anoMes.ano}
        </div>
        <button onClick={() => setAnoMes(({ ano, mes }) => mes === 11 ? { ano: ano+1, mes: 0 } : { ano, mes: mes+1 })}
          style={{ background: '#231410', border: '1px solid #3A2018', borderRadius: '8px', padding: '6px 14px', color: '#F5EFE6', cursor: 'pointer', fontSize: '16px' }}>›</button>
      </div>

      {/* Calendário */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid #3A2018' }}>
        <Calendario ano={anoMes.ano} mes={anoMes.mes} dataSel={dataSel} onSelecionar={handleSelData} marcados={marcados} />
      </div>

      {/* Filtro barbeiro */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: '6px', padding: '10px 16px', borderBottom: '1px solid #3A2018' }}>
        {[{ id: 'todos', nome: '👥 Todos' }, ...barbeiros.map(b => ({ id: b.id, nome: b.nome }))].map(b => (
          <button key={b.id} onClick={() => setFiltro(b.id)} style={{
            padding: '6px 14px', borderRadius: '20px',
            background: filtro === b.id ? '#8B3A2A' : '#231410',
            color: filtro === b.id ? '#F5EFE6' : '#9A8880',
            fontSize: '12px', fontWeight: filtro === b.id ? '700' : '400',
            cursor: 'pointer', whiteSpace: 'nowrap',
            border: filtro === b.id ? '1px solid #E8C96A' : '1px solid #3A2018',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {b.nome}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {/* Data + resumo */}
        <div style={{ fontSize: '14px', color: '#E8C96A', fontWeight: '700', marginBottom: '10px' }}>
          {diaSemanaCompleto(dataSel)}, {formatarData(dataSel)}
          {dataSel === hoje() && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9A8880' }}>— Hoje</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Confirmados', value: confirmados, color: '#4CAF50' },
            { label: 'Concluídos',  value: concluidos,  color: '#2E7D7A' },
            { label: 'Receita',     value: `R$${totalDia.toFixed(0)}`, color: '#E8C96A' },
          ].map(item => (
            <div key={item.label} style={{ background: '#231410', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid #3A2018' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '10px', color: '#9A8880', marginTop: '2px' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9A8880' }}>⏳ Carregando...</div>
        ) : agsFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A', marginBottom: '6px' }}>Nenhum agendamento</div>
            <div style={{ fontSize: '13px', color: '#9A8880' }}>Selecione uma data no calendário</div>
          </div>
        ) : (
          agsFiltrados.map(ag => (
            <CardAg key={ag.firestoreId} ag={ag} onConcluir={handleConcluir} concluindo={concluindo} />
          ))
        )}
      </div>
    </div>
  );
}
