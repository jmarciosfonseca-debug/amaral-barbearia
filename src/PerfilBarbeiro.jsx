// PerfilBarbeiro.jsx — Flyguer BarberShop
// ✅ Novo: Perfil do barbeiro com foto, bio, avaliações

import React from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getStyles } from './getStyles';

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function Estrelas({ nota, tamanho = 16 }) {
  return (
    <div style={{ display:'flex', gap:'2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:tamanho, color: i <= Math.round(nota) ? '#E8C96A' : '#3A2018' }}>★</span>
      ))}
    </div>
  );
}

export default function PerfilBarbeiro({ barbeiro, onVoltar, onAgendar, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]             = React.useState('sobre');
  const [avaliacoes, setAvaliacoes] = React.useState([]);
  const [carregando, setCarregando] = React.useState(false);
  const [mediaAvaliacao, setMedia] = React.useState(0);

  React.useEffect(() => {
    if (aba !== 'avaliacoes') return;
    setCarregando(true);
    getDocs(query(
      collection(db,'avaliacoes'),
      where('barbeiroId','==',barbeiro.id),
      orderBy('criadoEm','desc')
    )).then(snap => {
      const lista = snap.docs.map(d=>({id:d.id,...d.data()}));
      setAvaliacoes(lista);
      if (lista.length > 0) {
        setMedia(lista.reduce((acc,a)=>acc+(a.nota||0),0)/lista.length);
      }
      setCarregando(false);
    }).catch(e => { console.error(e); setCarregando(false); });
  }, [aba, barbeiro.id]);

  return (
    <div style={{ ...s.app, paddingBottom:'100px' }}>
      {/* Header com foto */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'20px', position:'relative' }}>
        <button onClick={onVoltar} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px', marginBottom:'16px' }}>← Voltar</button>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'linear-gradient(135deg,#3A1208,#5C2218)', border:'3px solid #E8C96A', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:'700', color:'#F5EFE6' }}>
            {barbeiro.foto
              ? <img src={barbeiro.foto} alt={barbeiro.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : barbeiro.nome.charAt(0)
            }
          </div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#F5EFE6', fontWeight:'700' }}>{barbeiro.nome}</div>
            <div style={{ fontSize:'13px', color:'rgba(245,239,230,0.7)', marginTop:'2px' }}>{barbeiro.cargo || 'Barbeiro'}</div>
            {barbeiro.experiencia && (
              <div style={{ fontSize:'12px', color:'#E8C96A', marginTop:'4px' }}>✂️ {barbeiro.experiencia}</div>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[
          { id:'sobre',      label:'Sobre' },
          { id:'avaliacoes', label:'Avaliações' },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'14px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #E8C96A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'14px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px' }}>
        {/* Aba Sobre */}
        {aba === 'sobre' && (
          <>
            {barbeiro.bio ? (
              <div style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>Sobre o Barbeiro</div>
                <div style={{ fontSize:'14px', color:'#F5EFE6', lineHeight:'1.7' }}>{barbeiro.bio}</div>
              </div>
            ) : (
              <div style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'13px', color:'#9A8880' }}>Nenhuma descrição disponível ainda.</div>
              </div>
            )}
            {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>Especialidades</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {barbeiro.especialidades.map((esp, i) => (
                    <div key={i} style={{ background:'rgba(139,58,42,0.2)', border:'1px solid rgba(139,58,42,0.4)', borderRadius:'20px', padding:'6px 14px', fontSize:'12px', color:'#E8C96A' }}>
                      ✂️ {esp}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Status disponibilidade */}
            <div style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'16px', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:barbeiro.disponivel?'#4CAF50':'#FFC107', flexShrink:0 }} />
              <div style={{ fontSize:'13px', color:'#F5EFE6' }}>
                {barbeiro.disponivel ? 'Disponível agora' : 'Ocupado no momento'}
              </div>
            </div>
          </>
        )}

        {/* Aba Avaliações */}
        {aba === 'avaliacoes' && (
          <>
            {carregando ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando avaliações...</div>
            ) : avaliacoes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>⭐</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#E8C96A', marginBottom:'8px' }}>Sem avaliações ainda</div>
                <div style={{ fontSize:'13px', color:'#9A8880' }}>Seja o primeiro a avaliar!</div>
              </div>
            ) : (
              <>
                {/* Resumo */}
                <div style={{ background:'#231410', borderRadius:'14px', padding:'16px', border:'1px solid #3A2018', marginBottom:'16px', textAlign:'center' }}>
                  <div style={{ fontSize:'40px', fontWeight:'900', color:'#E8C96A', marginBottom:'4px' }}>{mediaAvaliacao.toFixed(1)}</div>
                  <Estrelas nota={mediaAvaliacao} tamanho={20} />
                  <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'6px' }}>{avaliacoes.length} avaliação{avaliacoes.length!==1?'s':''}</div>
                </div>
                {/* Lista */}
                {avaliacoes.map(av => (
                  <div key={av.id} style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                      <div style={{ fontWeight:'700', fontSize:'13px', color:'#F5EFE6' }}>{av.clienteNome || 'Cliente'}</div>
                      <div style={{ fontSize:'11px', color:'#9A8880' }}>{av.data ? formatarData(av.data) : ''}</div>
                    </div>
                    <Estrelas nota={av.nota} tamanho={14} />
                    {av.comentario && (
                      <div style={{ fontSize:'13px', color:'#9A8880', marginTop:'8px', lineHeight:'1.6', fontStyle:'italic' }}>"{av.comentario}"</div>
                    )}
                    {av.servico && (
                      <div style={{ fontSize:'11px', color:'#3A9E9A', marginTop:'6px' }}>✂️ {av.servico}</div>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Botão agendar fixo */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
        <button onClick={() => onAgendar(barbeiro)}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
          ✂️ Agendar com {barbeiro.nome.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}
