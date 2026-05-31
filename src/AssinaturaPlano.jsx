// AssinaturaPlano.jsx — Flyguer BarberShop
// ✅ Saldo de serviços por tipo + FAQ dinâmica por plano

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

// FAQ padrão por plano (fallback se não tiver no Firestore)
const FAQ_PADRAO = {
  bronze: [
    { p: 'Como funciona o uso?', r: 'Você tem direito a até 4 cortes de cabelo e 4 sobrancelhas dentro do mês de vigência.' },
    { p: 'Os serviços acumulam?', r: 'Não. Os créditos expiram ao final de cada ciclo mensal.' },
    { p: 'Posso transferir créditos?', r: 'Não, este plano é individual, intransferível e atrelado ao seu CPF.' },
    { p: 'Como cancelo?', r: 'Sem fidelidade. Cancele direto pelo app a qualquer momento antes da próxima renovação.' },
  ],
  prata: [
    { p: 'Como funciona o uso?', r: 'Cobre o visual completo: até 4 cortes, 4 barbas e 4 sobrancelhas por mês.' },
    { p: 'Posso fazer cabelo e barba no mesmo dia?', r: 'Sim! Você gerencia seus agendamentos como quiser.' },
    { p: 'Qual o intervalo mínimo entre os usos?', r: 'Não há limite, desde que você tenha saldo disponível no ciclo mensal.' },
    { p: 'Posso alterar o formato da barba?', r: 'Sim, o plano cobre qualquer estilo de barba.' },
  ],
  ouro: [
    { p: 'Como funciona o Abono de Estacionamento?', r: 'Em todas as visitas, apresente o app na recepção para receber a validação de gratuidade do estacionamento parceiro.' },
    { p: 'Como uso os 10% de desconto em produtos?', r: 'O desconto é aplicado automaticamente na recepção para qualquer produto da prateleira.' },
    { p: 'Os serviços cobrem o mês todo?', r: 'Sim, ideal para quem vem semanalmente fazer a manutenção de barba, cabelo e sobrancelha.' },
  ],
};

