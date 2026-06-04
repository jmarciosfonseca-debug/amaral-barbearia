// FichaPublicaBarbeiro.jsx — Flyguer BarberShop
// ✅ Ficha pública do barbeiro — visível para clientes na Splash
// ✅ Foto ampliável, bio, blocos visíveis, avaliações, nota média
// ✅ Botão agendar direto com barbeiro pré-selecionado

import React from 'react';
import { db } from './firebase';
import {
  doc, getDoc, collection, query, where, onSnapshot,
} from 'firebase/firestore';
import { getStyles } from './getStyles';

function notaMedia(avs) {
  if (!avs?.length) return 0;
  return (avs.reduce((s,a)=>s+(a.nota||0),0)/avs.length).toFixed(1);
}
function estrelas(nota) {
  const n = Math.round(parseFloat(nota)||0);
  return '⭐'.repeat(n) + '☆'.repeat(Math.max(0,5-n));
}

const CORES_BLOCO = {
  especialidade: '#E8C96A',
  curso:         '#2E7D7A',
  certificado:   '#4CAF50',
  novidade:      '#F44336',
};
const ICONES_BLOCO = {
  especialidade: '✂️',
  curso:         '📚',
  certificado:   '🏆',
  novidade:      '🔥',
};

export default function FichaPublicaBarbeiro({ barbeiroId, onBack, onAgendar, cliente, dark }) {
  const s = getStyles(dark);
  const [barbeiro, setBarbeiro]     = React.useState(null);
  const [avaliacoes, setAvaliacoes] = React.useState([]);
  const [carregando, setCarr]       = React.useState(true);
  const [fotoAmpliada, setFoto]     = React.useState(false);
  const [abaAtiva, setAba]          = React.useState('sobre'); // sobre | avaliacoes

  React.useEffect(()=>{
    if(!barbeiroId) return;
    // Carrega dados do barbeiro
    getDoc(doc(db,'barbeiros',barbeiroId)).then(snap=>{
      if(snap.exists()) setBarbeiro({id:snap.id,...snap.data()});
      setCarr(false);
    }).catch(()=>setCarr(false));

    // Avaliações em tempo real
    const unsub = onSnapshot(
      query(collection(db,'avaliacoes'), where('barbeiroId','==',barbeiroId)),
      snap => setAvaliacoes(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0))),
      console.error
    );
    return unsub;
  },[barbeiroId]);

  if (carregando) return (
    <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center', color:'#9A8880' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>✂️</div>
        <div>Carregando perfil...</div>
      </div>
    </div>
  );

  if (!barbeiro) return (
    <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center', color:'#9A8880' }}>
        <div style={{ fontSize:'40px', marginBottom:'12px' }}>😕</div>
        <div>Barbeiro não encontrado</div>
        <button onClick={onBack} style={{ marginTop:'16px', padding:'10px 20px', borderRadius:'10px', border:'none', background:'#8B3A2A', color:'#F5EFE6', cursor:'pointer' }}>← Voltar</button>
      </div>
    </div>
  );

  const media    = notaMedia(avaliacoes);
  const blocosPub= (barbeiro.blocos||[]).filter(b=>b.visivel);

  return (
    <div style={{ ...s.app, paddingBottom:'100px' }}>
      {/* Header com foto */}
      <div style={{ background:'linear-gradient(160deg,#5C2218,#8B3A2A,#A84832)', padding:'24px 20px 20px', position:'relative', overflow:'hidden' }}>
        {/* Fundo decorativo */}
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>

        <button onClick={onBack}
          style={{ background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'10px', padding:'7px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'13px', fontWeight:'600', marginBottom:'16px', display:'inline-flex', alignItems:'center', gap:'6px' }}>
          ← Voltar
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          {/* Foto ampliável */}
          <div onClick={()=>barbeiro.foto&&setFoto(true)}
            style={{ width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#3A1208,#5C2218)', border:'3px solid #E8C96A', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'700', color:'#F5EFE6', cursor:barbeiro.foto?'pointer':'default', position:'relative' }}>
            {barbeiro.foto
              ? <img src={barbeiro.foto} alt={barbeiro.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : barbeiro.nome?.charAt(0)
            }
            {barbeiro.foto && (
              <div style={{ position:'absolute', bottom:'2px', right:'2px', background:'rgba(0,0,0,0.6)', borderRadius:'50%', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>🔍</div>
            )}
          </div>

          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#F5EFE6', fontWeight:'700' }}>{barbeiro.nome}</div>
            <div style={{ fontSize:'13px', color:'rgba(245,239,230,0.7)', marginTop:'2px' }}>{barbeiro.cargo||'Barbeiro'}</div>
            {/* Nota média no header */}
            {avaliacoes.length>0 && (
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' }}>
                <span style={{ fontSize:'16px' }}>{estrelas(media)}</span>
                <span style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'700' }}>{media}</span>
                <span style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>({avaliacoes.length})</span>
              </div>
            )}
            {/* Status */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', marginTop:'6px', padding:'3px 10px', borderRadius:'20px', background:barbeiro.disponivel?'rgba(76,175,80,0.2)':'rgba(255,193,7,0.2)', border:`1px solid ${barbeiro.disponivel?'rgba(76,175,80,0.4)':'rgba(255,193,7,0.4)'}` }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:barbeiro.disponivel?'#4CAF50':'#FFC107' }}/>
              <span style={{ fontSize:'11px', color:barbeiro.disponivel?'#4CAF50':'#FFC107', fontWeight:'600' }}>
                {barbeiro.disponivel?'Disponível':'Ocupado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Abas Sobre / Avaliações */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[
          { id:'sobre',      label:'👤 Sobre' },
          { id:'avaliacoes', label:`⭐ Avaliações (${avaliacoes.length})` },
        ].map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{ flex:1, padding:'12px', border:'none', background:'transparent', borderBottom:abaAtiva===a.id?'2px solid #E8C96A':'2px solid transparent', color:abaAtiva===a.id?'#F5EFE6':'#9A8880', fontSize:'13px', fontWeight:abaAtiva===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {/* ─── ABA SOBRE ─── */}
        {abaAtiva==='sobre' && (
          <>
            {/* Bio */}
            {barbeiro.bio ? (
              <div style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>Sobre</div>
                <div style={{ fontSize:'14px', color:'#F5EFE6', lineHeight:'1.7' }}>{barbeiro.bio}</div>
              </div>
            ) : (
              <div style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'16px', color:'#555', fontSize:'13px', textAlign:'center' }}>
                Bio não preenchida ainda
              </div>
            )}

            {/* Blocos visíveis */}
            {blocosPub.length>0 && (
              <>
                <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
                  Especialidades & Formação
                </div>
                {blocosPub.map((bloco,idx)=>{
                  const cor = CORES_BLOCO[bloco.tipo]||'#E8C96A';
                  const icon= ICONES_BLOCO[bloco.tipo]||'✂️';
                  return (
                    <div key={idx} style={{ display:'flex', gap:'12px', alignItems:'flex-start', background:'#231410', borderRadius:'12px', padding:'12px 14px', border:`1px solid ${cor}33`, marginBottom:'8px' }}>
                      <div style={{ fontSize:'20px', flexShrink:0, marginTop:'2px' }}>{icon}</div>
                      <div>
                        <div style={{ fontSize:'11px', color:cor, fontWeight:'700', marginBottom:'2px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{bloco.tipo}</div>
                        <div style={{ fontSize:'14px', color:'#F5EFE6', fontWeight:'600' }}>{bloco.titulo}</div>
                        {bloco.descricao && <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>{bloco.descricao}</div>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {blocosPub.length===0 && !barbeiro.bio && (
              <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>
                Perfil em construção 🔨
              </div>
            )}
          </>
        )}

        {/* ─── ABA AVALIAÇÕES ─── */}
        {abaAtiva==='avaliacoes' && (
          <>
            {/* Nota média */}
            {avaliacoes.length>0 && (
              <div style={{ background:'linear-gradient(135deg,#1A0F0D,#231410)', borderRadius:'16px', padding:'20px', textAlign:'center', marginBottom:'16px', border:'1px solid #3A2018' }}>
                <div style={{ fontSize:'48px', fontWeight:'900', color:'#E8C96A' }}>{media}</div>
                <div style={{ fontSize:'22px', margin:'6px 0' }}>{estrelas(parseFloat(media))}</div>
                <div style={{ fontSize:'12px', color:'#9A8880' }}>{avaliacoes.length} avaliação{avaliacoes.length!==1?'ões':''}</div>
              </div>
            )}

            {avaliacoes.length===0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>⭐</div>
                <div>Nenhuma avaliação ainda</div>
                <div style={{ fontSize:'12px', color:'#555', marginTop:'8px' }}>Seja o primeiro a avaliar!</div>
              </div>
            ) : avaliacoes.map(av=>(
              <div key={av.id} style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{av.clienteNome||'Cliente'}</div>
                  <div style={{ fontSize:'14px' }}>{estrelas(av.nota||0)}</div>
                </div>
                {av.servico && <div style={{ fontSize:'11px', color:'#9A8880', marginBottom:'6px' }}>💈 {av.servico}</div>}
                {av.comentario && (
                  <div style={{ fontSize:'13px', color:'rgba(245,239,230,0.85)', lineHeight:'1.6', background:'#1A0F0D', borderRadius:'8px', padding:'10px', fontStyle:'italic' }}>
                    "{av.comentario}"
                  </div>
                )}
                {av.criadoEm && (
                  <div style={{ fontSize:'10px', color:'#555', marginTop:'6px', textAlign:'right' }}>
                    {av.criadoEm.toDate?.().toLocaleDateString('pt-BR')||''}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ✅ Botão fixo "Agendar com este barbeiro" */}
      <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
        {cliente ? (
          <button onClick={() => onAgendar && onAgendar(barbeiro)}
            style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
            ✂️ Agendar com {barbeiro.nome.split(' ')[0]}
          </button>
        ) : (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => onAgendar && onAgendar(barbeiro, 'cadastro')}
              style={{ flex:1, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
              👤 Criar conta e agendar
            </button>
            <button onClick={() => onAgendar && onAgendar(barbeiro, 'login')}
              style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#231410', color:'#E8C96A', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
              🔑 Entrar e agendar
            </button>
          </div>
        )}
      </div>

      {/* Modal foto ampliada */}
      {fotoAmpliada && barbeiro.foto && (
        <div onClick={()=>setFoto(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, cursor:'pointer' }}>
          <img src={barbeiro.foto} alt="" style={{ maxWidth:'90%', maxHeight:'90%', borderRadius:'16px', objectFit:'contain' }}/>
          <button style={{ position:'absolute', top:'20px', right:'20px', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:'36px', height:'36px', color:'#fff', fontSize:'18px', cursor:'pointer' }}>✕</button>
        </div>
      )}
    </div>
  );
}
