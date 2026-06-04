// ─────────────────────────────────────────────────────────────
// PATCH: GestaoEquipe.jsx
// Adicione este componente ANTES do export default GestaoEquipe
// e chame-o na tela do barbeiro (perfil !== GERENTE)
// ─────────────────────────────────────────────────────────────

// ✅ Tabela de valores somente leitura para o barbeiro
function TabelaValoresBarbeiro({ dark }) {
  const s = getStyles(dark);
  const [servicos, setServicos] = React.useState({ avulsos:[], combos:[] });
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    import('firebase/firestore').then(({ doc: fd, getDoc }) => {
      getDoc(fd(db,'config','servicos')).then(snap => {
        if (snap.exists()) setServicos(snap.data());
      }).catch(console.error).finally(() => setCarregando(false));
    });
  }, []);

  if (carregando) return (
    <div style={{ textAlign:'center', padding:'20px', color:'#9A8880' }}>⏳ Carregando...</div>
  );

  const avulsos = servicos.avulsos?.filter(s=>s.ativo) || [];
  const combos  = servicos.combos?.filter(s=>s.ativo)  || [];

  if (avulsos.length === 0 && combos.length === 0) return (
    <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>
      Nenhum serviço cadastrado ainda
    </div>
  );

  return (
    <div>
      <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'10px 14px', marginBottom:'16px', fontSize:'12px', color:'#2E7D7A', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'16px' }}>👁</span>
        <span>Tabela de valores da barbearia — somente visualização</span>
      </div>

      {avulsos.length > 0 && (
        <>
          <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
            Serviços Avulsos
          </div>
          {avulsos.map(sv => (
            <div key={sv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#231410', borderRadius:'12px', padding:'12px 14px', border:'1px solid #3A2018', marginBottom:'8px' }}>
              <div>
                <div style={{ fontWeight:'600', fontSize:'14px', color:'#F5EFE6' }}>{sv.nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>⏱ {sv.duracao} min</div>
              </div>
              <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>
                R$ {(sv.valor||0).toFixed(2).replace('.',',')}
              </div>
            </div>
          ))}
        </>
      )}

      {combos.length > 0 && (
        <>
          <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px', marginTop:'16px' }}>
            Combos & Pacotes
          </div>
          {combos.map(sv => (
            <div key={sv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#231410', borderRadius:'12px', padding:'12px 14px', border:'1px solid rgba(232,201,106,0.2)', marginBottom:'8px' }}>
              <div>
                <div style={{ fontWeight:'600', fontSize:'14px', color:'#F5EFE6' }}>{sv.nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>⏱ {sv.duracao} min · combo</div>
              </div>
              <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>
                R$ {(sv.valor||0).toFixed(2).replace('.',',')}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// No export default GestaoEquipe, dentro do return,
// SUBSTITUA o bloco de render do barbeiro (isGerente === false)
// pelo trecho abaixo:
// ─────────────────────────────────────────────────────────────

/*
  SUBSTITUA este trecho no JSX do GestaoEquipe (dentro do return, 
  após as abas ou no topo da lista quando isGerente === false):

  {!isGerente && (
    <>
      {barbeiros.filter(b=>b.id===usuario?.id).map(barbeiro => (
        <Card key={barbeiro.id}>
          ... card do barbeiro existente ...
        </Card>
      ))}
      
      // ✅ Adicione isto após o card do barbeiro:
      <div style={{ marginTop:'20px' }}>
        <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>
          💈 Tabela de Serviços
        </div>
        <TabelaValoresBarbeiro dark={dark} />
      </div>
    </>
  )}
*/
