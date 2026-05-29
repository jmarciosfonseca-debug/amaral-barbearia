// PainelRecepcao.jsx — Flyguer BarberShop
// ─────────────────────────────────────────────────────────────
// Passo 10: Painel da Recepção — v2
// CORREÇÕES:
// ✅ Feedback de sucesso após criar agendamento
// ✅ Validação de horário (cruza com agendamentos existentes)
// ✅ Redireciona para fila após criar
// ✅ Query Firestore simplificada (evita erro 400)
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
function hoje() {
  return new Date().toISOString().split('T')[0];
}

function moeda(valor) {
  return `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`;
}

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro',  label: '💵 Dinheiro', cor: '#4CAF50' },
  { id: 'cartao',    label: '💳 Cartão',   cor: '#2196F3' },
  { id: 'pix_local', label: '📱 Pix',      cor: '#2E7D7A' },
];

// ─────────────────────────────────────────────────────────────
// TOAST DE SUCESSO
// ─────────────────────────────────────────────────────────────
function Toast({ mensagem, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: '80px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
      color: '#F5EFE6', padding: '12px 24px', borderRadius: '16px',
      fontSize: '14px', fontWeight: '700', zIndex: 9999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
    }}>
      {mensagem}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: CONFIRMAR PAGAMENTO
