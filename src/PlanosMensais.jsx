// PlanosMensais.jsx — Flyguer BarberShop
// ✅ Passo 12 v2 — Planos reais: Bronze, Prata, Ouro
// ✅ servicosInclusos editável pelo gerente
// ✅ Suporte a planos futuros: Diamante, Titanium, Zeus...

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

const ICONES = ['🥉','🥈','🥇','💎','👑','🔥','⚡','🌟','🏆','🐉'];
const CORES  = ['#CD7F32','#9E9E9E','#C9A84C','#2E7D7A','#8B3A2A','#4CAF50','#2196F3','#9C27B0','#FF5722','#E91E63'];

const PLANOS_SEED = [
  {
    nome: 'Bronze',
    icone: '🥉',
    preco: 139.99,
    cor: '#CD7F32',
    descricao: 'Plano ideal para quem quer manutenção mensal',
    servicosInclusos: ['4 cortes', '4 sobrancelhas'],
    destaque: false,
    ativo: true,
  },
  {
    nome: 'Prata',
    icone: '🥈',
    preco: 219.99,
    cor: '#9E9E9E',
    descricao: 'Para quem quer o visual completo todo mês',
    servicosInclusos: ['4 cortes', '4 barbas', '4 sobrancelhas'],
    destaque: true,
    ativo: true,
  },
  {
    nome: 'Ouro',
    icone: '🥇',
    preco: 249.99,
    cor: '#C9A84C',
    descricao: 'A experiência premium completa da Flyguer',
    servicosInclusos: ['4 cortes', '4 barbas', '4 sobrancelhas', 'Abono no estacionamento', '10% de desconto em produtos'],
    destaque: false,
    ativo: true,
  },
];

