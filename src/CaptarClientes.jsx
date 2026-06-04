// CaptarClientes.jsx — Flyguer BarberShop
// ✅ Módulo de captação via WhatsApp — barbeiro e recepção
// ✅ Fila visual com status individual por número
// ✅ Mensagem padrão com link do app
// ✅ Disparo individual abre wa.me com texto pré-preenchido

import React from 'react';

const LINK_APP = 'https://flyguer-barbershop.vercel.app';

const MENSAGEM_PADRAO =
  `Olá! 👋\n\n` +
  `A *Flyguer BarberShop* está com um novo aplicativo de agendamentos em tempo real! 🚀\n\n` +
  `✂️ Consulte os horários disponíveis dos nossos barbeiros e garanta sua vaga com apenas alguns toques:\n\n` +
  `👉 ${LINK_APP}\n\n` +
  `📍 Shopping Cidade das Artes — Piso 2, Nº 22\n` +
  `📞 (11) 97764-3509\n\n` +
  `_Flyguer BarberShop — Nossa Arte, Seu Estilo._`;

function normalizarTel(raw) {
  const digits = raw.replace(/\D/g, '');
  // Garante 55 + DDD + número
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 11 || digits.length === 10) return '55' + digits;
  return digits.length >= 8 ? '55' + digits : null;
}

function formatarExibicao(tel) {
  const d = tel.replace(/\D/g, '');
  const n = d.startsWith('55') ? d.slice(2) : d;
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return tel;
}