// ─────────────────────────────────────────────────────────────
function ModalPagamento({ agendamento, onConfirmar, onFechar }) {
  const [forma, setForma]       = React.useState('dinheiro');
  const [valor, setValor]       = React.useState(agendamento.valor || 0);
  const [obs, setObs]           = React.useState('');
  const [salvando, setSalvando] = React.useState(false);

  const sinalPago     = agendamento.sinal || 0;
  const valorRestante = Math.max(0, valor - sinalPago);

  async function handleConfirmar() {
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status:          'concluido',
        pagamentoFinal:  forma,
        valorFinal:      valor,
        sinalAbatido:    sinalPago,
        valorRecebido:   valorRestante,
        observacaoCaixa: obs,
        concluidoEm:     serverTimestamp(),
        pagoEm:          serverTimestamp(),
      });
      onConfirmar();
    } catch (e) {
      console.error(e);
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
      zIndex: 999,
    }}>
      <div style={{
        background: '#1A0F0D', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: '430px', padding: '24px 20px 40px',
        border: '1px solid #3A2018', borderBottom: 'none',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>
            💰 Confirmar Pagamento
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Resumo */}
        <div style={{ background: '#231410', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid #3A2018' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#F5EFE6', marginBottom: '4px' }}>
            {agendamento.clienteNome?.split(' ').slice(0, 2).join(' ')}
          </div>
          <div style={{ fontSize: '12px', color: '#9A8880' }}>
            ✂️ {agendamento.barbeiroNome} · 💈 {agendamento.servico} · 🕐 {agendamento.hora}
          </div>
        </div>

        {/* Valor */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Valor do serviço (R$)</label>
          <input type="number" style={inputStyle} value={valor}
            onChange={e => setValor(parseFloat(e.target.value) || 0)} />
        </div>

        {/* Sinal */}
        {sinalPago > 0 && (
          <div style={{
            background: 'rgba(46,125,122,0.1)', border: '1px solid rgba(46,125,122,0.3)',
            borderRadius: '10px', padding: '10px 12px', marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#9A8880' }}>Sinal Pix já pago:</span>
              <span style={{ fontSize: '12px', color: '#2E7D7A', fontWeight: '700' }}>- {moeda(sinalPago)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: '#F5EFE6', fontWeight: '600' }}>A receber agora:</span>
              <span style={{ fontSize: '16px', color: '#E8C96A', fontWeight: '700' }}>{moeda(valorRestante)}</span>
            </div>
          </div>
        )}

        {/* Forma de pagamento */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '8px' }}>Forma de pagamento recebida</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {FORMAS_PAGAMENTO.map(f => (
              <button key={f.id} onClick={() => setForma(f.id)} style={{
                flex: 1, padding: '10px 6px', borderRadius: '10px',
                border: forma === f.id ? `2px solid ${f.cor}` : '1px solid #3A2018',
                background: forma === f.id ? `${f.cor}22` : '#231410',
                color: forma === f.id ? f.cor : '#9A8880',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Observação */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Observação (opcional)</label>
          <input type="text" style={inputStyle} value={obs}
            onChange={e => setObs(e.target.value)} placeholder="Ex: cliente pagou com troco" />
        </div>

        <button onClick={handleConfirmar} disabled={salvando} style={{
          width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
          color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
          cursor: salvando ? 'wait' : 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {salvando ? '⏳ Registrando...' : `✅ Confirmar ${moeda(valorRestante)} recebido`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL: NOVO AGENDAMENTO MANUAL
// ─────────────────────────────────────────────────────────────
function ModalNovoAgendamento({ agendamentosHoje, onSalvar, onFechar }) {
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [servicos, setServicos]   = React.useState([]);
  // ✅ Múltiplos serviços selecionados
  const [servicosSel, setServicosSel] = React.useState([]);
  const [form, setForm] = React.useState({
    clienteNome: '', clienteTel: '', clienteCpf: 'manual',
    barbeiroId: '', barbeiroNome: '',
    data: hoje(), hora: '09:00',
    pagamento: 'local', observacao: '',
  });
  const [salvando, setSalvando]   = React.useState(false);
  const [erro, setErro]           = React.useState('');
  const [horariosOcupados, setHorariosOcupados] = React.useState([]);

  // Totais calculados dos serviços selecionados
  const totalValor   = servicosSel.reduce((acc, s) => acc + (s.valor || 0), 0);
  const totalDuracao = servicosSel.reduce((acc, s) => acc + (s.duracao || 0), 0);
  const nomeServicos = servicosSel.map(s => s.nome).join(' + ');

  function toggleServico(sv) {
    setServicosSel(prev => {
      const jatem = prev.find(s => s.id === sv.id);
      if (jatem) return prev.filter(s => s.id !== sv.id);
      return [...prev, sv];
    });
    setErro('');
  }

  React.useEffect(() => {
    getDocs(collection(db, 'barbeiros')).then(snap => {
      // ✅ Filtra recepção — só barbeiros reais
      setBarbeiros(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.ativo && b.papel !== 'recepcao')
      );
    });

    // Carregar serviços
    import('firebase/firestore').then(({ getDoc, doc: fDoc }) => {
      getDoc(fDoc(db, 'config', 'servicos')).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setServicos([
            ...(data.avulsos || []).filter(s => s.ativo),
            ...(data.combos  || []).filter(s => s.ativo),
          ]);
        }
      });
    });
  }, []);

  // ✅ Atualiza horários ocupados quando barbeiro ou data muda
  React.useEffect(() => {
    if (!form.barbeiroId || !form.data) {
      setHorariosOcupados([]);
      return;
    }

    // Busca no Firestore agendamentos do barbeiro nessa data
    // (evita índice composto — filtra client-side)
    getDocs(
      query(
        collection(db, 'agendamentos'),
        where('data', '==', form.data),
      )
    ).then(snap => {
      const ocupados = snap.docs
        .map(d => d.data())
        .filter(a =>
          a.barbeiroId === form.barbeiroId &&
          !['cancelado', 'cancelado_cliente', 'cancelado_barbearia'].includes(a.status)
        )
        .map(a => a.hora);
      setHorariosOcupados(ocupados);
    });
  }, [form.barbeiroId, form.data]);

  function setField(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
    setErro('');
  }

  function handleBarbeiroChange(id) {
    const b = barbeiros.find(b => b.id === id);
    setField('barbeiroId', id);
    setField('barbeiroNome', b?.nome || '');
  }

  // ✅ Gera lista de horários com status (livre/ocupado)
  function gerarHorarios() {
    const slots = [];
    for (let h = 8; h <= 20; h++) {
      for (let m of [0, 30]) {
        const hora = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        slots.push({ hora, ocupado: horariosOcupados.includes(hora) });
      }
    }
    return slots;
  }

  async function handleSalvar() {
    if (!form.clienteNome.trim()) { setErro('Nome do cliente obrigatório'); return; }
    if (!form.barbeiroId)         { setErro('Selecione o barbeiro'); return; }
    if (servicosSel.length === 0) { setErro('Selecione ao menos um serviço'); return; }

    if (horariosOcupados.includes(form.hora)) {
      setErro(`⚠️ Horário ${form.hora} já está ocupado para este barbeiro!`);
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await addDoc(collection(db, 'agendamentos'), {
        ...form,
        servico:     nomeServicos,
        valor:       totalValor,
        duracao:     totalDuracao,
        servicoIds:  servicosSel.map(s => s.id).filter(Boolean),
        status:      'confirmado',
        agendadoPor: 'recepcao',
        sinal:       0,
        criadoEm:    serverTimestamp(),
      });
      onSalvar();
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.');
      console.error(e);
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

  const horarios = gerarHorarios();

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
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A' }}>
            ➕ Agendamento Manual
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#9A8880', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Nome e telefone */}
        {[
          { label: 'Nome do cliente *', campo: 'clienteNome', placeholder: 'Nome completo', type: 'text' },
          { label: 'Telefone / WhatsApp', campo: 'clienteTel', placeholder: '11999999999', type: 'tel' },
        ].map(f => (
          <div key={f.campo} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <input type={f.type} style={inputStyle} placeholder={f.placeholder}
              value={form[f.campo]} onChange={e => setField(f.campo, e.target.value)} />
          </div>
        ))}

        {/* Barbeiro — ✅ sem recepção */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Barbeiro *</label>
          <select style={inputStyle} value={form.barbeiroId} onChange={e => handleBarbeiroChange(e.target.value)}>
            <option value="">Selecione...</option>
            {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>

        {/* ✅ Serviços — seleção múltipla com total */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '8px' }}>
            Serviços * <span style={{ color: '#555' }}>(selecione um ou mais)</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {servicos.map(sv => {
              const sel = !!servicosSel.find(s => s.id === sv.id);
              return (
                <div
                  key={sv.id}
                  onClick={() => toggleServico(sv)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    background: sel ? '#2E1A14' : '#1A0F0D',
                    border: sel ? '1.5px solid #8B3A2A' : '1px solid #3A2018',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                      border: `2px solid ${sel ? '#8B3A2A' : '#3A2018'}`,
                      background: sel ? '#8B3A2A' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: '#F5EFE6',
                    }}>
                      {sel ? '✓' : ''}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: sel ? '700' : '400', color: sel ? '#F5EFE6' : '#9A8880' }}>
                        {sv.nome}
                      </div>
                      {sv.duracao && (
                        <div style={{ fontSize: '10px', color: '#555' }}>⏱ {sv.duracao} min</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: sel ? '#E8C96A' : '#9A8880' }}>
                    R$ {sv.valor.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ✅ Total calculado */}
          {servicosSel.length > 0 && (
            <div style={{
              marginTop: '10px', padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(232,201,106,0.08)', border: '1px solid rgba(232,201,106,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#9A8880' }}>
                  {servicosSel.length} serviço(s){totalDuracao > 0 ? ` · ${totalDuracao} min` : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                  {nomeServicos}
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8C96A' }}>
                R$ {totalValor.toFixed(2).replace('.', ',')}
              </div>
            </div>
          )}
        </div>

        {/* Valor manual (editável) */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>
            Valor total (R$) <span style={{ color: '#555' }}>— ajuste se necessário</span>
          </label>
          <input type="number" style={inputStyle} value={totalValor}
            readOnly
            style={{ ...inputStyle, color: '#E8C96A', fontWeight: '700', background: '#1A0F0D' }} />
        </div>

        {/* Data */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Data</label>
          <input type="date" style={inputStyle} value={form.data}
            onChange={e => setField('data', e.target.value)} />
        </div>

        {/* ✅ Horários visuais — livre/ocupado */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '8px' }}>
            Horário {form.barbeiroId && <span style={{ color: '#555' }}>— horários ocupados em vermelho</span>}
          </label>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px',
            maxHeight: '160px', overflowY: 'auto',
          }}>
            {horarios.map(({ hora, ocupado }) => (
              <button
                key={hora}
                disabled={ocupado}
                onClick={() => !ocupado && setField('hora', hora)}
                style={{
                  padding: '8px 4px', borderRadius: '8px', border: 'none',
                  background: ocupado
                    ? 'rgba(244,67,54,0.15)'
                    : form.hora === hora
                      ? 'linear-gradient(135deg, #5C2218, #8B3A2A)'
                      : '#2E1A14',
                  color: ocupado
                    ? '#F44336'
                    : form.hora === hora
                      ? '#F5EFE6'
                      : '#9A8880',
                  fontSize: '12px', fontWeight: '600',
                  cursor: ocupado ? 'not-allowed' : 'pointer',
                  textDecoration: ocupado ? 'line-through' : 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  border: form.hora === hora && !ocupado ? '2px solid #8B3A2A' : '1px solid #3A2018',
                }}
              >
                {hora}
              </button>
            ))}
          </div>
        </div>

        {/* Pagamento */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '8px' }}>Pagamento</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'local',    label: '💵 Local'   },
              { id: 'dinheiro', label: '💵 Dinheiro' },
              { id: 'cartao',   label: '💳 Cartão'  },
              { id: 'pix',      label: '📱 Pix'     },
            ].map(f => (
              <button key={f.id} onClick={() => setField('pagamento', f.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: '10px',
                border: form.pagamento === f.id ? '2px solid #8B3A2A' : '1px solid #3A2018',
                background: form.pagamento === f.id ? 'rgba(139,58,42,0.2)' : '#231410',
                color: form.pagamento === f.id ? '#E8C96A' : '#9A8880',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Observação */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#9A8880', display: 'block', marginBottom: '5px' }}>Observação</label>
          <input type="text" style={inputStyle} placeholder="Notas adicionais..."
            value={form.observacao} onChange={e => setField('observacao', e.target.value)} />
        </div>

        {erro && (
          <div style={{
            fontSize: '13px', color: '#F44336', marginBottom: '12px',
            textAlign: 'center', background: 'rgba(244,67,54,0.1)',
            borderRadius: '10px', padding: '10px',
          }}>
            {erro}
          </div>
        )}

        <button onClick={handleSalvar} disabled={salvando} style={{
          width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
          color: '#F5EFE6', fontSize: '15px', fontWeight: '700',
          cursor: salvando ? 'wait' : 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {salvando ? '⏳ Salvando...' : '✅ Criar Agendamento'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD DE ATENDIMENTO NA FILA
// ─────────────────────────────────────────────────────────────
function CardFila({ ag, onPagar }) {
  const isPago      = ag.status === 'concluido';
  const isCancelado = ag.status?.includes('cancelado');
  const pixPago     = ag.pagamento === 'pix' || ag.pagamento === 'pix_sinal';

  return (
    <div style={{
      background: '#231410', borderRadius: '16px',
      border: isPago ? '1px solid #2E7D7A'
        : isCancelado ? '1px solid #3A1010'
        : '1px solid #3A2018',
      marginBottom: '10px', overflow: 'hidden',
      opacity: isCancelado ? 0.5 : 1,
    }}>
      <div style={{ height: '3px', background: isPago ? '#2E7D7A' : pixPago ? '#3A9E9A' : '#8B3A2A' }} />
      <div style={{ padding: '14px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: '#E8C96A' }}>
                {ag.hora}
              </span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#F5EFE6' }}>
                {ag.clienteNome?.split(' ')[0]}
              </span>
              {ag.agendadoPor === 'recepcao' && (
                <span style={{ fontSize: '10px', background: 'rgba(46,125,122,0.2)', color: '#2E7D7A', padding: '2px 6px', borderRadius: '8px' }}>
                  Manual
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#9A8880', marginTop: '2px' }}>
              ✂️ {ag.barbeiroNome} · 💈 {ag.servico}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#E8C96A' }}>{moeda(ag.valor)}</div>
            <div style={{ fontSize: '11px', color: pixPago ? '#2E7D7A' : '#9A8880' }}>
              {pixPago ? '💳 Pix pago' : '💵 No local'}
            </div>
          </div>
        </div>

        {/* Ações */}
        {isPago ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(46,125,122,0.1)', borderRadius: '10px',
            padding: '8px 12px', fontSize: '13px', color: '#2E7D7A', fontWeight: '600',
          }}>
            ✅ Pagamento confirmado
            {ag.pagamentoFinal && <span style={{ fontSize: '11px', color: '#9A8880' }}>· {ag.pagamentoFinal}</span>}
          </div>
        ) : isCancelado ? (
          <div style={{ fontSize: '12px', color: '#F44336', textAlign: 'center' }}>✗ Cancelado</div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            {!pixPago ? (
              <button onClick={() => onPagar(ag)} style={{
                flex: 2, padding: '10px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #2E7D7A, #3A9E9A)',
                color: '#F5EFE6', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
                💰 Confirmar Pagamento
              </button>
            ) : (
              <div style={{
                flex: 2, padding: '10px', borderRadius: '10px',
                background: 'rgba(46,125,122,0.15)', textAlign: 'center',
                fontSize: '13px', color: '#2E7D7A', fontWeight: '600',
              }}>
                💳 Pix já confirmado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function PainelRecepcao({ onBack, dark }) {
  const s = getStyles(dark);
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [carregando, setCarregando]     = React.useState(true);
  const [modalPagamento, setModalPagamento] = React.useState(null);
  const [modalNovo, setModalNovo]           = React.useState(false);
  const [aba, setAba]                       = React.useState('fila');
  // ✅ Toast de feedback
  const [toast, setToast] = React.useState('');

  // Escuta agendamentos de hoje em tempo real
  React.useEffect(() => {
    const q = query(
      collection(db, 'agendamentos'),
      where('data', '==', hoje()),
    );
    const unsub = onSnapshot(q, snap => {
      const ags = snap.docs
        .map(d => ({ firestoreId: d.id, ...d.data() }))
        .sort((a, b) => a.hora.localeCompare(b.hora));
      setAgendamentos(ags);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  // Cálculos
  const ativos        = agendamentos.filter(a => !a.status?.includes('cancelado'));
  const confirmados   = agendamentos.filter(a => a.status === 'confirmado');
  const concluidos    = agendamentos.filter(a => a.status === 'concluido');
  const totalPrevisto = ativos.reduce((acc, a) => acc + (a.valor || 0), 0);
  const totalRecebido = concluidos.reduce((acc, a) => acc + (a.valorRecebido || a.valor || 0), 0);
  const totalPix      = ativos.filter(a => a.pagamento === 'pix' || a.pagamento === 'pix_sinal').reduce((acc, a) => acc + (a.valor || 0), 0);

  // ✅ Após salvar novo agendamento
  function handleAgendamentoSalvo() {
    setModalNovo(false);
    setAba('fila');                        // vai para aba da fila
    setToast('✅ Agendamento criado!');    // mostra toast
  }

  // ✅ Após confirmar pagamento
  function handlePagamentoConfirmado() {
    setModalPagamento(null);
    setToast('💰 Pagamento confirmado!');
  }

  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px',
          padding: '6px 10px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>
            🏠 Recepção
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </div>
        </div>
        <button onClick={() => setModalNovo(true)} style={{
          background: 'rgba(245,239,230,0.15)', border: '1px solid rgba(245,239,230,0.3)',
          borderRadius: '10px', padding: '8px 12px',
          color: '#F5EFE6', fontSize: '12px', fontWeight: '700',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          ➕ Novo
        </button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '12px 16px', borderBottom: '1px solid #3A2018' }}>
        {[
          { label: 'Na fila',  value: confirmados.length,              color: '#FFC107' },
          { label: 'Pagos',    value: concluidos.length,               color: '#2E7D7A' },
          { label: 'Recebido', value: `R$${totalRecebido.toFixed(0)}`, color: '#E8C96A' },
        ].map(item => (
          <div key={item.label} style={{
            background: '#231410', borderRadius: '12px', padding: '10px',
            textAlign: 'center', border: '1px solid #3A2018',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '10px', color: '#9A8880', marginTop: '2px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', borderBottom: '1px solid #3A2018' }}>
        {[
          { id: 'fila',   label: `🕐 Fila do dia (${ativos.length})` },
          { id: 'resumo', label: '💰 Caixa'                          },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            flex: 1, padding: '12px', border: 'none', background: 'transparent',
            borderBottom: aba === a.id ? '2px solid #8B3A2A' : '2px solid transparent',
            color: aba === a.id ? '#F5EFE6' : '#9A8880',
            fontSize: '13px', fontWeight: aba === a.id ? '700' : '400',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {/* ABA FILA */}
        {aba === 'fila' && (
          carregando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9A8880' }}>⏳ Carregando...</div>
          ) : ativos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#E8C96A', marginBottom: '8px' }}>
                Nenhum agendamento hoje
              </div>
              <button onClick={() => setModalNovo(true)} style={{
                padding: '12px 24px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #5C2218, #8B3A2A)',
                color: '#F5EFE6', fontSize: '14px', fontWeight: '700',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
                ➕ Criar agendamento
              </button>
            </div>
          ) : (
            agendamentos.map(ag => (
              <CardFila
                key={ag.firestoreId}
                ag={ag}
                onPagar={ag => setModalPagamento(ag)}
              />
            ))
          )
        )}

        {/* ABA CAIXA */}
        {aba === 'resumo' && (
          <div>
            {[
              { label: 'Total previsto',  value: moeda(totalPrevisto),              color: '#9A8880', sub: 'Se todos comparecerem'   },
              { label: 'Total recebido',  value: moeda(totalRecebido),              color: '#4CAF50', sub: 'Pagamentos confirmados'   },
              { label: 'Via Pix',         value: moeda(totalPix),                   color: '#2E7D7A', sub: 'Pix antecipado + local'   },
              { label: 'Pendente',        value: moeda(totalPrevisto - totalRecebido), color: '#FFC107', sub: 'A receber ainda'       },
            ].map(item => (
              <div key={item.label} style={{
                background: '#231410', borderRadius: '14px', padding: '16px',
                border: '1px solid #3A2018', marginBottom: '10px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#9A8880' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{item.sub}</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {modalPagamento && (
        <ModalPagamento
          agendamento={modalPagamento}
          onConfirmar={handlePagamentoConfirmado}
          onFechar={() => setModalPagamento(null)}
        />
      )}
      {modalNovo && (
        <ModalNovoAgendamento
          agendamentosHoje={agendamentos}
          onSalvar={handleAgendamentoSalvo}
          onFechar={() => setModalNovo(false)}
        />
      )}

      {/* ✅ Toast */}
      {toast && <Toast mensagem={toast} onClose={() => setToast('')} />}
    </div>
  );
}