export default function AssinaturaPlano({ cliente, onBack, dark }) {
  const s = getStyles(dark);
  const [planos, setPlanos]           = React.useState([]);
  const [assinatura, setAssinatura]   = React.useState(null);
  const [loading, setLoading]         = React.useState(true);
  const [confirmando, setConfirmando] = React.useState(null);
  const [faqAberta, setFaqAberta]     = React.useState(null);
  const [salvando, setSalvando]       = React.useState(false);
  const [sucesso, setSucesso]         = React.useState(false);
  const [erro, setErro]               = React.useState('');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';
  const clienteId = cliente?.cpf || cliente?.uid || null;

  React.useEffect(() => {
    let unsubPlanos, unsubAssin;
    (async () => {
      const { collection, onSnapshot, query, where, orderBy } = await import('firebase/firestore');
      const qp = query(collection(db, 'planos'), where('ativo', '==', true), orderBy('preco', 'asc'));
      unsubPlanos = onSnapshot(qp, snap => {
        setPlanos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, () => setLoading(false));

      if (clienteId) {
        const qa = query(collection(db, 'assinaturas'), where('clienteId', '==', clienteId));
        unsubAssin = onSnapshot(qa, snap => {
          const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const ativa    = todas.find(a => a.status === 'ativa');
          const pendente = todas.find(a => a.status === 'pendente_pagamento');
          setAssinatura(ativa || pendente || null);
        }, () => {});
      }
    })();
    return () => { unsubPlanos?.(); unsubAssin?.(); };
  }, [clienteId]);

  // Calcular uso por serviço
  function calcularUso(assin) {
    if (!assin) return [];
    const servicos = assin.servicosInclusos || [];
    const uso = assin.usoServicos || {};
    return servicos.map(sv => ({
      nome: sv,
      usado: uso[sv] || 0,
      limite: assin.limiteServicos?.[sv] || 4,
    }));
  }

  async function assinar() {
    if (!confirmando || !clienteId) { setErro('Erro: cliente não identificado.'); return; }
    setSalvando(true); setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      if (assinatura) {
        await updateDoc(doc(db, 'assinaturas', assinatura.id), { status: 'cancelada', canceladaEm: serverTimestamp() });
      }
      const venc = new Date(); venc.setMonth(venc.getMonth() + 1);
      await addDoc(collection(db, 'assinaturas'), {
        clienteId, clienteNome: cliente.nome || '', clienteTelefone: cliente.telefone || '',
        planoId: confirmando.id, planoNome: confirmando.nome,
        planoIcone: confirmando.icone || '💈', planoCor: confirmando.cor || '#C9A84C',
        preco: Number(confirmando.preco) || 0,
        servicosInclusos: confirmando.servicosInclusos || [],
        usoServicos: {},
        cortesUsados: 0, status: 'pendente_pagamento',
        assinadoEm: serverTimestamp(), vencimento: venc.toISOString(), renovacaoAuto: false,
      });

      // Notificar barbearia
      const msg = encodeURIComponent(
        '🔔 NOVA ASSINATURA VIA APP' +
        '%0A%0A👤 Cliente: ' + cliente.nome +
        '%0A📞 Telefone: ' + (cliente.telefone||'Nao informado') +
        '%0A💳 Plano: ' + confirmando.nome +
        '%0A💰 Valor: R$ ' + Number(confirmando.preco).toFixed(2) + '/mes' +
        '%0A%0A⚠️ Pagamento PENDENTE — combine e ative no app.' +
        '%0A%0Ahttps://flyguer-barbershop.vercel.app'
      );
      window.open('https://wa.me/5511977643509?text=' + msg, '_blank');
      setConfirmando(null); setSucesso(true);
      setTimeout(() => setSucesso(false), 5000);
    } catch(e) { setErro('Erro ao assinar: ' + e.message); }
    setSalvando(false);
  }

  async function cancelarAssinatura() {
    if (!assinatura) return;
    setSalvando(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'assinaturas', assinatura.id), { status: 'cancelada', canceladaEm: serverTimestamp() });
      setAssinatura(null);
    } catch(e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  // Obter FAQ do plano
  function getFaq(plano) {
    if (plano.faq_diretrizes?.length) return plano.faq_diretrizes;
    const key = plano.nome?.toLowerCase();
    for (const k of Object.keys(FAQ_PADRAO)) {
      if (key?.includes(k)) return FAQ_PADRAO[k];
    }
    return [];
  }

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>
      <div style={{ background:'linear-gradient(135deg,#1A0F0D,#2E7D7A)', padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6', fontWeight:'700' }}>💳 Planos Mensais</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Assine e tenha serviços todo mês</div>
        </div>
      </div>

      <div style={{ padding:'20px' }}>

        {/* SUCESSO */}
        {sucesso && (
          <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>🎉</div>
            <div style={{ fontWeight:'700', color:'#4CAF50', fontSize:'14px' }}>Solicitação enviada!</div>
            <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>A barbearia foi notificada. Aguarde a confirmação do pagamento para ativar seu plano.</div>
          </div>
        )}

        {/* ASSINATURA ATIVA */}
        {assinatura && (
          <div style={{ background:cardBg, border:'2px solid '+(assinatura.planoCor||'#C9A84C'), borderRadius:'16px', marginBottom:'20px', overflow:'hidden' }}>
            <div style={{ height:'4px', background:assinatura.planoCor||'#C9A84C' }} />
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                <span style={{ fontSize:'28px' }}>{assinatura.planoIcone}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'700', fontSize:'15px', color:textMain }}>Plano {assinatura.planoNome}</div>
                </div>
                <div style={{ background:assinatura.status==='ativa'?'rgba(76,175,80,0.15)':'rgba(255,193,7,0.15)', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', color:assinatura.status==='ativa'?'#4CAF50':'#FFC107', fontWeight:'700' }}>
                  {assinatura.status==='ativa'?'✅ ATIVO':'⏳ PENDENTE'}
                </div>
              </div>

              {assinatura.status==='pendente_pagamento' && (
                <div style={{ background:'rgba(255,193,7,0.1)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px', fontSize:'12px', color:'#FFC107' }}>
                  ⚠️ Aguardando confirmação de pagamento na barbearia.
                </div>
              )}

              {/* Saldo de serviços */}
              {assinatura.status==='ativa' && calcularUso(assinatura).length > 0 && (
                <div style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'10px', padding:'12px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'10px', textTransform:'uppercase' }}>Seu saldo do mês</div>
                  {calcularUso(assinatura).map(sv => {
                    const restante = Math.max(0, sv.limite - sv.usado);
                    const pct = Math.min(100, (sv.usado / sv.limite) * 100);
                    return (
                      <div key={sv.nome} style={{ marginBottom:'10px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <span style={{ fontSize:'13px', color:textMain, fontWeight:'600' }}>{sv.nome}</span>
                          <span style={{ fontSize:'12px', color:restante===0?'#F44336':assinatura.planoCor||'#C9A84C', fontWeight:'700' }}>
                            {restante===0?'✗ Esgotado':restante+' restante'+(restante!==1?'s':'')}
                          </span>
                        </div>
                        <div style={{ height:'6px', background:dark?'#2E1A14':'#e5d5cc', borderRadius:'3px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:pct+'%', background:restante===0?'#F44336':(assinatura.planoCor||'#C9A84C'), borderRadius:'3px', transition:'width 0.4s' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:textSub, marginTop:'2px' }}>
                          <span>{sv.usado} usados</span>
                          <span>{sv.limite} inclusos/mês</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Datas */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'12px' }}>
                {assinatura.dataPagamento && (
                  <div style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'8px', padding:'8px' }}>
                    <div style={{ fontSize:'10px', color:textSub }}>Data pagamento</div>
                    <div style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>
                      {new Date(assinatura.dataPagamento+'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
                {assinatura.vencimento && (
                  <div style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'8px', padding:'8px' }}>
                    <div style={{ fontSize:'10px', color:textSub }}>Vencimento</div>
                    <div style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>
                      {new Date(assinatura.vencimento).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:textSub, marginBottom:'14px' }}>
                <span>Mensalidade</span>
                <span style={{ color:assinatura.planoCor||'#C9A84C', fontWeight:'700' }}>R$ {Number(assinatura.preco).toFixed(2)}/mês</span>
              </div>

              <button onClick={cancelarAssinatura} disabled={salvando}
                style={{ width:'100%', background:'transparent', border:'1px solid #8B3A2A', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', cursor:'pointer', fontWeight:'600' }}>
                {salvando?'Cancelando...':'✕ Cancelar Assinatura'}
              </button>
            </div>
          </div>
        )}

        {/* LISTA PLANOS */}
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>
          {assinatura?'Trocar de plano':'Escolha seu plano'}
        </div>

        {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>⏳ Carregando planos...</div>}

        {!loading && planos.length===0 && (
          <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>💈</div>
            <div>Nenhum plano disponível no momento.</div>
          </div>
        )}

        {planos.map(plano => {
          const ativo = assinatura?.planoId === plano.id;
          const faq   = getFaq(plano);
          return (
            <div key={plano.id} style={{ background:cardBg, border:(ativo?'2px':'1px')+' solid '+(ativo?(plano.cor||'#C9A84C'):border), borderRadius:'16px', marginBottom:'12px', overflow:'hidden', position:'relative' }}>
              <div style={{ height:'4px', background:plano.cor||'#C9A84C' }} />
              {plano.destaque && (
                <div style={{ position:'absolute', top:'12px', right:'12px', background:plano.cor||'#C9A84C', color:'#fff', fontSize:'10px', fontWeight:'700', borderRadius:'6px', padding:'2px 8px' }}>⭐ MAIS POPULAR</div>
              )}
              <div style={{ padding:'16px' }}>
                <div style={{ display:'flex', gap:'12px', alignItems:'flex-start', marginBottom:'12px' }}>
                  <div style={{ fontSize:'32px' }}>{plano.icone||'💈'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                      <span style={{ fontWeight:'700', fontSize:'16px', color:textMain }}>{plano.nome}</span>
                      {ativo && <span style={{ fontSize:'10px', background:'rgba(76,175,80,0.2)', color:'#4CAF50', borderRadius:'6px', padding:'2px 8px', fontWeight:'700' }}>SEU PLANO</span>}
                      {/* ✅ Botão FAQ */}
                      {faq.length > 0 && (
                        <button onClick={() => setFaqAberta(faqAberta?.id===plano.id?null:{id:plano.id,plano,faq})}
                          style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.4)', borderRadius:'50%', width:'22px', height:'22px', fontSize:'11px', cursor:'pointer', color:'#C9A84C', fontWeight:'700', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          ℹ️
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize:'12px', color:textSub, marginTop:'2px' }}>{plano.descricao}</div>
                    <div style={{ fontSize:'22px', fontWeight:'900', color:plano.cor||'#C9A84C', marginTop:'6px' }}>
                      R$ {Number(plano.preco).toFixed(2)}<span style={{ fontSize:'12px', fontWeight:'400', color:textSub }}>/mês</span>
                    </div>
                  </div>
                </div>

                <div style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px' }}>
                  {(plano.servicosInclusos||[]).map((sv,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:i<(plano.servicosInclusos.length-1)?'4px':0 }}>
                      <span style={{ color:plano.cor||'#C9A84C', fontWeight:'700', fontSize:'13px' }}>✓</span>
                      <span style={{ fontSize:'13px', color:textMain }}>{sv}</span>
                    </div>
                  ))}
                </div>

                {!ativo && (
                  <button onClick={() => { setConfirmando(plano); setErro(''); }}
                    style={{ width:'100%', background:'linear-gradient(135deg,'+(plano.cor||'#C9A84C')+'cc,'+(plano.cor||'#C9A84C')+')', border:'none', borderRadius:'10px', padding:'12px', color:'#fff', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
                    {assinatura?'🔄 Trocar para este plano':'✅ Assinar este plano'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL FAQ */}
      {faqAberta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:dark?'#1A0F0D':'#fff', borderRadius:'24px 24px 0 0', padding:'28px 20px 40px', width:'100%', maxWidth:'430px', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
              <span style={{ fontSize:'28px' }}>{faqAberta.plano.icone}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:textMain, fontWeight:'700' }}>Plano {faqAberta.plano.nome}</div>
                <div style={{ fontSize:'11px', color:textSub }}>Perguntas frequentes</div>
              </div>
              <button onClick={() => setFaqAberta(null)} style={{ background:'none', border:'none', color:textSub, fontSize:'20px', cursor:'pointer' }}>✕</button>
            </div>
            {faqAberta.faq.map((item, i) => (
              <div key={i} style={{ background:dark?'#231410':'#f5efe6', borderRadius:'12px', padding:'14px', marginBottom:'10px' }}>
                <div style={{ fontWeight:'700', fontSize:'13px', color:faqAberta.plano.cor||'#C9A84C', marginBottom:'6px' }}>❓ {item.p}</div>
                <div style={{ fontSize:'13px', color:textMain, lineHeight:'1.6' }}>{item.r}</div>
              </div>
            ))}
            <button onClick={() => setFaqAberta(null)}
              style={{ width:'100%', marginTop:'8px', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontWeight:'700', fontSize:'14px', cursor:'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR */}
      {confirmando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:dark?'#1A0F0D':'#fff', borderRadius:'24px 24px 0 0', padding:'28px 20px 40px', width:'100%', maxWidth:'430px' }}>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'8px' }}>{confirmando.icone}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:textMain, fontWeight:'700' }}>Plano {confirmando.nome}</div>
              <div style={{ fontSize:'22px', fontWeight:'900', color:confirmando.cor||'#C9A84C', marginTop:'4px' }}>
                R$ {Number(confirmando.preco).toFixed(2)}<span style={{ fontSize:'13px', fontWeight:'400', color:textSub }}>/mês</span>
              </div>
            </div>
            <div style={{ background:dark?'#231410':'#f5efe6', borderRadius:'12px', padding:'14px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>O que está incluso</div>
              {(confirmando.servicosInclusos||[]).map((sv,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <span style={{ color:confirmando.cor||'#C9A84C', fontWeight:'700' }}>✓</span>
                  <span style={{ fontSize:'13px', color:textMain }}>{sv}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(255,193,7,0.1)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'12px', color:'#FFC107' }}>
              ⚠️ Ao confirmar, a barbearia será notificada. O plano será <strong>ativado após o pagamento</strong> ser combinado presencialmente.
            </div>
            {erro && <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>}
            <button onClick={assinar} disabled={salvando}
              style={{ width:'100%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'12px', padding:'14px', color:'#F5EFE6', fontWeight:'700', fontSize:'14px', cursor:'pointer', marginBottom:'10px' }}>
              {salvando?'Enviando...':'📲 Solicitar plano — R$ '+Number(confirmando.preco).toFixed(2)+'/mês'}
            </button>
            <button onClick={() => { setConfirmando(null); setErro(''); }}
              style={{ width:'100%', background:'transparent', border:'1px solid '+border, borderRadius:'12px', padding:'12px', color:textSub, fontSize:'13px', cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