export default function PlanosMensais({ onBack, dark }) {
  const s = getStyles(dark);
  const [planos, setPlanos]     = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [modal, setModal]       = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');
  const [confirmarExcluir, setConfirmarExcluir] = React.useState(null);

  const formVazio = { nome: '', icone: '🥉', preco: '', cor: '#CD7F32', descricao: '', servicosInclusos: [], destaque: false, ativo: true };
  const [form, setForm]         = React.useState(formVazio);
  const [novoServico, setNovoServico] = React.useState('');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  React.useEffect(() => {
    let unsub;
    (async () => {
      const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore');
      const q = query(collection(db, 'planos'), orderBy('preco', 'asc'));
      unsub = onSnapshot(q, snap => {
        setPlanos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    })();
    return () => unsub && unsub();
  }, []);

  async function seedPlanos() {
    setSalvando(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      for (const p of PLANOS_SEED) {
        await addDoc(collection(db, 'planos'), { ...p, criadoEm: serverTimestamp() });
      }
    } catch (e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  function abrirNovo() {
    setForm(formVazio);
    setNovoServico('');
    setErro('');
    setModal('novo');
  }

  function abrirEditar(plano) {
    setForm({
      nome: plano.nome,
      icone: plano.icone || '🥉',
      preco: String(plano.preco),
      cor: plano.cor || '#C9A84C',
      descricao: plano.descricao || '',
      servicosInclusos: plano.servicosInclusos || [],
      destaque: plano.destaque || false,
      ativo: plano.ativo !== false,
    });
    setNovoServico('');
    setErro('');
    setModal(plano);
  }

  function adicionarServico() {
    const sv = novoServico.trim();
    if (!sv) return;
    if (form.servicosInclusos.includes(sv)) { setErro('Serviço já adicionado.'); return; }
    setForm(f => ({ ...f, servicosInclusos: [...f.servicosInclusos, sv] }));
    setNovoServico('');
    setErro('');
  }

  function removerServico(idx) {
    setForm(f => ({ ...f, servicosInclusos: f.servicosInclusos.filter((_, i) => i !== idx) }));
  }

  async function salvar() {
    if (!form.nome.trim())                        { setErro('Nome é obrigatório.'); return; }
    if (!form.preco || isNaN(Number(form.preco))) { setErro('Preço inválido.'); return; }
    if (form.servicosInclusos.length === 0)       { setErro('Adicione pelo menos 1 serviço incluso.'); return; }
    setSalvando(true); setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const dados = {
        nome: form.nome.trim(), icone: form.icone, preco: Number(form.preco),
        cor: form.cor, descricao: form.descricao.trim(),
        servicosInclusos: form.servicosInclusos, destaque: form.destaque, ativo: form.ativo,
      };
      if (modal === 'novo') {
        await addDoc(collection(db, 'planos'), { ...dados, criadoEm: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'planos', modal.id), { ...dados, atualizadoEm: serverTimestamp() });
      }
      setModal(null);
    } catch (e) { setErro('Erro ao salvar: ' + e.message); }
    setSalvando(false);
  }

  async function excluir(plano) {
    setSalvando(true);
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'planos', plano.id));
      setConfirmarExcluir(null);
    } catch (e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  async function toggleAtivo(plano) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'planos', plano.id), { ativo: !plano.ativo });
    } catch (e) { setErro('Erro: ' + e.message); }
  }

  async function toggleDestaque(plano) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'planos', plano.id), { destaque: !plano.destaque });
    } catch (e) { setErro('Erro: ' + e.message); }
  }

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      <div style={{ background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#F5EFE6', fontWeight: '700' }}>Planos Mensais</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>{planos.length} plano{planos.length !== 1 ? 's' : ''} cadastrado{planos.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={abrirNovo} style={{ background: '#C9A84C', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#1A0F0D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Novo Plano</button>
      </div>

      <div style={{ padding: '20px' }}>

        {planos.length === 0 && !loading && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💈</div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: textMain, marginBottom: '6px' }}>Nenhum plano cadastrado</div>
            <div style={{ fontSize: '12px', color: textSub, marginBottom: '16px' }}>Use os planos oficiais da Flyguer ou crie do zero</div>
            <button onClick={seedPlanos} disabled={salvando} style={{ background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '10px', padding: '12px 20px', color: '#F5EFE6', fontWeight: '700', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
              {salvando ? 'Criando...' : '🚀 Criar Planos Bronze, Prata e Ouro'}
            </button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>Carregando planos...</div>}

        {planos.map(plano => (
          <div key={plano.id} style={{ background: cardBg, border: `1px solid ${plano.ativo ? (plano.cor || '#C9A84C') + '55' : border}`, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden', opacity: plano.ativo ? 1 : 0.6, position: 'relative' }}>
            <div style={{ height: '4px', background: plano.cor || '#C9A84C' }} />
            {plano.destaque && (
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: plano.cor || '#C9A84C', color: '#fff', fontSize: '10px', fontWeight: '700', borderRadius: '6px', padding: '2px 8px' }}>⭐ MAIS POPULAR</div>
            )}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '36px' }}>{plano.icone || '💈'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '17px', color: textMain }}>{plano.nome}</span>
                    {!plano.ativo && <span style={{ fontSize: '10px', background: '#444', color: '#aaa', borderRadius: '6px', padding: '2px 8px' }}>Inativo</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: textSub, marginTop: '2px' }}>{plano.descricao}</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: plano.cor || '#C9A84C', marginTop: '6px' }}>
                    R$ {Number(plano.preco).toFixed(2)}<span style={{ fontSize: '12px', fontWeight: '400', color: textSub }}>/mês</span>
                  </div>
                </div>
              </div>

              <div style={{ background: dark ? '#1A0F0D' : '#f9f5f0', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: textSub, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Incluso no plano</div>
                {(plano.servicosInclusos || []).map((sv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: plano.cor || '#C9A84C', fontSize: '14px', fontWeight: '700' }}>✓</span>
                    <span style={{ fontSize: '13px', color: textMain }}>{sv}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => abrirEditar(plano)} style={{ flex: 1, background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px', fontSize: '12px', color: textMain, cursor: 'pointer', fontWeight: '600' }}>✏️ Editar</button>
                <button onClick={() => toggleDestaque(plano)} style={{ flex: 1, background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px', fontSize: '12px', color: plano.destaque ? '#E8C96A' : textSub, cursor: 'pointer', fontWeight: '600' }}>
                  {plano.destaque ? '⭐ Destaque' : '☆ Destacar'}
                </button>
                <button onClick={() => toggleAtivo(plano)} style={{ flex: 1, background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px', fontSize: '12px', color: plano.ativo ? '#FFC107' : '#4CAF50', cursor: 'pointer', fontWeight: '600' }}>
                  {plano.ativo ? '⏸ Pausar' : '▶️ Ativar'}
                </button>
                <button onClick={() => setConfirmarExcluir(plano)} style={{ background: '#2E1A14', border: '1px solid #8B3A2A', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#F44336', cursor: 'pointer' }}>🗑</button>
              </div>
            </div>
          </div>
        ))}

        {erro && !modal && (
          <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#F44336', marginTop: '8px' }}>{erro}</div>
        )}
      </div>

      {/* MODAL NOVO/EDITAR */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: dark ? '#1A0F0D' : '#fff', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: '430px', maxHeight: '92vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: textMain, fontWeight: '700' }}>
                {modal === 'novo' ? '+ Novo Plano' : `Editar — ${modal.nome}`}
              </div>
              <button onClick={() => { setModal(null); setErro(''); }} style={{ background: dark ? '#2E1A14' : '#f5efe6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: textMain, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Ícone */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Ícone</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ICONES.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icone: ic }))}
                    style={{ fontSize: '22px', background: form.icone === ic ? (dark ? '#3A2018' : '#fdf0dc') : (dark ? '#2E1A14' : '#f5efe6'), border: form.icone === ic ? '2px solid #C9A84C' : '2px solid transparent', borderRadius: '10px', width: '40px', height: '40px', cursor: 'pointer' }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nome *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Diamante, Titanium, Zeus..."
                style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Preço */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Mensalidade (R$) *</label>
              <input value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                placeholder="139.99" type="number" min="0" step="0.01"
                style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Breve descrição..."
                style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Cor */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Cor</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CORES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: form.cor === c ? '3px solid #F5EFE6' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            {/* Serviços inclusos */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Serviços inclusos *</label>
              {form.servicosInclusos.map((sv, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: dark ? '#2E1A14' : '#f5efe6', borderRadius: '8px', padding: '8px 12px', marginBottom: '6px' }}>
                  <span style={{ color: form.cor || '#C9A84C', fontSize: '14px', fontWeight: '700' }}>✓</span>
                  <span style={{ flex: 1, fontSize: '13px', color: textMain }}>{sv}</span>
                  <button onClick={() => removerServico(i)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input value={novoServico} onChange={e => setNovoServico(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarServico()}
                  placeholder="Ex: 4 cortes, abono estacionamento..."
                  style={{ ...s.input, flex: 1 }} />
                <button onClick={adicionarServico}
                  style={{ background: '#8B3A2A', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#F5EFE6', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                  + Add
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ position: 'relative', width: '44px', height: '24px', flexShrink: 0 }}>
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
                  <div style={{ position: 'absolute', inset: 0, background: form.ativo ? '#4CAF50' : '#555', borderRadius: '12px' }} />
                  <div style={{ position: 'absolute', top: '3px', left: form.ativo ? '23px' : '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
                </div>
                <span style={{ fontSize: '12px', color: textMain }}>Ativo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ position: 'relative', width: '44px', height: '24px', flexShrink: 0 }}>
                  <input type="checkbox" checked={form.destaque} onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
                  <div style={{ position: 'absolute', inset: 0, background: form.destaque ? '#E8C96A' : '#555', borderRadius: '12px' }} />
                  <div style={{ position: 'absolute', top: '3px', left: form.destaque ? '23px' : '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
                </div>
                <span style={{ fontSize: '12px', color: textMain }}>⭐ Mais popular</span>
              </div>
            </div>

            {erro && (
              <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#F44336', marginBottom: '12px' }}>{erro}</div>
            )}

            <button onClick={salvar} disabled={salvando}
              style={{ width: '100%', background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '12px', padding: '14px', color: '#F5EFE6', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              {salvando ? 'Salvando...' : (modal === 'novo' ? '✅ Criar Plano' : '✅ Salvar Alterações')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: dark ? '#1A0F0D' : '#fff', borderRadius: '20px', padding: '28px 24px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: textMain, marginBottom: '8px' }}>Excluir "{confirmarExcluir.nome}"?</div>
            <div style={{ fontSize: '12px', color: textSub, marginBottom: '20px' }}>Assinantes ativos não serão afetados, mas o plano deixará de aparecer para novos clientes.</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmarExcluir(null)} style={{ flex: 1, background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '10px', padding: '12px', fontSize: '13px', color: textMain, cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
              <button onClick={() => excluir(confirmarExcluir)} disabled={salvando} style={{ flex: 1, background: '#8B3A2A', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#F5EFE6', cursor: 'pointer', fontWeight: '700' }}>
                {salvando ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
