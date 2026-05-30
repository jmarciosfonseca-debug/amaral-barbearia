// notificacoes.js — Flyguer BarberShop
// ✅ Funções de notificação via WhatsApp link (gratuito, funciona já)
// Uso: chamar após criar/confirmar/cancelar agendamento

const WHATSAPP_BARBEARIA = '11977643509'; // WhatsApp da barbearia

// ── Formata data para exibição ───────────────────────────────
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const diaSem = DIAS[new Date(dataStr + 'T12:00:00').getDay()];
  return `${diaSem}, ${dia}/${mes}/${ano}`;
}

// ── Abre WhatsApp com mensagem pronta ───────────────────────
function abrirWhatsApp(numero, mensagem) {
  const num = numero.replace(/\D/g, '');
  const url = `https://wa.me/55${num}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

// ─────────────────────────────────────────────────────────────
// 1. CLIENTE acabou de agendar — notifica barbearia
// ─────────────────────────────────────────────────────────────
export function notificarBarbeariaNovoAgendamento(agendamento) {
  const msg = `✂️ *Novo Agendamento — Flyguer BarberShop*

👤 Cliente: ${agendamento.clienteNome}
📞 Telefone: ${agendamento.clienteTel || 'Não informado'}
✂️ Barbeiro: ${agendamento.barbeiroNome}
💈 Serviço: ${agendamento.servico}
📅 Data: ${formatarData(agendamento.data)}
🕐 Horário: ${agendamento.hora}
💰 Valor: R$ ${(agendamento.valor || 0).toFixed(2).replace('.', ',')}
💳 Pagamento: ${agendamento.pagamento === 'pix' || agendamento.pagamento === 'pix_sinal' ? 'Pix antecipado ✅' : 'No local'}

_Agendado pelo app Flyguer BarberShop_`;

  abrirWhatsApp(WHATSAPP_BARBEARIA, msg);
}

// ─────────────────────────────────────────────────────────────
// 2. RECEPÇÃO criou agendamento — notifica cliente
// ─────────────────────────────────────────────────────────────
export function notificarClienteAgendamentoManual(agendamento) {
  if (!agendamento.clienteTel) return;
  const msg = `Olá, ${agendamento.clienteNome?.split(' ')[0]}! 👋

Seu agendamento foi feito pela nossa recepção:

✂️ Barbeiro: ${agendamento.barbeiroNome}
💈 Serviço: ${agendamento.servico}
📅 Data: ${formatarData(agendamento.data)}
🕐 Horário: ${agendamento.hora}
💰 Valor: R$ ${(agendamento.valor || 0).toFixed(2).replace('.', ',')}
💳 Pagamento: ${agendamento.pagamento === 'pix' ? 'Pix antecipado' : 'No local'}

Acompanhe pelo app:
👉 https://flyguer-barbershop.vercel.app

Qualquer dúvida, estamos aqui!
_Flyguer BarberShop_ ✂️`;

  abrirWhatsApp(agendamento.clienteTel, msg);
}

// ─────────────────────────────────────────────────────────────
// 3. CLIENTE cancelou — notifica barbearia
// ─────────────────────────────────────────────────────────────
export function notificarBarbeariaCancel(agendamento) {
  const msg = `❌ *Cancelamento — Flyguer BarberShop*

👤 Cliente: ${agendamento.clienteNome}
✂️ Barbeiro: ${agendamento.barbeiroNome}
📅 Data: ${formatarData(agendamento.data)}
🕐 Horário: ${agendamento.hora}
💈 Serviço: ${agendamento.servico}

_O horário ficou disponível no app._`;

  abrirWhatsApp(WHATSAPP_BARBEARIA, msg);
}

// ─────────────────────────────────────────────────────────────
// 4. LEMBRETE — barbearia envia para cliente (1 dia antes)
// ─────────────────────────────────────────────────────────────
export function lembreteClienteAmanha(agendamento) {
  if (!agendamento.clienteTel) return;
  const msg = `Olá, ${agendamento.clienteNome?.split(' ')[0]}! 👋

Lembrando que seu agendamento é *amanhã*:

✂️ Barbeiro: ${agendamento.barbeiroNome}
💈 Serviço: ${agendamento.servico}
📅 Data: ${formatarData(agendamento.data)}
🕐 Horário: ${agendamento.hora}

Nos vemos amanhã! 😊
_Flyguer BarberShop_ ✂️

_Para cancelar, acesse o app até 2h antes._`;

  abrirWhatsApp(agendamento.clienteTel, msg);
}

// ─────────────────────────────────────────────────────────────
// 5. PAGAMENTO confirmado — notifica cliente
// ─────────────────────────────────────────────────────────────
export function notificarClientePagamentoConfirmado(agendamento) {
  if (!agendamento.clienteTel) return;
  const msg = `✅ *Pagamento Confirmado — Flyguer BarberShop*

Olá, ${agendamento.clienteNome?.split(' ')[0]}!

Seu pagamento foi registrado com sucesso! ✅

💈 Serviço: ${agendamento.servico}
💰 Valor: R$ ${(agendamento.valorRecebido || agendamento.valor || 0).toFixed(2).replace('.', ',')}
💳 Forma: ${agendamento.pagamentoFinal || agendamento.pagamento}

Obrigado pela preferência! 🙏
_Flyguer BarberShop_ ✂️`;

  abrirWhatsApp(agendamento.clienteTel, msg);
}