export default function CaptarClientes({ nomeRemetente }) {
  const [numerosRaw, setNumerosRaw]   = React.useState('');
  const [mensagem, setMensagem]       = React.useState(MENSAGEM_PADRAO);
  const [fila, setFila]               = React.useState([]); // [{tel, display, status: 'pendente'|'enviado'|'erro'}]
  const [editandoMsg, setEditando]    = React.useState(false);
  const [processado, setProcessado]   = React.useState(false);

  function gerarFila() {
    const linhas = numerosRaw
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const itens = [];
    const vistos = new Set();

    linhas.forEach(raw => {
      const norm = normalizarTel(raw);
      if (!norm) return; // inválido
      if (vistos.has(norm)) return; // duplicado
      vistos.add(norm);
      itens.push({ tel: norm, display: formatarExibicao(raw), status: 'pendente' });
    });

    if (itens.length === 0) return;
    setFila(itens);
    setProcessado(true);
  }

  function disparar(idx) {
    const item = fila[idx];
    if (!item || item.status === 'enviado') return;
    const url = `https://wa.me/${item.tel}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    setFila(prev => prev.map((f, i) => i === idx ? { ...f, status: 'enviado' } : f));
  }

  function dispararTodos() {
    fila.forEach((item, idx) => {
      if (item.status !== 'enviado') {
        setTimeout(() => disparar(idx), idx * 600); // espaça 600ms entre cada
      }
    });
  }

  function resetar() {
    setFila([]);
    setNumerosRaw('');
    setProcessado(false);
  }

  const pendentes  = fila.filter(f => f.status === 'pendente').length;
  const enviados   = fila.filter(f => f.status === 'enviado').length;

  return (
    <div style={{ paddingBottom: '24px' }}>

      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', borderRadius:'14px', padding:'14px 16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ fontSize:'28px', flexShrink:0 }}>📣</div>
        <div>
          <div style={{ fontWeight:'700', fontSize:'15px', color:'#fff' }}>Captar Clientes</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.8)', marginTop:'2px' }}>
            Dispare convites via WhatsApp para quem ainda não está no app
          </div>
        </div>
      </div>

      {!processado ? (
        <>
          {/* Área de números */}
          <div style={{ marginBottom:'16px' }}>
            <label style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>
              Números de telefone
            </label>
            <textarea
              value={numerosRaw}
              onChange={e => setNumerosRaw(e.target.value)}
              placeholder={'Cole ou digite os números aqui:\n11999999999\n11988888888\n\nUm por linha, ou separados por vírgula.\nNão precisam estar no sistema.'}
              rows={7}
              style={{ width:'100%', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'12px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', lineHeight:'1.7' }}
            />
            <div style={{ fontSize:'10px', color:'#555', marginTop:'4px' }}>
              Aceita DDD + número. Ex: 11999999999 ou (11) 99999-9999
            </div>
          </div>

          {/* Mensagem editável */}
          <div style={{ marginBottom:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
              <label style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px' }}>
                Mensagem padrão
              </label>
              <button onClick={() => setEditando(v => !v)}
                style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'8px', border:'1px solid rgba(232,201,106,0.3)', background:'rgba(232,201,106,0.1)', color:'#E8C96A', cursor:'pointer', fontWeight:'600' }}>
                {editandoMsg ? '✓ Pronto' : '✏️ Editar'}
              </button>
            </div>
            {editandoMsg ? (
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={9}
                style={{ width:'100%', background:'#231410', border:'1px solid #E8C96A', borderRadius:'12px', padding:'12px 14px', color:'#F5EFE6', fontSize:'13px', outline:'none', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', lineHeight:'1.7' }}
              />
            ) : (
              <div style={{ background:'#231410', borderRadius:'12px', padding:'12px 14px', border:'1px solid #3A2018', fontSize:'13px', color:'rgba(245,239,230,0.85)', lineHeight:'1.7', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {mensagem}
              </div>
            )}
            <button onClick={() => setMensagem(MENSAGEM_PADRAO)}
              style={{ fontSize:'10px', color:'#555', background:'none', border:'none', cursor:'pointer', marginTop:'4px', textDecoration:'underline' }}>
              Restaurar mensagem original
            </button>
          </div>

          <button onClick={gerarFila} disabled={!numerosRaw.trim()}
            style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:!numerosRaw.trim()?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:!numerosRaw.trim()?'#555':'#fff', fontSize:'15px', fontWeight:'700', cursor:!numerosRaw.trim()?'not-allowed':'pointer' }}>
            ▶ Gerar fila de envio
          </button>
        </>
      ) : (
        <>
          {/* Resumo da fila */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
            <div style={{ background:'#231410', borderRadius:'12px', padding:'12px', textAlign:'center', border:'1px solid #3A2018' }}>
              <div style={{ fontSize:'22px', fontWeight:'700', color:'#FFC107' }}>{pendentes}</div>
              <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>Pendentes</div>
            </div>
            <div style={{ background:'#231410', borderRadius:'12px', padding:'12px', textAlign:'center', border:'1px solid rgba(76,175,80,0.3)' }}>
              <div style={{ fontSize:'22px', fontWeight:'700', color:'#4CAF50' }}>{enviados}</div>
              <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>Enviados ✅</div>
            </div>
          </div>

          {/* Botão disparar todos */}
          {pendentes > 0 && (
            <button onClick={dispararTodos}
              style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              📲 Disparar todos de uma vez ({pendentes})
            </button>
          )}

          {pendentes === 0 && enviados > 0 && (
            <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.3)', borderRadius:'12px', padding:'14px', textAlign:'center', marginBottom:'12px' }}>
              <div style={{ fontSize:'24px', marginBottom:'4px' }}>🎉</div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#4CAF50' }}>Todos os convites foram disparados!</div>
              <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'4px' }}>Agora é só aguardar os cadastros chegarem.</div>
            </div>
          )}

          {/* Lista da fila */}
          <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
            Fila de envio ({fila.length})
          </div>
          {fila.map((item, idx) => (
            <div key={idx} style={{ display:'flex', alignItems:'center', gap:'12px', background:item.status==='enviado'?'rgba(76,175,80,0.06)':'#231410', borderRadius:'12px', padding:'12px 14px', border:`1px solid ${item.status==='enviado'?'rgba(76,175,80,0.3)':'#3A2018'}`, marginBottom:'8px', transition:'all 0.3s' }}>
              {/* Avatar */}
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:item.status==='enviado'?'rgba(76,175,80,0.2)':'#2E1A14', border:`1px solid ${item.status==='enviado'?'#4CAF50':'#3A2018'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
                {item.status==='enviado'?'✅':'👤'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:'600', color:item.status==='enviado'?'#4CAF50':'#F5EFE6' }}>{item.display}</div>
                <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'1px' }}>
                  {item.status==='enviado'?'✅ Convite enviado — aguardando cadastro':'⏳ Aguardando disparo'}
                </div>
              </div>
              <button
                onClick={() => disparar(idx)}
                disabled={item.status === 'enviado'}
                style={{
                  padding:'8px 14px', borderRadius:'10px', border:'none',
                  background:item.status==='enviado'?'rgba(76,175,80,0.1)':'linear-gradient(135deg,#25D366,#128C7E)',
                  color:item.status==='enviado'?'#4CAF50':'#fff',
                  fontSize:'12px', fontWeight:'700',
                  cursor:item.status==='enviado'?'default':'pointer',
                  flexShrink:0, whiteSpace:'nowrap',
                  transition:'all 0.2s',
                }}>
                {item.status==='enviado'?'Enviado ✓':'📲 Disparar'}
              </button>
            </div>
          ))}

          {/* Resetar */}
          <button onClick={resetar}
            style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'transparent', color:'#9A8880', fontSize:'13px', cursor:'pointer', marginTop:'8px' }}>
            ← Nova lista
          </button>
        </>
      )}
    </div>
  );
}
