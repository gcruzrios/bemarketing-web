// BeMarketing · Nuevo sitio — interacciones ligeras, sin dependencias
document.documentElement.classList.remove('no-js');

document.addEventListener('DOMContentLoaded', () => {
  const EN = document.documentElement.lang === 'en';

  // ---------- Menú móvil ----------
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ---------- Pestañas genéricas (role="tablist") ----------
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      list.dispatchEvent(new CustomEvent('tabchange', { detail: tab.dataset.value }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.focus(); select(next);
      });
    });
  });

  // ---------- Calculadora de crecimiento ----------
  const roi = document.querySelector('#roi');
  if (roi) {
    const num0 = new Intl.NumberFormat(EN ? 'en-US' : 'es-CR', { maximumFractionDigits: 0 });
    const fmt = { format: (v) => '$' + num0.format(v) };
    const num = new Intl.NumberFormat(EN ? 'en-US' : 'es-CR', { maximumFractionDigits: 0 });
    const dec = new Intl.NumberFormat(EN ? 'en-US' : 'es-CR', { maximumFractionDigits: 2 });
    let mode = roi.dataset.mode || 'hotel';
    const val = (id) => Number(roi.querySelector('#' + id).value);
    const out = (id, text) => { const el = roi.querySelector('#' + id); if (el) el.textContent = text; };

    const calc = () => {
      roi.querySelectorAll('input[type="range"]').forEach((r) => {
        const o = roi.querySelector(`output[for="${r.id}"]`);
        if (o) o.textContent = (r.dataset.prefix || '') + dec.format(r.value) + (r.dataset.suffix || '');
      });
      if (mode === 'hotel') {
        // Noches vendidas al año que hoy entran por OTAs, y 25% de ellas movidas a canal directo
        const nights = val('rooms') * 365 * (val('occ') / 100);
        const otaNights = nights * (val('ota') / 100);
        const moved = otaNights * 0.25;
        const saved = moved * val('adr') * (val('comm') / 100);
        out('roiBig', fmt.format(saved));
        out('roiLab', EN ? 'estimated commissions saved per year' : 'en comisiones ahorradas al año (estimado)');
        out('r1a', EN ? 'Nights moved to direct booking' : 'Noches que pasan a reserva directa');
        out('r1b', num.format(moved));
        out('r2a', EN ? 'Direct revenue (no commission)' : 'Ingreso directo sin comisión');
        out('r2b', fmt.format(moved * val('adr')));
        out('r3a', EN ? 'Monthly saving' : 'Ahorro mensual');
        out('r3b', fmt.format(saved / 12));
      } else if (mode === 'cafe') {
        // Lealtad: +8% de visitas; pedidos por adelantado: +10% de ticket para quien los usa
        const visits = val('cdaily') * val('cdays') * 52;
        const extraVisits = visits * 0.08;
        const preorderLift = (visits + extraVisits) * (val('cpre') / 100) * val('cticket') * 0.10;
        const extra = extraVisits * val('cticket') + preorderLift;
        out('roiBig', fmt.format(extra));
        out('roiLab', EN ? 'estimated additional sales per year' : 'en ventas adicionales al año (estimado)');
        out('r1a', EN ? 'Extra visits from the loyalty program' : 'Visitas extra por cliente frecuente');
        out('r1b', num.format(extraVisits));
        out('r2a', EN ? 'Higher ticket from pre-orders' : 'Mayor ticket por pedidos anticipados');
        out('r2b', fmt.format(preorderLift));
        out('r3a', EN ? 'Monthly increase' : 'Aumento mensual');
        out('r3b', fmt.format(extra / 12));
      } else {
        // Recuperar la mitad de los no-shows con recordatorios + 8% más cubiertos en días bajos
        const covers = val('covers') * 52;
        const recovered = covers * (val('noshow') / 100) * 0.5;
        const lowDays = covers * (val('lowshare') / 100) * 0.08;
        const extra = (recovered + lowDays) * val('ticket');
        out('roiBig', fmt.format(extra));
        out('roiLab', EN ? 'estimated additional revenue per year' : 'en ventas adicionales al año (estimado)');
        out('r1a', EN ? 'Covers recovered from no-shows' : 'Cubiertos recuperados de no-shows');
        out('r1b', num.format(recovered));
        out('r2a', EN ? 'Extra covers on slow days' : 'Cubiertos extra en días bajos');
        out('r2b', num.format(lowDays));
        out('r3a', EN ? 'Monthly increase' : 'Aumento mensual');
        out('r3b', fmt.format(extra / 12));
      }
    };
    roi.querySelectorAll('input[type="range"]').forEach((r) => r.addEventListener('input', calc));
    const roiTabs = roi.querySelector('[role="tablist"]');
    if (roiTabs) roiTabs.addEventListener('tabchange', (e) => { mode = e.detail; calc(); });
    calc();
  }

  // ---------- Formulario de diagnóstico ----------
  const form = document.querySelector('#contact-form');
  if (form) {
    // Precarga desde el buscador de la home (?tipo=…&prioridad=…&tamano=…&interes=…)
    const params = new URLSearchParams(window.location.search);
    const setSelect = (name, value) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && value && [...el.options].some((o) => o.value === value)) el.value = value;
    };
    setSelect('sector', params.get('tipo'));
    setSelect('size', params.get('tamano'));
    const prioridad = params.get('prioridad');
    if (prioridad) form.querySelectorAll('input[name="needs"]').forEach((c) => { if (c.value === prioridad) c.checked = true; });
    const interes = params.get('interes');
    if (interes) form.querySelectorAll('input[name="interest"]').forEach((r) => { if (r.value === interes) r.checked = true; });

    const ORIGENES = ['hoteles', 'restaurantes', 'cafeterias', 'social-media'];
    const origen = params.get('origen');
    const originInput = form.querySelector('#form_origin');
    if (originInput && ORIGENES.includes(origen)) originInput.value = origen;

    const MSG = EN ? {
      sending: 'Sending…', ok: 'Thank you! We received your request and will contact you within one business day.',
      fail: 'We could not send your message. Please try again or message us on WhatsApp at +506 7095-3464.',
      offline: 'Could not reach the server. Please try again or message us on WhatsApp at +506 7095-3464.',
    } : {
      sending: 'Enviando…', ok: '¡Gracias! Recibimos su solicitud y le contactamos en menos de un día hábil.',
      fail: 'No pudimos enviar su mensaje. Intente de nuevo o escríbanos por WhatsApp al +506 7095-3464.',
      offline: 'Sin conexión con el servidor. Intente de nuevo o escríbanos por WhatsApp al +506 7095-3464.',
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('#form-status');
      const btn = form.querySelector('button[type="submit"]');
      const label = btn.textContent;
      const show = (ok, text) => { status.textContent = text; status.className = 'form-status ' + (ok ? 'ok' : 'error'); };

      // send-mail.php recibe interest / size / needs como campos propios
      // (Solicitud, Tamaño y Prioridades en el correo a info@bemarketingcr.com).
      const fd = new FormData(form);
      const needs = fd.getAll('needs');
      fd.set('needs', needs.join(', '));

      btn.disabled = true; btn.textContent = MSG.sending;
      try {
        const res = await fetch(form.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          show(true, EN ? MSG.ok : (data.message || MSG.ok));
          form.reset();
        } else {
          show(false, EN ? MSG.fail : (data.message || MSG.fail));
        }
      } catch (err) {
        show(false, MSG.offline);
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  // ---------- Asistente Natalia (WhatsApp) ----------
  const wa = document.querySelector('.wa-float');
  // En pantallas angostas solo queda el botón, para no tapar el contenido
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('waClosed') === '1'; } catch (e) {}
  if (wa && !dismissed && window.matchMedia('(min-width: 641px)').matches) {
    const T = EN ? {
      role: 'AI assistant · BeMarketing', close: 'Close', ask: 'Ask anything…', send: 'Send on WhatsApp',
      hello: 'Hi! I’m Natalia, BeMarketing’s AI assistant. How can I help you today?',
    } : {
      role: 'Asistente de IA · BeMarketing', close: 'Cerrar', ask: 'Escriba su consulta…', send: 'Enviar por WhatsApp',
      hello: '¡Hola! Soy Natalia, asistente de IA de BeMarketing. ¿Cómo puedo ayudarle hoy?',
    };
    const card = document.createElement('aside');
    card.className = 'wa-card';
    card.setAttribute('aria-label', 'Natalia');
    card.innerHTML = `<div class="wa-card-head"><img src="${wa.querySelector('img').getAttribute('src')}" alt="" width="36" height="36"><div><strong>Natalia</strong><small>${T.role}</small></div><button type="button" class="wa-close" aria-label="${T.close}">×</button></div><p>${T.hello}</p>`;
    const ask = document.createElement('form');
    ask.className = 'wa-ask';
    ask.innerHTML = `<input type="text" aria-label="${T.ask}" placeholder="${T.ask}" autocomplete="off"><button type="submit" aria-label="${T.send}">➤</button>`;
    card.hidden = ask.hidden = true;
    document.body.append(card, ask);
    setTimeout(() => { card.hidden = ask.hidden = false; }, 2500);

    card.querySelector('.wa-close').addEventListener('click', () => {
      card.remove(); ask.remove();
      try { sessionStorage.setItem('waClosed', '1'); } catch (e) {}
    });
    ask.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = ask.querySelector('input').value.trim();
      const url = new URL(wa.href);
      if (text) url.search = '?text=' + encodeURIComponent(text);
      window.open(url.href, '_blank', 'noopener');
      ask.reset();
    });
  }

  document.querySelectorAll('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
});
