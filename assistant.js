/* Asistente del CRM · interfaz de primera versión.
   El historial vive solo en memoria de esta pestaña. */
const Assistant = (() => {
  let messages = [];
  let busy = false;
  const escHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const suggestions = [
    '¿Cuántos proyectos tengo activos?',
    '¿Cuánto dinero tengo pendiente de cobrar?',
    '¿Qué clientes necesitan seguimiento?',
    'Resume el estado de mis proyectos.'
  ];
  function render() {
    return `<section class="assistant-wrap">
      <div class="assistant-intro">
        <div class="assistant-mark">AI</div>
        <div><h2>Asistente de Gámez Desarrollo Web</h2>
        <p class="muted">Consulta tus proyectos, clientes y finanzas usando los datos de tu CRM.</p></div>
      </div>
      <div class="assistant-notice"><b>Modo de solo lectura.</b> El asistente puede consultar información, pero no crear, editar ni eliminar registros.</div>
      <div class="assistant-suggestions">${suggestions.map((s,i)=>`<button class="assistant-suggestion" type="button" data-assistant-suggestion="${i}">${escHtml(s)}</button>`).join('')}</div>
      <div id="assistant-log" class="assistant-log" aria-live="polite">
        <div class="assistant-empty">Hola. Puedo ayudarte a entender el estado de tu negocio con la información registrada en el CRM.</div>
      </div>
      <form id="assistant-form" class="assistant-form">
        <label class="sr-only" for="assistant-input">Escribe tu consulta</label>
        <textarea id="assistant-input" rows="2" maxlength="2000" placeholder="Pregúntame sobre tus proyectos, clientes o cobros…" required></textarea>
        <button class="btn" id="assistant-send" type="submit">Enviar</button>
      </form>
      <p class="assistant-footnote">No incluyas contraseñas, datos bancarios ni información sensible de clientes.</p>
    </section>`;
  }
  function draw() {
    const log = document.querySelector('#assistant-log');
    if (!log) return;
    log.innerHTML = messages.length ? messages.map(m => `
      <article class="assistant-message ${m.role === 'user' ? 'user' : 'bot'}">
        <small>${m.role === 'user' ? 'Tú' : 'Asistente'}</small>
        <div>${escHtml(m.content).replace(/\n/g,'<br>')}</div>
      </article>`).join('') : '<div class="assistant-empty">Hola. Puedo ayudarte a entender el estado de tu negocio con la información registrada en el CRM.</div>';
    if (busy) log.insertAdjacentHTML('beforeend','<div class="assistant-thinking">Analizando la información del CRM…</div>');
    log.scrollTop = log.scrollHeight;
    const send = document.querySelector('#assistant-send');
    if (send) send.disabled = busy;
  }
  async function ask(value) {
    const question = String(value || '').trim();
    if (!question || busy) return;
    messages.push({role:'user',content:question});
    busy = true;
    draw();
    const input = document.querySelector('#assistant-input');
    if (input) input.value = '';
    try {
      const answer = await Storage.askAssistant(messages.slice(-12));
      messages.push({role:'assistant',content:answer});
    } catch (error) {
      const safeMessage = error?.message || 'No fue posible consultar al asistente.';
      messages.push({role:'assistant',content:'No pude completar la consulta. ' + safeMessage});
    } finally {
      busy = false;
      draw();
    }
  }
  document.addEventListener('submit', event => {
    if (event.target?.id !== 'assistant-form') return;
    event.preventDefault();
    ask(document.querySelector('#assistant-input')?.value);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-assistant-suggestion]');
    if (button) ask(suggestions[Number(button.dataset.assistantSuggestion)]);
  });
  return {render, refresh:draw};
})();
