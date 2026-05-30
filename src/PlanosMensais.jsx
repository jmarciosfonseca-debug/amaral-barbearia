// PlanosMensais.jsx — Flyguer BarberShop
// Passo 12 — Gerente cria, edita e exclui planos mensais

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

const ICONES = ['🥈','🥇','💎','👑','🔥','⚡','🌟','💰'];

const PLANOS_SEED = [
  {
    nome: 'Prata',
    icone: '🥈',
    preco: 89.90,
    cortesInclusos: 2,
    descricao: 'Ideal para quem corta 2x ao mês',
    cor: '#9E9E9E',
    ativo: true,
  },
  {
    nome: 'Ouro',
    icone: '🥇',
    preco: 139.90,
    cortesInclusos: 4,
    descricao: 'Para quem gosta de estar sempre no estilo',
    cor: '#C9A84C',
    ativo: true,
  },
  {
    nome: 'Diamante',
    icone: '💎',
    preco: 199.90,
    cortesInclusos: 8,
    descricao: 'Cortes ilimitados — o melhor custo-benefício',
    cor: '#2E7D7A',
    ativo: true,
  },
];

export default function PlanosMensais({ onBack, dark }) {
  const s = getStyles(dark);
  const [planos, setPlanos]     = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [modal, setModal]       = React.useState(null); // null | 'novo' | plano obj
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');
  const [confirmarExcluir, setConfirmarExcluir] = React.useState(null);

  // form state
  const [form, setForm] = React.useState({
    nome: '', icone: '🥈', preco: '', cortesInclusos: '', descricao: '', cor: '#C9A84C', ativo: true,
  });

  // ── Carregar planos ──
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

  // ── Seed inicial ──
  async function seedPlanos() {
    setSalvando(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      for (const p of PLANOS_SEED) {
        await addDoc(collection(db, 'planos'), { ...p, criadoEm: serverTimestamp() });
      }
    } catch (e) { setErro('Erro ao criar planos: ' + e.message); }
    setSalvando(false);
  }

  // ── Abrir modal novo ──
  function abrirNovo() {
    setForm({ nome: '', icone: '🥈', preco: '', cortesInclusos: '', descricao: '', cor: '#C9A84C', ativo: true });
    setErro('');
    setModal('novo');
  }

  // ── Abrir modal editar ──
  function abrirEditar(plano) {
    setForm({
      nome: plano.nome,
      icone: plano.icone || '🥈',
      preco: String(plano.preco),
      cortesInclusos: String(plano.cortesInclusos),
      descricao: plano.descricao || '',
      cor: plano.cor || '#C9A84C',
      ativo: plano.ativo !== false,
    });
    setErro('');
    setModal(plano);
  }

  // ── Salvar (novo ou editar) ──
  async function salvar() {
    if (!form.nome.trim())             { setErro('Nome é obrigatório.'); return; }
    if (!form.preco || isNaN(Number(form.preco))) { setErro('Preço inválido.'); return; }
    if (!form.cortesInclusos || isNaN(Number(form.cortesInclusos))) { setErro('Nº de cortes inválido.'); return; }

    setSalvando(true);
    setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const dados = {
        nome: form.nome.trim(),
        icone: form.icone,
        preco: Number(form.preco),
        cortesInclusos: Number(form.cortesInclusos),
        descricao: form.descricao.trim(),
        cor: form.cor,
        ativo: form.ativo,
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

  // ── Excluir ──
  async function excluir(plano) {
    setSalvando(true);
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'planos', plano.id));
      setConfirmarExcluir(null);
    } catch (e) { setErro('Erro ao excluir: ' + e.message); }
    setSalvando(false);
  }

  // ── Toggle ativo/inativo ──
  async function toggleAtivo(plano) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'planos', plano.id), { ativo: !plano.ativo });
    } catch (e) { setErro('Erro: ' + e.message); }
  }

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#F5EFE6', fontWeight: '700' }}>Planos Mensais</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>{planos.length} plano{planos.length !== 1 ? 's' : ''} cadastrado{planos.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={abrirNovo} style={{ marginLeft: 'auto', background: '#C9A84C', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#1A0F0D', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Novo Plano</button>
      </div>

      <div style={{ padding: '20px' }}>

        {/* SEED */}
        {planos.length === 0 && !loading && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💈</div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: textMain, marginBottom: '6px' }}>Nenhum plano cadastrado</div>
            <div style={{ fontSize: '12px', color: textSub, marginBottom: '16px' }}>Crie seus planos ou use os modelos prontos (Prata, Ouro, Diamante)</div>
            <button onClick={seedPlanos} disabled={salvando} style={{ background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '10px', padding: '12px 20px', color: '#F5EFE6', fontWeight: '700', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
              {salvando ? 'Criando...' : '🚀 Criar Planos Prata, Ouro e Diamante'}
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>Carregando planos...</div>
        )}

        {/* LISTA DE PLANOS */}
        {planos.map(plano => (
          <div key={plano.id} style={{ background: cardBg, border: `1px solid ${plano.ativo ? (plano.cor || '#C9A84C') + '44' : border}`, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden', opacity: plano.ativo ? 1 : 0.6 }}>

            {/* barra colorida no topo */}
            <div style={{ height: '4px', background: plano.cor || '#C9A84C' }} />

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '32px' }}>{plano.icone || '💈'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '16px', color: textMain }}>{plano.nome}</span>
                    {!plano.ativo && (
                      <span style={{ fontSize: '10px', background: '#444', color: '#aaa', borderRadius: '6px', padding: '2px 8px' }}>Inativo</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: textSub, marginTop: '2px' }}>{plano.descricao}</div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <div style={{ background: dark ? '#1A0F0D' : '#f5efe6', borderRadius: '8px', padding: '6px 12px' }}>
                      <div style={{ fontSize: '10px', color: textSub }}>Mensalidade</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: plano.cor || '#C9A84C' }}>R$ {Number(plano.preco).toFixed(2)}</div>
                    </div>
                    <div style={{ background: dark ? '#1A0F0D' : '#f5efe6', borderRadius: '8px', padding: '6px 12px' }}>
                      <div style={{ fontSize: '10px', color: textSub }}>Cortes/mês</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: textMain }}>{plano.cortesInclusos}x</div>
                    </div>
                    <div style={{ background: dark ? '#1A0F0D' : '#f5efe6', borderRadius: '8px', padding: '6px 12px' }}>
                      <div style={{ fontSize: '10px', color: textSub }}>Por corte</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#4CAF50' }}>R$ {(plano.preco / plano.cortesInclusos).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button onClick={() => abrirEditar(plano)} style={{ flex: 1, background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px', fontSize: '12px', color: textMain, cursor: 'pointer', fontWeight: '600' }}>✏️ Editar</button>
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

      {/* ── MODAL NOVO/EDITAR ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: dark ? '#1A0F0D' : '#fff', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: '430px', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: textMain, fontWeight: '700' }}>
                {modal === 'novo' ? '+ Novo Plano' : `Editar — ${modal.nome}`}
              </div>
              <button onClick={() => { setModal(null); setErro(''); }} style={{ background: dark ? '#2E1A14' : '#f5efe6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: textMain }}>✕</button>
            </div>

            {/* Ícone seletor */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Ícone</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ICONES.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icone: ic }))}
                    style={{ fontSize: '22px', background: form.icone === ic ? (dark ? '#3A2018' : '#f5d5a0') : (dark ? '#2E1A14' : '#f5efe6'), border: form.icone === ic ? '2px solid #C9A84C' : '2px solid transparent', borderRadius: '10px', width: '40px', height: '40px', cursor: 'pointer' }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nome do plano *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Titanium, Premium, VIP..."
                style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Preço + Cortes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Mensalidade (R$) *</label>
                <input value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                  placeholder="89.90" type="number" min="0" step="0.01"
                  style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Cortes inclusos *</label>
                <input value={form.cortesInclusos} onChange={e => setForm(f => ({ ...f, cortesInclusos: e.target.value }))}
                  placeholder="4" type="number" min="1"
                  style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Descrição</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Breve descrição do plano..."
                style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Cor */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Cor do plano</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#9E9E9E','#C9A84C','#2E7D7A','#8B3A2A','#4CAF50','#2196F3','#9C27B0','#FF5722'].map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: form.cor === c ? '3px solid #F5EFE6' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            {/* Preview preço/corte */}
            {form.preco && form.cortesInclusos && !isNaN(Number(form.preco)) && !isNaN(Number(form.cortesInclusos)) && Number(form.cortesInclusos) > 0 && (
              <div style={{ background: dark ? '#231410' : '#f5efe6', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: textSub }}>Por corte</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#4CAF50' }}>
                    R$ {(Number(form.preco) / Number(form.cortesInclusos)).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: textSub }}>Economia vs avulso*</div>
                  <div style={{ fontSize: '12px', color: '#E8C96A' }}>Calculado na tela do cliente</div>
                </div>
              </div>
            )}

            {/* Ativo toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ position: 'relative', width: '44px', height: '24px' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
                <div style={{ position: 'absolute', inset: 0, background: form.ativo ? '#4CAF50' : '#555', borderRadius: '12px', transition: 'background .2s' }} />
                <div style={{ position: 'absolute', top: '3px', left: form.ativo ? '23px' : '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: '13px', color: textMain }}>{form.ativo ? 'Plano ativo (visível para clientes)' : 'Plano inativo (oculto para clientes)'}</span>
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

      {/* ── MODAL CONFIRMAR EXCLUIR ── */}
      {confirmarExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: dark ? '#1A0F0D' : '#fff', borderRadius: '20px', padding: '28px 24px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: textMain, marginBottom: '8px' }}>Excluir plano "{confirmarExcluir.nome}"?</div>
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
