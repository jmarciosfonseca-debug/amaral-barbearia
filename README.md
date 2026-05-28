# Amaral Barbearia — App de Agendamento

**Desenvolvido por:** Marcio Fonseca + Claude (Anthropic)  
**Stack:** React (CRA) + Firebase Firestore + Vercel  
**Padrão:** Herdado do MokLog CheckTest (Moked Consulting Security)

---

## 🚀 Setup — Passo a Passo

### 1. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Nome sugerido: `amaral-barbearia`
4. Desative Google Analytics (não necessário)
5. Aguarde a criação

#### Ativar Firestore
- No menu lateral: **Firestore Database → Criar banco de dados**
- Modo: **Produção**
- Região: `southamerica-east1` (São Paulo)

#### Pegar as configurações
- **Configurações do projeto (⚙️) → Seus apps → Adicionar app → Web**
- Nome do app: `amaral-barbearia-web`
- Copie o objeto `firebaseConfig`

### 2. Configurar o firebase.js

Abra `src/firebase.js` e substitua os valores:

```js
const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "amaral-barbearia.firebaseapp.com",
  projectId:         "amaral-barbearia",
  storageBucket:     "amaral-barbearia.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID"
};
```

### 3. Criar repositório no GitHub

```
1. github.com → New repository
2. Nome: amaral-barbearia
3. Conta: jmarciosfonseca-debug
4. Privado ou público (sua escolha)
5. NÃO inicializar com README (já temos)
```

### 4. Subir os arquivos

No GitHub, na pasta `src/`, faça upload de:
- `App.jsx`
- `firebase.js` (com as configs preenchidas)
- `getStyles.js`
- `index.js`

E na raiz:
- `package.json`

Na pasta `public/`:
- `index.html`

### 5. Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. **Add New → Project**
3. Selecione o repo `amaral-barbearia`
4. Framework: **Create React App** (detecta automático)
5. **Deploy**

✅ App disponível em: `amaral-barbearia.vercel.app`

---

## 📁 Estrutura de arquivos

```
amaral-barbearia/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx          ← Principal (navegação + telas)
│   ├── firebase.js      ← Config Firebase + collections
│   ├── getStyles.js     ← Tema dark/light + constantes
│   ├── index.js         ← Entry point React
│   │
│   │   ── Próximos arquivos (conforme passos) ──
│   ├── Login.jsx        ← Passo 3: cadastro + login cliente
│   ├── Agendamento.jsx  ← Passo 6: calendário + horários
│   ├── Barbeiro.jsx     ← Passo 8: painel do barbeiro
│   ├── Gerente.jsx      ← Passo 9: painel gerencial
│   ├── Recepcao.jsx     ← Passo 10: painel web recepção
│   └── Notificacoes.js  ← Passo 11: Firebase Cloud Messaging
└── package.json
```

---

## 🔐 PINs de acesso (desenvolvimento)

| PIN    | Perfil    | Nome  |
|--------|-----------|-------|
| `0001` | Gerente   | Cadu  |
| `1002` | Barbeiro  | Igor  |
| `1003` | Barbeiro  | Rod   |
| `REC1` | Recepção  | Maria |

> ⚠️ Estes PINs são temporários para desenvolvimento.  
> No Passo 5, o gerente define os PINs reais pelo app.

---

## 📋 Collections Firebase

| Collection | Descrição |
|-----------|-----------|
| `barbearia/config` | Nome, WhatsApp, Pix, endereço |
| `barbearia/horarios` | Dias abertos, horário, almoço |
| `barbeiros/{id}` | Equipe (nome, foto, pin, whatsapp) |
| `clientes/{cpf}` | Cadastro clientes (senha hash) |
| `servicos/{id}` | Tabela de preços e duração |
| `agendamentos/{id}` | Reservas com status |
| `clientes_fixos/{id}` | Recorrências + exceções |
| `financeiro/{data}` | Resumo diário |
| `recepcionistas/{id}` | Login + permissões |

---

## 📅 Progresso dos passos

- [x] **Passo 1** — Projeto base (GitHub + Firebase + Vercel)
- [x] **Passo 2** — Collections Firebase (estrutura definida)
- [ ] **Passo 3** — Login & Cadastro cliente
- [ ] **Passo 4** — Configuração da barbearia
- [ ] **Passo 5** — Cadastro de barbeiros
- [ ] **Passo 6** — Calendário & Agendamento
- [ ] **Passo 7** — Confirmação WhatsApp
- [ ] **Passo 8** — Painel do barbeiro
- [ ] **Passo 9** — Painel do gerente + financeiro
- [ ] **Passo 10** — Painel web da recepção
- [ ] **Passo 11** — Notificações push (FCM)
- [ ] **Passo 12** — Clientes fixos & recorrência
- [ ] **Passo 13** — Pagamento Pix + comprovante
- [ ] **Passo 14** — Testes & deploy final

---

*Amaral Barbearia App © 2026*  
*Desenvolvido com Claude (Anthropic) — padrão MokLog*
