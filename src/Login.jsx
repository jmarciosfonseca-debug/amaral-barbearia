// Login.jsx — Amaral Barbearia
// ─────────────────────────────────────────────────────────────
// Passo 3: Cadastro e Login do Cliente
// Firebase Firestore: collection clientes/{cpf}
// Padrão: herdado do MokLog CheckTest
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { db } from './firebase';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { getStyles, PREFERENCIAS } from './getStyles';

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

// Limpa CPF — remove pontos, traços, espaços
function limparCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

// Formata CPF para exibição: 000.000.000-00
function formatarCPF(cpf) {
  const c = limparCPF(cpf);
  if (c.length <= 3) return c;
  if (c.length <= 6) return `${c.slice(0,3)}.${c.slice(3)}`;
  if (c.length <= 9) return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6)}`;
  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9,11)}`;
}

// Últimos 5 dígitos do CPF = senha padrão
function senhaPadrao(cpf) {
  const c = limparCPF(cpf);
  return c.slice(-5);
}

// Comprime foto via Canvas (igual MokLog — 300px / 60%)
function comprimirFoto(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 300;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = h * max / w; w = max; } }
      else        { if (h > max) { w = w * max / h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Valida CPF básico (11 dígitos)
function cpfValido(cpf) {
  return limparCPF(cpf).length === 11;
}

// ─────────────────────────────────────────────────────────────
// TELA 1: ESCOLHA — novo ou cadastrado
// ─────────────────────────────────────────────────────────────
export function TelaEntradaCliente({ onNovo, onCadastrado, onBack, dark }) {
  const s = getStyles(dark);
  return (
    <div style={{ ...s.app, padding: '0 0 40px' }}>

      {/* Hero dourado */}
      <div style={{
        background: 'linear-gradient(135deg, #A07830 0%, #C9A84C 50%, #E8C96A 100%)',
        padding: '48px 24px 36px',
        textAlign: 'center',
      }}>
        <img
          src="/logo-amaral.jpg"
          alt="Amaral Barbearia"
          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '20px', marginBottom: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
        />
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '26px', fontWeight: '900', color: '#0A0A0A',
        }}>
          Amaral <span style={{ fontWeight: '300' }}>Barbearia</span>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)', marginTop: '4px' }}>
          Estamos prontos para cuidar do seu estilo.
        </div>
      </div>

      <div style={{ padding: '32px 20px 0' }}>
        <p style={{ fontSize: '14px', color: s.textSub, textAlign: 'center', marginBottom: '24px' }}>
          Para começar, diga-nos:
        </p>

        <button style={{ ...s.btnGold, marginBottom: '12px' }} onClick={onNovo}>
          👤 Sou Cliente Novo
        </button>
        <button style={{ ...s.btnDark, marginBottom: '24px' }} onClick={onCadastrado}>
          🔒 Já tenho cadastro
        </button>

        <div style={{
          background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '12px', color: '#FFC107',
          display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <span>⚠️</span>
          <span>Use um número de WhatsApp válido para receber confirmações.</span>
        </div>

        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: s.textSub, fontSize: '12px', cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: '24px' }}
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA 2: CADASTRO — Etapa 1 de 3 (dados pessoais)
// ─────────────────────────────────────────────────────────────
export function TelaCadastro({ onProximo, onBack, dark }) {
  const s = getStyles(dark);
  const [form, setForm] = React.useState({
    nome: '', telefone: '', cpf: '', idade: '', preferencia: '', foto: null,
  });
  const [erro, setErro] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
    setErro('');
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    comprimirFoto(file, (base64) => set('foto', base64));
  }

  async function handleProximo() {
    if (!form.nome.trim())      return setErro('Informe seu nome completo.');
    if (!form.telefone.trim())  return setErro('Informe seu telefone/WhatsApp.');
    if (!cpfValido(form.cpf))   return setErro('CPF inválido — informe 11 dígitos.');
    if (!form.idade.trim())     return setErro('Informe sua idade.');
    if (!form.preferencia)      return setErro('Selecione sua preferência de serviço.');

    setLoading(true);
    try {
      // Verifica se CPF já existe
      const ref = doc(db, 'clientes', limparCPF(form.cpf));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setErro('Este CPF já está cadastrado. Use "Já tenho cadastro".');
        setLoading(false);
        return;
      }
      onProximo({ ...form, cpf: limparCPF(form.cpf) });
    } catch (e) {
      setErro('Erro ao verificar CPF. Tente novamente.');
    }
    setLoading(false);
  }

  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ ...s.header }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '14px', cursor: 'pointer' }}>← Voltar</button>
        <div style={ s.headerTitle }>Criar Perfil</div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Indicador de etapa */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 0 8px' }}>
        <div style={{ width: '24px', height: '8px', borderRadius: '4px', background: '#C9A84C' }} />
        <div style={{ width: '8px',  height: '8px', borderRadius: '50%', background: '#333' }} />
        <div style={{ width: '8px',  height: '8px', borderRadius: '50%', background: '#333' }} />
      </div>

      <div style={{ padding: '8px 20px 0' }}>
        {/* Foto */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <label style={{ cursor: 'pointer' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: form.foto ? 'transparent' : '#2A2A2A',
              border: '2px dashed #C9A84C',
              margin: '0 auto 8px',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px',
            }}>
              {form.foto
                ? <img src={form.foto} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '📷'
              }
            </div>
            <div style={{ fontSize: '12px', color: '#C9A84C' }}>
              {form.foto ? 'Trocar foto' : 'Adicionar foto (opcional)'}
            </div>
            <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Campos */}
        {[
          { label: 'Nome completo *', campo: 'nome', placeholder: 'João da Silva', type: 'text' },
          { label: 'Telefone / WhatsApp *', campo: 'telefone', placeholder: '(11) 99999-9999', type: 'tel' },
          { label: 'Idade *', campo: 'idade', placeholder: '25', type: 'number' },
        ].map(({ label, campo, placeholder, type }) => (
          <div key={campo} style={{ marginBottom: '14px' }}>
            <label style={ s.label }>{label}</label>
            <input
              style={ s.input }
              type={type}
              placeholder={placeholder}
              value={form[campo]}
              onChange={e => set(campo, e.target.value)}
            />
          </div>
        ))}

        {/* CPF com formatação */}
        <div style={{ marginBottom: '14px' }}>
          <label style={ s.label }>CPF *</label>
          <input
            style={ s.input }
            type="text"
            placeholder="000.000.000-00"
            value={formatarCPF(form.cpf)}
            onChange={e => set('cpf', e.target.value)}
            maxLength={14}
          />
        </div>

        {/* Preferência */}
        <div style={{ marginBottom: '20px' }}>
          <label style={ s.label }>Preferência de serviço *</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PREFERENCIAS.map(p => (
              <div
                key={p.id}
                onClick={() => set('preferencia', p.id)}
                style={{
                  padding: '8px 14px', borderRadius: '20px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '600',
                  background: form.preferencia === p.id ? 'rgba(201,168,76,0.2)' : '#2A2A2A',
                  border: `1.5px solid ${form.preferencia === p.id ? '#C9A84C' : '#333'}`,
                  color: form.preferencia === p.id ? '#C9A84C' : '#888',
                  transition: 'all .2s',
                }}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ fontSize: '13px', color: '#F44336', marginBottom: '12px', textAlign: 'center', padding: '10px', background: 'rgba(244,67,54,0.1)', borderRadius: '10px' }}>
            ⚠️ {erro}
          </div>
        )}

        <button style={{ ...s.btnGold, opacity: loading ? 0.7 : 1 }} onClick={handleProximo} disabled={loading}>
          {loading ? 'Verificando...' : 'Continuar →'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA 3: CADASTRO — Etapa 2 de 3 (criar senha)
// ─────────────────────────────────────────────────────────────
export function TelaCriarSenha({ dadosCliente, onProximo, onBack, dark }) {
  const s = getStyles(dark);
  const [opcao, setOpcao] = React.useState('padrao'); // 'padrao' | 'custom'
  const [senhaCustom, setSenhaCustom] = React.useState('');
  const [erro, setErro] = React.useState('');

  const padrao = senhaPadrao(dadosCliente.cpf);

  function handleProximo() {
    if (opcao === 'custom') {
      if (senhaCustom.length !== 5 || !/^\d+$/.test(senhaCustom)) {
        return setErro('A senha deve ter exatamente 5 dígitos numéricos.');
      }
    }
    const senha = opcao === 'padrao' ? padrao : senhaCustom;
    onProximo({ ...dadosCliente, senha });
  }

  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>
      <div style={{ ...s.header }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '14px', cursor: 'pointer' }}>← Voltar</button>
        <div style={ s.headerTitle }>Criar Senha</div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Indicador */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 0 8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50' }} />
        <div style={{ width: '24px', height: '8px', borderRadius: '4px', background: '#C9A84C' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }} />
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Opção padrão */}
        <div
          onClick={() => { setOpcao('padrao'); setErro(''); }}
          style={{
            ...s.card,
            borderColor: opcao === 'padrao' ? '#C9A84C' : s.border,
            cursor: 'pointer', marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '600' }}>Usar senha padrão</div>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${opcao === 'padrao' ? '#C9A84C' : '#444'}`, background: opcao === 'padrao' ? '#C9A84C' : 'transparent' }} />
          </div>
          <div style={{ fontSize: '12px', color: s.textSub, marginBottom: '12px' }}>
            Últimos 5 dígitos do seu CPF:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {padrao.split('').map((d, i) => (
              <div key={i} style={{
                width: '44px', height: '52px',
                background: '#C9A84C', color: '#0A0A0A',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '22px',
                fontFamily: "'Playfair Display', serif",
              }}>
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
          <span style={{ fontSize: '12px', color: s.textSub }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
        </div>

        {/* Opção personalizada */}
        <div
          onClick={() => { setOpcao('custom'); setErro(''); }}
          style={{
            ...s.card,
            borderColor: opcao === 'custom' ? '#C9A84C' : s.border,
            cursor: 'pointer', marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: opcao === 'custom' ? '12px' : '0' }}>
            <div style={{ fontWeight: '600' }}>Criar minha senha</div>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${opcao === 'custom' ? '#C9A84C' : '#444'}`, background: opcao === 'custom' ? '#C9A84C' : 'transparent' }} />
          </div>
          {opcao === 'custom' && (
            <input
              style={{ ...s.input, textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: '700' }}
              type="password"
              placeholder="• • • • •"
              maxLength={5}
              value={senhaCustom}
              onChange={e => { setSenhaCustom(e.target.value.replace(/\D/g, '')); setErro(''); }}
              autoFocus
            />
          )}
        </div>

        {erro && (
          <div style={{ fontSize: '13px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>
            ⚠️ {erro}
          </div>
        )}

        <button style={ s.btnGold } onClick={handleProximo}>
          Continuar →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA 4: CADASTRO — Etapa 3 de 3 (pagamento preferencial)
// ─────────────────────────────────────────────────────────────
export function TelaPagamentoPref({ dadosCliente, onConcluir, onBack, dark }) {
  const s = getStyles(dark);
  const [pagPref, setPagPref] = React.useState('local');
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState('');

  async function handleConcluir() {
    setLoading(true);
    try {
      const dados = {
        nome:         dadosCliente.nome.trim(),
        telefone:     dadosCliente.telefone.trim(),
        cpf:          dadosCliente.cpf,
        idade:        dadosCliente.idade,
        preferencia:  dadosCliente.preferencia,
        foto:         dadosCliente.foto || null,
        senha:        dadosCliente.senha,
        pagPref:      pagPref,
        dataCadastro: serverTimestamp(),
        ultimoAcesso: serverTimestamp(),
        ultimoAgendamento: null,
        ultimoPagamento:   null,
      };

      await setDoc(doc(db, 'clientes', dadosCliente.cpf), dados);
      onConcluir({ cpf: dadosCliente.cpf, nome: dadosCliente.nome, foto: dadosCliente.foto });
    } catch (e) {
      setErro('Erro ao salvar cadastro. Tente novamente.');
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <div style={{ ...s.app, paddingBottom: '40px' }}>
      <div style={{ ...s.header }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '14px', cursor: 'pointer' }}>← Voltar</button>
        <div style={ s.headerTitle }>Pagamento</div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Indicador */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 0 8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50' }} />
        <div style={{ width: '24px', height: '8px', borderRadius: '4px', background: '#C9A84C' }} />
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontSize: '14px', color: s.textSub, marginBottom: '20px', textAlign: 'center' }}>
          Como você prefere pagar? (pode mudar a cada agendamento)
        </div>

        {[
          { id: 'local', icon: '💵', label: 'Pagar no local',   sub: 'No dia do atendimento — sem burocracia' },
          { id: 'pix',   icon: '📱', label: 'Pagar via Pix',    sub: 'Antecipado · garante sua vaga' },
        ].map(op => (
          <div
            key={op.id}
            onClick={() => setPagPref(op.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '16px', borderRadius: '14px', cursor: 'pointer',
              background: pagPref === op.id ? 'rgba(201,168,76,0.08)' : s.cardBg,
              border: `1.5px solid ${pagPref === op.id ? '#C9A84C' : s.border}`,
              marginBottom: '10px', transition: 'all .2s',
            }}
          >
            <div style={{ fontSize: '24px' }}>{op.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{op.label}</div>
              <div style={{ fontSize: '11px', color: s.textSub, marginTop: '2px' }}>{op.sub}</div>
            </div>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              border: `2px solid ${pagPref === op.id ? '#C9A84C' : '#444'}`,
              background: pagPref === op.id ? '#C9A84C' : 'transparent',
              flexShrink: 0,
            }} />
          </div>
        ))}

        <div style={{
          background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '12px', color: '#FFC107', marginTop: '8px', marginBottom: '20px',
        }}>
          ℹ️ O Pix antecipado é sempre opcional. Você decide a cada agendamento.
        </div>

        {erro && (
          <div style={{ fontSize: '13px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>
            ⚠️ {erro}
          </div>
        )}

        <button style={{ ...s.btnGold, opacity: loading ? 0.7 : 1 }} onClick={handleConcluir} disabled={loading}>
          {loading ? 'Salvando...' : '✅ Concluir cadastro'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA 5: LOGIN — CPF + Senha
// ─────────────────────────────────────────────────────────────
export function TelaLoginCliente({ onSucesso, onRecuperar, onBack, dark }) {
  const s = getStyles(dark);
  const [cpf, setCpf] = React.useState('');
  const [senha, setSenha] = React.useState('');
  const [erro, setErro] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleLogin() {
    const cpfLimpo = limparCPF(cpf);
    if (!cpfValido(cpf))    return setErro('CPF inválido.');
    if (senha.length !== 5) return setErro('A senha deve ter 5 dígitos.');

    setLoading(true);
    try {
      const ref  = doc(db, 'clientes', cpfLimpo);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setErro('CPF não encontrado. Faça seu cadastro primeiro.');
        setLoading(false);
        return;
      }

      const cliente = snap.data();
      if (cliente.senha !== senha) {
        setErro('Senha incorreta. Tente novamente.');
        setLoading(false);
        return;
      }

      // Atualiza último acesso
      await setDoc(ref, { ultimoAcesso: serverTimestamp() }, { merge: true });

      onSucesso({
        cpf:  cpfLimpo,
        nome: cliente.nome,
        foto: cliente.foto || null,
        ...cliente,
      });

    } catch (e) {
      setErro('Erro ao fazer login. Tente novamente.');
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <div style={{ ...s.app, padding: '0 0 40px' }}>
      <div style={{ ...s.header }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '14px', cursor: 'pointer' }}>← Voltar</button>
        <div style={ s.headerTitle }>Entrar</div>
        <div style={{ width: '60px' }} />
      </div>

      <div style={{ padding: '32px 20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/logo-amaral.jpg"
            alt="Amaral Barbearia"
            style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '18px', marginBottom: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
          />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#C9A84C' }}>
            Amaral Barbearia
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={ s.label }>CPF</label>
          <input
            style={ s.input }
            type="text"
            placeholder="000.000.000-00"
            value={formatarCPF(cpf)}
            onChange={e => { setCpf(e.target.value); setErro(''); }}
            maxLength={14}
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={ s.label }>Senha (5 dígitos)</label>
          <input
            style={{ ...s.input, textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: '700' }}
            type="password"
            placeholder="• • • • •"
            maxLength={5}
            value={senha}
            onChange={e => { setSenha(e.target.value.replace(/\D/g, '')); setErro(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <button
            onClick={onRecuperar}
            style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '12px', cursor: 'pointer' }}
          >
            Esqueci minha senha
          </button>
        </div>

        {erro && (
          <div style={{ fontSize: '13px', color: '#F44336', marginBottom: '12px', textAlign: 'center', padding: '10px', background: 'rgba(244,67,54,0.1)', borderRadius: '10px' }}>
            ⚠️ {erro}
          </div>
        )}

        <button style={{ ...s.btnGold, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA 6: RECUPERAR SENHA
// ─────────────────────────────────────────────────────────────
export function TelaRecuperarSenha({ onBack, onLogin, dark }) {
  const s = getStyles(dark);
  const [cpf, setCpf] = React.useState('');
  const [resultado, setResultado] = React.useState(null);
  const [erro, setErro] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleBuscar() {
    const cpfLimpo = limparCPF(cpf);
    if (!cpfValido(cpf)) return setErro('CPF inválido.');

    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'clientes', cpfLimpo));
      if (!snap.exists()) {
        setErro('CPF não encontrado.');
        setLoading(false);
        return;
      }
      // Mostra senha (os 5 últimos do CPF são a senha padrão ou a customizada)
      // Por segurança, só mostramos os últimos 5 do CPF como dica
      setResultado(senhaPadrao(cpfLimpo));
      setErro('');
    } catch (e) {
      setErro('Erro ao buscar. Tente novamente.');
    }
    setLoading(false);
  }

  return (
    <div style={{ ...s.app, padding: '0 0 40px' }}>
      <div style={{ ...s.header }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '14px', cursor: 'pointer' }}>← Voltar</button>
        <div style={ s.headerTitle }>Recuperar Senha</div>
        <div style={{ width: '60px' }} />
      </div>

      <div style={{ padding: '32px 20px 0' }}>
        <p style={{ fontSize: '14px', color: s.textSub, marginBottom: '24px', textAlign: 'center' }}>
          Informe seu CPF para ver sua senha padrão.
        </p>

        <div style={{ marginBottom: '14px' }}>
          <label style={ s.label }>CPF cadastrado</label>
          <input
            style={ s.input }
            type="text"
            placeholder="000.000.000-00"
            value={formatarCPF(cpf)}
            onChange={e => { setCpf(e.target.value); setErro(''); setResultado(null); }}
            maxLength={14}
          />
        </div>

        {erro && (
          <div style={{ fontSize: '13px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>
            ⚠️ {erro}
          </div>
        )}

        <button style={{ ...s.btnGold, marginBottom: '16px', opacity: loading ? 0.7 : 1 }} onClick={handleBuscar} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar →'}
        </button>

        {resultado && (
          <div style={{
            ...s.card,
            borderColor: '#C9A84C',
            textAlign: 'center',
            background: 'rgba(201,168,76,0.05)',
          }}>
            <div style={{ fontSize: '13px', color: s.textSub, marginBottom: '12px' }}>
              Sua senha padrão (últimos 5 dígitos do CPF):
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {resultado.split('').map((d, i) => (
                <div key={i} style={{
                  width: '44px', height: '52px',
                  background: '#C9A84C', color: '#0A0A0A',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '22px',
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: s.textSub, marginBottom: '14px' }}>
              Se você criou uma senha personalizada, use ela. Caso não lembre, entre em contato com a barbearia.
            </div>
            <button style={ s.btnGold } onClick={onLogin}>
              Entrar agora →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTROLADOR PRINCIPAL — gerencia o fluxo de telas
// ─────────────────────────────────────────────────────────────
export default function LoginFlow({ onSucesso, onBack, dark }) {
  const [tela, setTela] = React.useState('entrada');
  const [dadosCadastro, setDadosCadastro] = React.useState({});

  // Fluxo cadastro
  if (tela === 'entrada') {
    return (
      <TelaEntradaCliente
        onNovo={() => setTela('cadastro1')}
        onCadastrado={() => setTela('login')}
        onBack={onBack}
        dark={dark}
      />
    );
  }

  if (tela === 'cadastro1') {
    return (
      <TelaCadastro
        onProximo={(dados) => { setDadosCadastro(dados); setTela('cadastro2'); }}
        onBack={() => setTela('entrada')}
        dark={dark}
      />
    );
  }

  if (tela === 'cadastro2') {
    return (
      <TelaCriarSenha
        dadosCliente={dadosCadastro}
        onProximo={(dados) => { setDadosCadastro(dados); setTela('cadastro3'); }}
        onBack={() => setTela('cadastro1')}
        dark={dark}
      />
    );
  }

  if (tela === 'cadastro3') {
    return (
      <TelaPagamentoPref
        dadosCliente={dadosCadastro}
        onConcluir={(cliente) => onSucesso(cliente)}
        onBack={() => setTela('cadastro2')}
        dark={dark}
      />
    );
  }

  // Fluxo login
  if (tela === 'login') {
    return (
      <TelaLoginCliente
        onSucesso={(cliente) => onSucesso(cliente)}
        onRecuperar={() => setTela('recuperar')}
        onBack={() => setTela('entrada')}
        dark={dark}
      />
    );
  }

  if (tela === 'recuperar') {
    return (
      <TelaRecuperarSenha
        onBack={() => setTela('login')}
        onLogin={() => setTela('login')}
        dark={dark}
      />
    );
  }

  return null;
}
