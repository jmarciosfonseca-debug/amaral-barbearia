function CalendarioCliente({ isDiaAberto, dataSel, onDiaSel }) {
  const agora   = new Date();
  const anoHoje = agora.getFullYear();
  const mesHoje = agora.getMonth();
  const diaHoje = agora.getDate();
  const hojeStr = `${anoHoje}-${String(mesHoje+1).padStart(2,'0')}-${String(diaHoje).padStart(2,'0')}`;
  const [mes, setMes] = React.useState(mesHoje);
  const [ano, setAno] = React.useState(anoHoje);
  const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate();
  function navMes(dir) {
    let nm = mes + dir, na = ano;
    if (nm < 0)  { nm = 11; na--; }
    if (nm > 11) { nm = 0;  na++; }
    if (na < anoHoje || (na === anoHoje && nm < mesHoje)) return;
    setMes(nm); setAno(na);
  }
  function mkData(a, m, d) {
    return `${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);
  return (
    <div style={{ background:'#1A0F0D', borderRadius:'16px', padding:'14px', marginBottom:'16px', border:'1px solid #3A2018' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <button onClick={() => navMes(-1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'<'}</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#E8C96A', fontWeight:'700' }}>{MESES[mes]} {ano}</div>
        <button onClick={() => navMes(1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'>'}</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'6px' }}>
        {['D','S','T','Q','Q','S','S'].map((letra, idx) => (
          <div key={idx} style={{ textAlign:'center', fontSize:'10px', color:'#9A8880', fontWeight:'600', padding:'3px 0' }}>{letra}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} />;
          const dataStr = mkData(ano, mes, dia);
          const ehHoje  = dataStr === hojeStr;
          const ehSel   = dataStr === dataSel;
          const passado = dataStr < hojeStr;
          const aberto  = !passado && isDiaAberto(dataStr);
          return (
            <div key={idx} onClick={() => aberto && onDiaSel(dataStr)}
              style={{ borderRadius:'8px', padding:'6px 2px', textAlign:'center', cursor:aberto?'pointer':'default',
                background:ehSel?'#8B3A2A':ehHoje?'rgba(232,201,106,0.15)':'transparent',
                border:ehSel?'1.5px solid #E8C96A':ehHoje?'1px solid rgba(232,201,106,0.4)':'1px solid transparent',
                opacity:passado||!aberto?0.3:1 }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:ehSel?'#F5EFE6':ehHoje?'#E8C96A':aberto?'#F5EFE6':'#555' }}>{dia}</div>
            </div>
          );
        })}
      </div>
      {dataSel && (
        <div style={{ marginTop:'10px', padding:'8px 10px', background:'rgba(139,58,42,0.2)', borderRadius:'8px', textAlign:'center', fontSize:'12px', color:'#E8C96A', fontWeight:'600' }}>
          {dataSel.split('-').reverse().join('/')}
        </div>
      )}
    </div>
  );
}
