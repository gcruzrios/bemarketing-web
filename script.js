// BeMarketing — interacciones ligeras, sin dependencias
document.addEventListener('DOMContentLoaded', () => {

  // Textos del formulario según el idioma de la página (/en = inglés)
  const EN = document.documentElement.lang === 'en';
  const MSG = EN ? {
    sending: 'Sending…',
    ok: 'Thank you! We received your request.',
    fail: 'We could not send your message. Please try again or message us on WhatsApp at +506 8315-3405.',
    offline: 'Could not reach the server. Please try again or message us on WhatsApp at +506 8315-3405.'
  } : {
    sending: 'Enviando…',
    ok: '¡Gracias! Recibimos su solicitud.',
    fail: 'No pudimos enviar su mensaje. Intente de nuevo o escríbanos por WhatsApp al +506 8315-3405.',
    offline: 'Sin conexión con el servidor. Intente de nuevo o escríbanos por WhatsApp al +506 8315-3405.'
  };

  // Selector de idioma (desplegable)
  const lang = document.querySelector('.lang-switch');
  if (lang) {
    const btn = lang.querySelector('.lang-btn');
    const setOpen = (o) => { lang.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!lang.classList.contains('open')); });
    document.addEventListener('click', (e) => { if (!lang.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // Menú móvil
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Formulario de contacto → mail/send-mail.php
  const form = document.querySelector('#contact-form');
  if (form) {
    // Origen del contacto (?origen=…): identifica la página desde la que llega la persona.
    // "social-media" además envía copia a social@bemarketingcr.com
    const ORIGENES = ['social-media', 'hoteles', 'restaurantes', 'cafeterias'];
    const originInput = form.querySelector('#form_origin');
    const origen = new URLSearchParams(window.location.search).get('origen');
    const origenValido = ORIGENES.includes(origen) ? origen : null;
    if (originInput && origenValido) originInput.value = origenValido;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.querySelector('#form-status');
      const btn = form.querySelector('button[type="submit"]');
      const btnLabel = btn.textContent;
      const showStatus = (ok, text) => {
        if (!status) return;
        status.textContent = text;
        status.classList.remove('ok', 'error');
        status.classList.add(ok ? 'ok' : 'error');
      };

      btn.disabled = true;
      btn.textContent = MSG.sending;
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showStatus(true, EN ? MSG.ok : (data.message || MSG.ok));
          form.reset();
          if (originInput && origenValido) originInput.value = origenValido;
        } else {
          showStatus(false, EN ? MSG.fail : (data.message || MSG.fail));
        }
      } catch (err) {
        showStatus(false, MSG.offline);
      } finally {
        btn.disabled = false;
        btn.textContent = btnLabel;
      }
    });
  }

  // Año dinámico en footer
  document.querySelectorAll('.year').forEach(el => { el.textContent = new Date().getFullYear(); });
});
