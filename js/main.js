/* ══════════════════════════════════════════════════
   TAP IN — main.js
   Navbar · Tabs · FAQ · Form · Scroll animations
   ══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── PAGE LOAD ANIMATION ─────────────────────── */
  document.body.classList.add('hero-loading');

  /* ── PERF · PAUSE OFF-SCREEN ANIMATIONS ────────────────────────
     La landing tiene >100 animaciones CSS infinitas (blooms, particles,
     conic sweeps, marquees, drifts). Corriendo 24/7 en TODAS las
     secciones genera repaints/composites continuos y mata el FPS al
     scrollear. Solución: marcamos cada section como `.is-offscreen`
     cuando sale del viewport y CSS pausa todas las animaciones que
     contiene. La sección visible mantiene su animación intacta. */
  (function pauseOffscreenAnimations() {
    const sections = document.querySelectorAll('body > section, .bg-light-stack > section, .bg-dark-stack > section');
    if (!sections.length || !('IntersectionObserver' in window)) return;
    sections.forEach((s) => s.classList.add('is-offscreen'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, {
      rootMargin: '120px 0px 120px 0px',  // empieza un poco antes para evitar pop-in visible
      threshold: 0
    });
    sections.forEach((s) => io.observe(s));
  })();

  /* ── MOBILE NAV TOGGLE ───────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.querySelector('.nav-links');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      if (navLinks) navLinks.classList.toggle('mobile-open');
    });

    // close mobile nav on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        if (navLinks) navLinks.classList.remove('mobile-open');
      });
    });
  }

  /* ── CÓMO FUNCIONA · PERSONA SWITCHER + STEP CYCLE ─
     - Persona buttons swap the visible panel
     - Within each panel, steps auto-advance every STEP_MS ms
     - Active step highlights mockup screen via [data-screen]
     - Steps fill a vertical rail and persona progress bar
     - Hover on the stage pauses; manual click jumps to step
     - When the section is offscreen, cycling stops to save battery
  ──────────────────────────────────────────────── */
  const stage = document.querySelector('.como-stage');

  if (stage) {
    const STEP_MS = 3800;
    const STEP_TICK = 50; // progress refresh interval
    const personaBtns = stage.querySelectorAll('.como-persona');
    const panels = stage.querySelectorAll('.como-panel');

    let currentPersona = stage.dataset.active || 'colegio';
    let currentStep = 1;
    let elapsed = 0;
    let tickerId = null;
    let isPaused = false;
    let inView = false;

    const getPanel = (name) => stage.querySelector(`.como-panel[data-panel="${name}"]`);
    const getPersonaBtn = (name) => stage.querySelector(`.como-persona[data-persona="${name}"]`);

    const totalSteps = (panel) => panel.querySelectorAll('.step').length;

    const setProgress = (pct) => {
      const btn = getPersonaBtn(currentPersona);
      if (!btn) return;
      const fill = btn.querySelector('.persona-progress-fill');
      if (fill) fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };

    const setRailFill = (panel, total, step) => {
      const fill = panel.querySelector('.steps-rail-fill');
      if (!fill) return;
      const stepsTotal = total || 1;
      const pct = ((step - 1) / Math.max(1, stepsTotal - 1)) * 100;
      fill.style.height = `${pct}%`;
    };

    const setStep = (panel, step, { animate = true } = {}) => {
      const steps = panel.querySelectorAll('.step');
      const screens = panel.querySelectorAll('.screen');
      steps.forEach((s) => {
        const n = parseInt(s.dataset.step, 10);
        s.classList.toggle('active', n === step);
        s.classList.toggle('done',   n  <  step);
      });
      screens.forEach((sc) => {
        const n = parseInt(sc.dataset.screen, 10);
        sc.classList.toggle('active', n === step);
      });
      setRailFill(panel, steps.length, step);
      currentStep = step;
      elapsed = 0;
      if (!animate) {
        // No-op for now: step transitions are CSS-driven
      }
    };

    const tick = () => {
      if (isPaused || !inView) return;
      elapsed += STEP_TICK;
      const panel = getPanel(currentPersona);
      if (!panel) return;
      const total = totalSteps(panel);
      const stepProgress = Math.min(1, elapsed / STEP_MS);
      const overallPct = (((currentStep - 1) + stepProgress) / total) * 100;
      setProgress(overallPct);

      if (elapsed >= STEP_MS) {
        const next = currentStep >= total ? 1 : currentStep + 1;
        setStep(panel, next);
      }
    };

    const startTicker = () => {
      stopTicker();
      tickerId = setInterval(tick, STEP_TICK);
    };

    const stopTicker = () => {
      if (tickerId) {
        clearInterval(tickerId);
        tickerId = null;
      }
    };

    const setPersona = (name) => {
      if (name === currentPersona) return;
      currentPersona = name;
      stage.dataset.active = name;

      personaBtns.forEach((b) => {
        const isActive = b.dataset.persona === name;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
        // Reset progress fills on inactive personas
        if (!isActive) {
          const f = b.querySelector('.persona-progress-fill');
          if (f) f.style.width = '0%';
        }
      });

      panels.forEach((p) => {
        const isActive = p.dataset.panel === name;
        p.classList.toggle('active', isActive);
      });

      const panel = getPanel(name);
      if (panel) setStep(panel, 1, { animate: false });
      setProgress(0);
    };

    /* Persona click */
    personaBtns.forEach((btn) => {
      btn.addEventListener('click', () => setPersona(btn.dataset.persona));
    });

    /* Step click — jump to that step within the active panel */
    stage.addEventListener('click', (e) => {
      const stepEl = e.target.closest('.step');
      if (!stepEl) return;
      const panel = stepEl.closest('.como-panel');
      if (!panel || !panel.classList.contains('active')) return;
      const n = parseInt(stepEl.dataset.step, 10);
      if (Number.isFinite(n)) setStep(panel, n);
    });

    /* Pause only when the tab is hidden (saves cycles in the background) */
    document.addEventListener('visibilitychange', () => {
      isPaused = document.hidden;
    });

    /* Only run while in view */
    const stageObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting;
      });
    }, { threshold: 0.15 });
    stageObs.observe(stage);

    /* Initialize */
    const initialPanel = getPanel(currentPersona);
    if (initialPanel) setStep(initialPanel, 1, { animate: false });
    startTicker();
  }

  /* ── LO QUE GANAS · STAGE CON CASCADA + DETAIL PANEL ────────────
     Las ondas concéntricas del wordmark Tap In emiten en CSS loop;
     desde JS sincronizamos un pulso por orb según su anillo (ring 1
     más cercano, 3 más lejano). Hover/focus sobre una orb fija el
     panel de detalle abajo. Click en el wordmark dispara un burst. */
  const ganStage = document.getElementById('gananciasStage');

  if (ganStage) {
    const reduceMotionGan = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orbs = Array.from(ganStage.querySelectorAll('.gan-orb'));
    const core = ganStage.querySelector('.gan-core');
    const wordmark = document.getElementById('gananciasCore');
    const detailTag = document.getElementById('ganDetailTag');
    const detailBody = document.getElementById('ganDetailBody');

    /* Copy largo + tag para el panel — emparejado por data-orb */
    const detailMap = [
      { tag: 'pagos',       body: 'Todos los pagos viajan digitales: casino, transporte, eventos. Sin transferencias sueltas, sin sobres.' },
      { tag: 'backoffice',  body: 'Concesionarios y transportistas reciben su reporte armado. Adiós al cierre mensual con planillas.' },
      { tag: 'apoderados',  body: 'Cuando el hijo almuerza, sube al bus o entra a un evento, el apoderado lo sabe al instante.' },
      { tag: 'dirección',   body: 'Consumos, ingresos y proveedores en una sola pantalla, en tiempo real. Sin abrir tres sistemas.' },
      { tag: 'proveedores', body: 'Casino y transporte integrados al sistema. Para ellos no es más difícil — es más prolijo.' },
      { tag: 'contrato',    body: 'Un acuerdo cubre toda la plataforma. Sin negociar con tres proveedores tech distintos.' },
    ];
    const defaultDetail = detailMap[0];

    /* Pulso reactivo — clase .pulse durante ~600ms */
    const pulseOrb = (orb) => {
      orb.classList.add('pulse');
      window.setTimeout(() => orb.classList.remove('pulse'), 620);
    };

    /* Loop de cascada — sincronizado con la onda CSS (5.4s ciclo).
       ring 1 pulsa a t=1.0s, ring 2 a t=2.0s, ring 3 a t=3.0s.
       Se reinicia cada ciclo. */
    let cascadeInterval = null;
    let cascadeTimeouts = [];
    const startCascade = () => {
      if (reduceMotionGan) return;
      const fire = () => {
        cascadeTimeouts.forEach(clearTimeout);
        cascadeTimeouts = [];
        orbs.forEach((orb) => {
          const ring = parseInt(orb.dataset.ring || '1', 10);
          const delay = ring * 1000; // 1s / 2s / 3s
          cascadeTimeouts.push(window.setTimeout(() => pulseOrb(orb), delay));
        });
      };
      fire();
      cascadeInterval = window.setInterval(fire, 5400);
    };
    const stopCascade = () => {
      if (cascadeInterval) {
        clearInterval(cascadeInterval);
        cascadeInterval = null;
      }
      cascadeTimeouts.forEach(clearTimeout);
      cascadeTimeouts = [];
    };

    /* Detail panel update */
    const setDetail = (idx) => {
      const d = detailMap[idx] || defaultDetail;
      if (detailTag) detailTag.textContent = d.tag;
      if (detailBody) detailBody.textContent = d.body;
    };
    const setActive = (orb) => {
      orbs.forEach((o) => o.classList.toggle('is-active', o === orb));
      ganStage.classList.toggle('has-active', !!orb);
      const idx = orb ? parseInt(orb.dataset.orb || '0', 10) : 0;
      setDetail(idx);
    };

    /* Hover/focus interaction */
    orbs.forEach((orb) => {
      orb.addEventListener('mouseenter', () => setActive(orb));
      orb.addEventListener('focus', () => setActive(orb));
      orb.addEventListener('mouseleave', (e) => {
        // Si todavía hay un foco activo, no limpiar
        if (document.activeElement === orb) return;
        setActive(null);
      });
      orb.addEventListener('blur', () => {
        // limpiar solo si no hay hover activo
        if (!orb.matches(':hover')) setActive(null);
      });
    });

    /* Click en wordmark — burst + cascada inmediata */
    if (wordmark && core) {
      wordmark.addEventListener('click', () => {
        core.classList.add('is-bursting');
        window.setTimeout(() => core.classList.remove('is-bursting'), 1200);
        // Pulso inmediato encadenado de todas las orbs
        if (!reduceMotionGan) {
          orbs.forEach((orb, i) => {
            const ring = parseInt(orb.dataset.ring || '1', 10);
            const delay = ring * 220 + i * 30;
            window.setTimeout(() => pulseOrb(orb), delay);
          });
        }
      });
    }

    /* Entrance — IntersectionObserver con stagger; arranca la cascada */
    const orbObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        orbs.forEach((orb, i) => {
          const delay = reduceMotionGan ? 0 : i * 80;
          window.setTimeout(() => orb.classList.add('visible'), delay);
        });
        // Arrancar cascada un poco después de que entren
        window.setTimeout(startCascade, reduceMotionGan ? 0 : 700);
        orbObserver.unobserve(entry.target);
      });
    }, { threshold: 0.25 });

    orbObserver.observe(ganStage);

    /* Pausa la cascada cuando la stage no se ve (ahorra ciclos) */
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!cascadeInterval && !reduceMotionGan) startCascade();
        } else {
          stopCascade();
        }
      });
    }, { threshold: 0 });
    visibilityObserver.observe(ganStage);
  }

  /* ── VS TABLE TOGGLE ─────────────────────────── */
  const vsToggle = document.getElementById('vsToggle');
  const vsTable  = document.getElementById('vsTable');

  if (vsToggle && vsTable) {
    const vsLabel = vsToggle.querySelector('.vs-toggle-label');

    // Pointer-aware glow: track cursor for the radial sheen on hover
    vsToggle.addEventListener('pointermove', (e) => {
      const r = vsToggle.getBoundingClientRect();
      vsToggle.style.setProperty('--mx', `${e.clientX - r.left}px`);
      vsToggle.style.setProperty('--my', `${e.clientY - r.top}px`);
    });

    vsTable.addEventListener('animationend', (e) => {
      if (e.animationName === 'vsTableClose') {
        vsTable.classList.remove('closing');
      }
    });

    vsToggle.addEventListener('click', () => {
      const isOpen = vsTable.classList.contains('open');
      if (isOpen) {
        vsTable.classList.remove('open');
        vsTable.classList.add('closing');
      } else {
        vsTable.classList.remove('closing');
        vsTable.classList.add('open');
      }
      vsToggle.classList.toggle('open', !isOpen);
      vsToggle.setAttribute('aria-expanded', String(!isOpen));
      if (vsLabel) vsLabel.textContent = !isOpen ? 'Ocultar comparación' : 'Ver comparación';
    });
  }

  /* ── FAQ — two-column with morphing highlight ──
     UX corregido: el hover NO mueve la pill (antes movía el highlight pero
     el panel seguía mostrando la pregunta anterior, rompiendo la mental
     model). Ahora la pill marca SIEMPRE la pregunta cuyo panel está visible.
     Hover sólo cambia el color del texto y la flecha (state visual ligero).
     Click cambia tanto la pill como el panel. Navegación por teclado
     completa (↑↓ Home End) según patrón WAI-ARIA tabs. */
  const faqLayout = document.querySelector('.faq-layout');
  if (faqLayout) {
    const questions = Array.from(faqLayout.querySelectorAll('.faq-q'));
    const panels    = Array.from(faqLayout.querySelectorAll('.faq-panel'));
    const highlight = faqLayout.querySelector('.faq-highlight');
    const list      = faqLayout.querySelector('.faq-questions');
    let activeIdx   = questions.findIndex(q => q.classList.contains('is-active'));
    if (activeIdx < 0) activeIdx = 0;

    // Detecta si estamos en layout de columna apilada (mobile) — en ese caso
    // la pill se desactiva y cada question funciona como acordeón visual
    // por sí misma (CSS aplica el estilo activo directamente al .faq-q).
    const isStacked = () => window.matchMedia('(max-width: 900px)').matches;

    // Posiciona la pill bajo la pregunta activa. translate3d para promoción
    // a GPU — el deslizado se mantiene fluido incluso con el box-shadow
    // halo adjunto. En mobile la pill se oculta vía CSS.
    const moveHighlight = (target) => {
      if (!target || isStacked()) {
        highlight.style.opacity = '0';
        return;
      }
      const t = target.getBoundingClientRect();
      const p = list.getBoundingClientRect();
      highlight.style.transform = `translate3d(0, ${t.top - p.top}px, 0)`;
      highlight.style.height    = t.height + 'px';
      highlight.style.opacity   = '';
    };

    const setActive = (idx, { focus = false } = {}) => {
      if (idx === activeIdx) {
        if (focus) questions[idx].focus();
        return;
      }
      activeIdx = idx;
      questions.forEach((q, i) => {
        const active = i === idx;
        q.classList.toggle('is-active', active);
        q.setAttribute('aria-selected', active ? 'true' : 'false');
        // Roving tabindex — sólo el activo es alcanzable por Tab; el resto
        // se navega con flechas (patrón WAI-ARIA tabs).
        q.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      moveHighlight(questions[idx]);
      // Re-disparar la animación shine (sólo en click/keyboard, NO en hover).
      highlight.classList.remove('is-moving');
      void highlight.offsetWidth; // reflow — anima limpio
      highlight.classList.add('is-moving');
      if (focus) questions[idx].focus();
    };

    questions.forEach((q, idx) => {
      q.addEventListener('click', () => setActive(idx));
      // Navegación por teclado — patrón WAI-ARIA tabs vertical
      q.addEventListener('keydown', (e) => {
        let nextIdx = null;
        switch (e.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            nextIdx = (idx + 1) % questions.length;
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            nextIdx = (idx - 1 + questions.length) % questions.length;
            break;
          case 'Home':
            nextIdx = 0;
            break;
          case 'End':
            nextIdx = questions.length - 1;
            break;
          default:
            return;
        }
        e.preventDefault();
        setActive(nextIdx, { focus: true });
      });
    });

    // Posición inicial — esperá un frame a que termine el layout y luego
    // mostrá la pill (evita un salto desde 0,0).
    requestAnimationFrame(() => {
      moveHighlight(questions[activeIdx]);
      requestAnimationFrame(() => highlight.classList.add('is-ready'));
    });

    // Re-medir en resize. Si pasamos a stacked, la pill se oculta sola.
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => moveHighlight(questions[activeIdx]), 80);
    });
  }

  /* ── CUSTOM SELECT (Cargo dropdown) ──────────── */
  document.querySelectorAll('.custom-select').forEach(cs => {
    const trigger    = cs.querySelector('.custom-select-trigger');
    const valueEl    = cs.querySelector('.custom-select-value');
    const list       = cs.querySelector('.custom-select-options');
    const options    = Array.from(cs.querySelectorAll('.custom-select-option'));
    const hidden     = cs.querySelector('input[type="hidden"]');
    const placeholder = cs.dataset.placeholder || valueEl.textContent;
    let activeIndex  = -1;

    const setActive = (i) => {
      activeIndex = i;
      options.forEach((o, idx) => o.classList.toggle('is-active', idx === i));
      if (i >= 0) options[i].scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      cs.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      const sel = options.findIndex(o => o.classList.contains('is-selected'));
      setActive(sel >= 0 ? sel : 0);
    };

    const close = () => {
      cs.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      setActive(-1);
    };

    const select = (opt) => {
      const value = opt.dataset.value;
      hidden.value = value;
      valueEl.textContent = value;
      trigger.classList.add('has-value');
      cs.classList.remove('has-error');
      options.forEach(o => o.classList.remove('is-selected'));
      opt.classList.add('is-selected');
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      trigger.focus();
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      cs.classList.contains('is-open') ? close() : open();
    });

    options.forEach((opt, idx) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        select(opt);
      });
      opt.addEventListener('mouseenter', () => setActive(idx));
    });

    trigger.addEventListener('keydown', (e) => {
      const isOpen = cs.classList.contains('is-open');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) { open(); return; }
        setActive((activeIndex + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) { open(); return; }
        setActive((activeIndex - 1 + options.length) % options.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (isOpen && activeIndex >= 0) {
          e.preventDefault();
          select(options[activeIndex]);
        } else if (!isOpen) {
          e.preventDefault();
          open();
        }
      } else if (e.key === 'Escape') {
        if (isOpen) { e.preventDefault(); close(); }
      } else if (e.key === 'Tab') {
        if (isOpen) close();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (cs.classList.contains('is-open') && !cs.contains(e.target)) close();
    });

    // Reset method exposed for the form-success → reset flow
    cs._reset = () => {
      hidden.value = '';
      valueEl.textContent = placeholder;
      trigger.classList.remove('has-value');
      cs.classList.remove('has-error', 'is-open');
      options.forEach(o => o.classList.remove('is-selected', 'is-active'));
    };
  });

  /* ── FORM SUBMIT (FormSubmit AJAX) ───────────── */
  const demoForm    = document.getElementById('demoForm');
  const formSuccess = document.getElementById('formSuccess');
  const formError   = document.getElementById('formError');
  const cargoSelect = document.getElementById('cargoSelect');

  if (demoForm && formSuccess) {
    demoForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = demoForm.querySelector('.btn-submit');

      // Native validation for inputs (we declared novalidate on the form)
      let firstInvalid = null;
      demoForm.querySelectorAll('input[required]').forEach(input => {
        if (input.type === 'hidden') return;
        if (!input.checkValidity()) {
          if (!firstInvalid) firstInvalid = input;
        }
      });

      // Custom validation for the Cargo dropdown
      const cargoHidden = document.getElementById('cargo');
      if (!cargoHidden.value) {
        cargoSelect && cargoSelect.classList.add('has-error');
        if (!firstInvalid) firstInvalid = cargoSelect.querySelector('.custom-select-trigger');
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (formError) formError.classList.remove('visible');
      btn.classList.add('is-loading');
      btn.disabled = true;

      try {
        const response = await fetch(demoForm.action, {
          method: 'POST',
          body: new FormData(demoForm),
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Request failed: ' + response.status);

        // FormSubmit returns HTTP 200 even when delivery fails (e.g. form not
        // activated, blacklisted, quota hit). The JSON body has success:"true"
        // only when the email was actually sent.
        const data = await response.json();
        if (String(data.success).toLowerCase() !== 'true') {
          throw new Error('FormSubmit rejected: ' + (data.message || 'unknown'));
        }

        demoForm.style.display = 'none';
        formSuccess.classList.add('visible');
      } catch (err) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        if (formError) formError.classList.add('visible');
        console.error('Form submission failed:', err);
      }
    });

    // Clear cargo error as soon as user picks a value
    const cargoHidden = document.getElementById('cargo');
    if (cargoHidden) {
      cargoHidden.addEventListener('change', () => {
        cargoSelect && cargoSelect.classList.remove('has-error');
      });
    }
  }

  /* ── PROBLEMA SECTION ANIMATIONS ─────────────── */
  const problemaSection = document.querySelector('.section-problema');
  if (problemaSection) {
    const problemaEls = problemaSection.querySelectorAll(
      '.section-kicker, .problema-title, .problema-sub, .problema-card'
    );

    let problemaFired = false;
    const fireProblema = () => {
      if (problemaFired) return;
      problemaFired = true;
      problemaEls.forEach(el => el.classList.add('anim-in'));
      setTimeout(() => {
        const card = problemaSection.querySelector('.problema-card');
        if (card) card.classList.add('anim-done');
      }, 1900);
    };

    const problemaObs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        fireProblema();
        problemaObs.disconnect();
      }
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    problemaObs.observe(problemaSection);

    const checkProblemaVisible = () => {
      if (problemaFired) return;
      const r = problemaSection.getBoundingClientRect();
      if (r.top < innerHeight + 200 && r.bottom > -200) {
        fireProblema();
      }
    };
    window.addEventListener('scroll', checkProblemaVisible, { passive: true });
    window.addEventListener('hashchange', () => requestAnimationFrame(checkProblemaVisible));
    document.querySelectorAll('a[href^="#"]').forEach(a =>
      a.addEventListener('click', () => setTimeout(checkProblemaVisible, 400))
    );
    setTimeout(checkProblemaVisible, 200);
    setTimeout(checkProblemaVisible, 800);
    setTimeout(checkProblemaVisible, 1600);
    // Hard fallback — fire unconditionally after 3 seconds.
    setTimeout(fireProblema, 3000);
  }

  /* ── PRODUCTOS SECTION ANIMATIONS ────────────── */
  const productosSection = document.querySelector('.section-productos');
  if (productosSection) {
    const headerEls = productosSection.querySelectorAll('.section-kicker, .section-title');
    const pills     = productosSection.querySelectorAll('.pill');

    headerEls.forEach(el => el.classList.add('prod-hidden'));
    pills.forEach(el => el.classList.add('prod-hidden'));

    // Single source of truth for "fire entrance" — guarded so it can
    // never run twice no matter how many code paths trigger it. */
    let prodFired = false;
    const fireProd = () => {
      if (prodFired) return;
      prodFired = true;
      headerEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('prod-in'), i * 120);
      });
      const pillDelays = [300, 480, 640];
      pills.forEach((el, i) => {
        setTimeout(() => el.classList.add('prod-in'), pillDelays[i] || 300 + i * 180);
      });
    };

    const prodObs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        fireProd();
        prodObs.disconnect();
      }
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    prodObs.observe(productosSection);

    const checkProdVisible = () => {
      if (prodFired) return;
      const r = productosSection.getBoundingClientRect();
      if (r.top < innerHeight + 200 && r.bottom > -200) {
        fireProd();
      }
    };
    window.addEventListener('scroll', checkProdVisible, { passive: true });
    window.addEventListener('hashchange', () => requestAnimationFrame(checkProdVisible));
    document.querySelectorAll('a[href^="#"]').forEach(a =>
      a.addEventListener('click', () => setTimeout(checkProdVisible, 400))
    );
    setTimeout(checkProdVisible, 200);
    setTimeout(checkProdVisible, 800);
    setTimeout(checkProdVisible, 1600);
    // Hard fallback — fire unconditionally after 3 seconds, no matter
    // what the user did with their navigation. The animation may not
    // play, but the content is GUARANTEED visible within 3s of load. */
    setTimeout(fireProd, 3000);
  }

  /* ── CARD/SHOWCASE MOUSE-FOLLOW SPOTLIGHT ────── */
  document.querySelectorAll('[data-tilt]').forEach(card => {
    const spotlight = card.querySelector('.card-spotlight');
    if (!spotlight) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlight.style.background = `radial-gradient(650px circle at ${x}px ${y}px, rgba(107,92,231,.07), transparent 40%)`;
    });

    card.addEventListener('mouseleave', () => {
      spotlight.style.background = 'none';
    });
  });

  /* ── STATS LIVE BOARD — count-up + estaciones interactivas ───
     Anima los dígitos de cada estación al entrar en viewport. Auto-cycle
     entre estaciones cada 6s (pausable: el cycle se detiene al primer click
     manual del usuario, asumiendo que ya lo está manejando). */
  const statsBoard = document.querySelector('.stats-board');
  if (statsBoard) {
    const stations = Array.from(statsBoard.querySelectorAll('.sb-stat'));
    let activeIdx  = stations.findIndex(s => s.classList.contains('is-active'));
    if (activeIdx < 0) activeIdx = 0;
    let userInteracted = false;
    let cycleTimer;

    const setActiveStation = (idx) => {
      if (idx === activeIdx) return;
      activeIdx = idx;
      stations.forEach((s, i) => {
        const active = i === idx;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-selected', active ? 'true' : 'false');
        s.setAttribute('tabindex', active ? '0' : '-1');
      });
    };

    const startCycle = () => {
      if (userInteracted) return;
      clearInterval(cycleTimer);
      cycleTimer = setInterval(() => {
        if (userInteracted) { clearInterval(cycleTimer); return; }
        setActiveStation((activeIdx + 1) % stations.length);
      }, 6000);
    };

    stations.forEach((s, i) => {
      s.addEventListener('click', () => {
        userInteracted = true;
        clearInterval(cycleTimer);
        setActiveStation(i);
      });
      s.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % stations.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + stations.length) % stations.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End')  next = stations.length - 1;
        if (next === null) return;
        e.preventDefault();
        userInteracted = true;
        clearInterval(cycleTimer);
        setActiveStation(next);
        stations[next].focus();
      });
    });

    // Empezar el cycle cuando la board entra en viewport (no antes — para
    // que el usuario vea el efecto activo en la 1ra estación al llegar)
    const cycleObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          startCycle();
        } else {
          clearInterval(cycleTimer);
        }
      });
    }, { threshold: 0.4 });
    cycleObs.observe(statsBoard);
  }

  /* Count-up animation — apunta a [data-stat-order] dentro de stats-board
     (o cualquier ancestro). Anima .stat-num-value sin destruir el sufijo. */
  const colegiosStats = document.querySelectorAll('.stats-board [data-stat-order]');
  if (colegiosStats.length) {
    const reduceMotionStat = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateStat = (numEl) => {
      const target   = parseFloat(numEl.dataset.countTo);
      if (!Number.isFinite(target)) return;
      const decimals = parseInt(numEl.dataset.countDecimals || '0', 10);
      // Animar sólo .stat-num-value para no destruir hermanos como
      // .sb-num-prefix ("≤") o .stat-num-suffix ("días").
      const valueEl  = numEl.querySelector('.stat-num-value') || numEl;
      const format   = (n) => n.toFixed(decimals);
      if (reduceMotionStat) { valueEl.textContent = format(target); return; }
      const duration = 1300;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        valueEl.textContent = format(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      valueEl.textContent = format(0);
      requestAnimationFrame(tick);
    };

    const statObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const order = parseInt(card.dataset.statOrder || '0', 10);
        const delay = reduceMotionStat ? 0 : order * 110;
        setTimeout(() => {
          card.classList.add('stat-revealed');
          const num = card.querySelector('[data-count-to]');
          if (num) animateStat(num);
        }, delay);
        statObs.unobserve(card);
      });
    }, { threshold: 0.3 });

    colegiosStats.forEach((s) => statObs.observe(s));
  }

  /* ── PARTNERS MARQUEE — RAF-driven loop con velocidad variable ──
     Reemplaza la animación CSS para evitar el "jump" que ocurría al
     cambiar `animation-duration` en hover (el browser reinterpreta el
     progreso de la animación basándose en la nueva duración, lo que
     causa un salto visual). Acá controlamos la posición manualmente y
     simplemente cambiamos la velocidad — sin reset de progreso. */
  const partnersMarquee = document.querySelector('.partners-marquee');
  const partnersTrack   = partnersMarquee && partnersMarquee.querySelector('.partners-track');
  if (partnersMarquee && partnersTrack) {
    const reduceMotionPM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotionPM) {
      // Velocidades en pixels por segundo. La transición entre normal y
      // slow se interpola suavemente con un easing exponencial.
      const SPEED_NORMAL = 60;
      const SPEED_SLOW   = 18;
      let speed       = SPEED_NORMAL;
      let targetSpeed = SPEED_NORMAL;
      let posX        = 0;
      let lastTime    = performance.now();
      let halfWidth   = 0;
      let paused      = false;

      const measure = () => {
        // El track contiene 2 copias seamless. Width total / 2 = ciclo.
        halfWidth = partnersTrack.scrollWidth / 2;
      };
      measure();
      // Re-medir si las imágenes cargan tarde (no afecta la posición)
      window.addEventListener('load', measure, { once: true });
      window.addEventListener('resize', measure);

      const tick = (now) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        // Easing suave hacia targetSpeed para evitar cambios bruscos.
        speed += (targetSpeed - speed) * Math.min(1, dt * 4);
        if (!paused) {
          posX -= speed * dt;
          // Loop: cuando recorrimos halfWidth, reseteamos a 0 manteniendo
          // continuidad visual (la 2da copia ocupa exactamente el lugar de
          // la 1ra al cerrar el ciclo).
          if (-posX >= halfWidth) posX += halfWidth;
          partnersTrack.style.transform = `translate3d(${posX}px, 0, 0)`;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      partnersMarquee.addEventListener('mouseenter', () => { targetSpeed = SPEED_SLOW; });
      partnersMarquee.addEventListener('mouseleave', () => { targetSpeed = SPEED_NORMAL; });

      // Pausar cuando la sección está fuera de viewport — ahorra CPU.
      // IMPORTANTE: paused arranca en false (definido arriba) — el IO sólo
      // PAUSA explícitamente cuando hay confirmación de off-screen, jamás
      // bloquea el inicio del loop si el observer tarda en disparar.
      if ('IntersectionObserver' in window) {
        const visObs = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            // Sólo pausar si el observer confirma off-screen con threshold
            // suficiente. Reset lastTime al despausar para evitar saltos
            // por delta-time acumulado.
            if (e.isIntersecting) {
              if (paused) { lastTime = performance.now(); }
              paused = false;
            } else {
              paused = true;
            }
          });
        }, { threshold: 0 });
        visObs.observe(partnersMarquee);
      }
    }
  }

  /* ── MOMENTS — click para expandir descripción extendida ───
     Cada .moment tiene un botón .moment-toggle que abre/cierra el panel
     .moment-extra interno. Soporte teclado: Enter/Space en el botón. Sólo
     una card abierta a la vez para no fragmentar la atención. */
  const moments = document.querySelectorAll('.moment[data-moment]');
  if (moments.length) {
    moments.forEach((mom) => {
      const toggle = mom.querySelector('.moment-toggle');
      const label  = mom.querySelector('.moment-toggle-text');
      if (!toggle) return;
      toggle.addEventListener('click', () => {
        const wasOpen = mom.classList.contains('is-open');
        // Cerrar todos los demás antes de abrir éste — evita visual ruidoso
        moments.forEach(m => {
          if (m !== mom) {
            m.classList.remove('is-open');
            const t = m.querySelector('.moment-toggle');
            const l = m.querySelector('.moment-toggle-text');
            if (t) t.setAttribute('aria-expanded', 'false');
            if (l) l.textContent = l.dataset.textOpen || 'Ver más';
          }
        });
        mom.classList.toggle('is-open', !wasOpen);
        toggle.setAttribute('aria-expanded', String(!wasOpen));
        if (label) {
          label.textContent = !wasOpen
            ? (label.dataset.textClose || 'Cerrar')
            : (label.dataset.textOpen  || 'Ver más');
        }
      });
    });
    // Click fuera de cualquier moment cierra el abierto
    document.addEventListener('click', (e) => {
      if (e.target.closest('.moment')) return;
      moments.forEach(m => {
        if (!m.classList.contains('is-open')) return;
        m.classList.remove('is-open');
        const t = m.querySelector('.moment-toggle');
        const l = m.querySelector('.moment-toggle-text');
        if (t) t.setAttribute('aria-expanded', 'false');
        if (l) l.textContent = l.dataset.textOpen || 'Ver más';
      });
    });
    // Esc cierra el abierto
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      moments.forEach(m => {
        if (!m.classList.contains('is-open')) return;
        m.classList.remove('is-open');
        const t = m.querySelector('.moment-toggle');
        const l = m.querySelector('.moment-toggle-text');
        if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); }
        if (l) l.textContent = l.dataset.textOpen || 'Ver más';
      });
    });
  }

  /* ── TESTIMONIO CARRUSEL — flechas + dots ─────────
     Track horizontal con N tarjetas, 2 visibles por viewport en desktop.
     Las flechas avanzan/retroceden por 1 tarjeta; los dots saltan a un
     índice específico. Disabled state en flechas cuando se llega al borde.
     No hay auto-rotate — el usuario controla el ritmo. */
  const testiCarousel = document.querySelector('.testi-carousel');
  if (testiCarousel) {
    const track  = testiCarousel.querySelector('.testi-track');
    const cards  = testiCarousel.querySelectorAll('.testi-card');
    const dots   = testiCarousel.querySelectorAll('.testi-dot');
    const prevBtn = testiCarousel.querySelector('.testi-arrow--prev');
    const nextBtn = testiCarousel.querySelector('.testi-arrow--next');

    // visibleCount depende del breakpoint — recomputado en resize
    const getVisibleCount = () => (window.innerWidth <= 900 ? 1 : 2);

    let activeIdx = 0;

    const maxIdx = () => Math.max(0, cards.length - getVisibleCount());

    const update = () => {
      activeIdx = Math.min(activeIdx, maxIdx());
      const visible = getVisibleCount();
      const cardWidth = cards[0].getBoundingClientRect().width;
      const gap = 22;
      const offset = activeIdx * (cardWidth + gap);
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;

      dots.forEach((d, i) => {
        const isActive = i === activeIdx;
        d.classList.toggle('is-active', isActive);
        d.setAttribute('aria-selected', String(isActive));
      });

      if (prevBtn) prevBtn.classList.toggle('is-disabled', activeIdx === 0);
      if (nextBtn) nextBtn.classList.toggle('is-disabled', activeIdx >= maxIdx());
    };

    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (activeIdx > 0) { activeIdx -= 1; update(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (activeIdx < maxIdx()) { activeIdx += 1; update(); }
    });
    dots.forEach((d, i) => {
      d.addEventListener('click', () => { activeIdx = i; update(); });
    });

    // Keep dots count synced with possible navigable positions: if there
    // are 4 cards and 2 visible, navigable indices are 0..2 (3 stops). The
    // 4th dot would target an index past maxIdx, so it gets clamped. The
    // current HTML ships a dot per card; that's acceptable — clicking a
    // late dot just clamps to the last valid scroll position.

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 80);
    });

    update();
  }

  /* ── SCROLL ANIMATIONS (IntersectionObserver) ──
     Reveal `.fade-up` elements as they enter the viewport. Uses an
     IO + scroll-listener fallback so rapid anchor-link navigation
     (which can outrun the IO threshold check) never leaves an
     element stuck in its hidden state. */
  /* Entrance reveal — selectores universales. Cualquier .section-header,
     .pill, .como-stage, .ganancias-scene/.gan-detail, .moment, .stats-board,
     .testi-carousel, .faq-layout, .contacto-inner, .vs-table-wrap entrará
     con un fade-up al aparecer en viewport. Compositor-only (transform +
     opacity) — sin layout thrashing. */
  const fadeEls = document.querySelectorAll([
    '.section-header',
    '.pill',
    '.como-stage',
    '.ganancias-scene',
    '.gan-detail',
    '.moment',
    '.stats-board',
    '.testi-carousel',
    '.faq-layout',
    '.contacto-inner',
    '.vs-toggle-row',
    '.partners'
  ].join(','));

  fadeEls.forEach(el => el.classList.add('fade-up'));

  const reveal = (el) => {
    if (el.classList.contains('visible')) return;
    el.classList.add('visible');
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });

  fadeEls.forEach(el => observer.observe(el));

  /* Fallback estricto — solo revela elementos que YA están dentro del
     viewport real (no buffer artificial). Evita revelar de golpe todo
     el contenido off-screen al cargar. Corre después de 600ms y luego
     en hashchange / nav-click para cubrir casos de hash navigation. */
  const checkFadeVisible = () => {
    fadeEls.forEach(el => {
      if (el.classList.contains('visible')) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        reveal(el);
        observer.unobserve(el);
      }
    });
  };
  window.addEventListener('hashchange', () => requestAnimationFrame(checkFadeVisible));
  document.querySelectorAll('a[href^="#"]').forEach(a =>
    a.addEventListener('click', () => setTimeout(checkFadeVisible, 600))
  );
  setTimeout(checkFadeVisible, 600);

  /* ── SMOOTH SCROLL FOR ANCHOR LINKS ───────────
     Sections can tune landing via `scroll-margin-top` in CSS.
     Sections marked with `data-scroll="center"` are centered
     vertically in the viewport instead. */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      // Bare "#" or empty hash → no scroll target; let browser handle (or no-op)
      if (!href || href === '#') return;
      let target = null;
      try { target = document.querySelector(href); } catch (_) { /* invalid selector */ }
      if (!target) return;
      e.preventDefault();

      // Use getBoundingClientRect (visual position) instead of offsetTop chains:
      // some layout configurations (overflow:hidden wrappers, animated pseudos,
      // browser layout quirks) cause offsetTop to disagree with the rendered
      // position, which lands the scroll wrong. Visual-rect math always matches
      // what the user actually sees.
      const visualTop = (el) => el.getBoundingClientRect().top + window.scrollY;
      const visualBottom = (el) => el.getBoundingClientRect().bottom + window.scrollY;

      const navEl = document.querySelector('.navbar');
      const navBottom = navEl ? navEl.getBoundingClientRect().bottom : 80;
      const vh = window.innerHeight;

      let desiredTop;

      if (target.dataset.scroll === 'center') {
        // Center the section's *content* (header → final element) inside the
        // visible area below the fixed navbar.
        const first = target.querySelector('.section-header') || target;
        // querySelector returns first match in DOM order, so list selectors
        // separately to honour priority (.vs-note sits *after* the pills).
        const last  = target.querySelector('.vs-table.open')
                   || target.querySelector('.vs-note')
                   || target.querySelector('.product-pills')
                   || target.querySelector('.como-nota')
                   || target.querySelector('.diferenciador')
                   /* Colegios usa testi-carousel como primer bloque de
                      contenido — centrar header + carrusel deja el
                      contenido principal en el centro del viewport. */
                   || target.querySelector('.testi-carousel')
                   || first;
        const contentTop    = visualTop(first);
        const contentBottom = visualBottom(last);
        const contentMid    = (contentTop + contentBottom) / 2;

        const visibleMid = navBottom + (vh - navBottom) / 2;
        desiredTop = contentMid - visibleMid;

        // Safety clamps so kicker AND last element stay visible even if the
        // section is taller than the visible area.
        const safeTopGap = 24;
        const safeBottomGap = 24;
        const maxTop = contentTop - navBottom - safeTopGap;        // largest scroll that still shows kicker
        const minTop = contentBottom - vh + safeBottomGap;          // smallest scroll that still shows last element

        if (maxTop >= minTop) {
          desiredTop = Math.min(maxTop, Math.max(minTop, desiredTop));
        } else {
          // Content taller than viewport — prioritise top so kicker is visible
          desiredTop = maxTop;
        }
      } else {
        // Simple branch — align section top with bottom of fixed navbar,
        // honouring the section's CSS scroll-margin-top if larger.
        const cs = getComputedStyle(target);
        const scrollMarginTop = parseFloat(cs.scrollMarginTop) || 0;
        const offset = Math.max(navBottom, scrollMarginTop);
        desiredTop = visualTop(target) - offset;
      }

      desiredTop = Math.max(0, desiredTop);

      /* Pausa todas las animaciones CSS durante el scroll para mantener
         60fps. Re-activa cuando el scroll termina (detectado por
         scrollend o un timeout de seguridad). */
      document.body.classList.add('is-scrolling');
      clearTimeout(window.__navScrollEndTimer);
      const distance = Math.abs(window.scrollY - desiredTop);
      // Estimación: ~600ms para distancias chicas, hasta ~1200ms para grandes
      const fallbackMs = Math.min(1300, 500 + distance * 0.35);
      window.__navScrollEndTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
      }, fallbackMs);

      window.scrollTo({ top: desiredTop, behavior: 'smooth' });
    });
  });

  /* Native scrollend (Chromium 114+, Safari 17+) — limpia el flag antes
     que el timeout fallback si está soportado. */
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', () => {
      if (document.body.classList.contains('is-scrolling')) {
        document.body.classList.remove('is-scrolling');
        clearTimeout(window.__navScrollEndTimer);
      }
    }, { passive: true });
  }

  /* ── HERO STACK ENTRY ANIMATION ──────────────── */
  const heroStack = document.querySelector('.hero-stack');

  if (heroStack) {
    // Delay the stack animation to sync with the page load sequence
    const triggerStack = () => {
      setTimeout(() => {
        heroStack.classList.add('animate-in');
      }, 1000); // synced with slower hero content stagger
    };

    const stackObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          triggerStack();
          stackObserver.unobserve(entry.target);

          // Start subtle float animations after entry completes
          setTimeout(() => {
            const layerMid   = heroStack.querySelector('.stack-layer--mid');
            const layerFront = heroStack.querySelector('.stack-layer--front');
            let tick = 0;

            const float = () => {
              tick += 0.008;
              if (layerMid)   layerMid.style.transform   = `translateY(${Math.sin(tick) * 5}px)`;
              if (layerFront) layerFront.style.transform  = `translateY(${Math.sin(tick + 1.2) * 7}px)`;
              requestAnimationFrame(float);
            };
            float();
          }, 2000);
        }
      });
    }, { threshold: 0.15 });

    stackObserver.observe(heroStack);
  }

  /* ── ACTIVE NAV LINK ON SCROLL ───────────────── */
  const navLinksAll = document.querySelectorAll('.nav-links a');

  // mapa de secciones → id del nav link que les corresponde
  // secciones sin link propio heredan del grupo más cercano
  const sectionNavMap = {
    'inicio':      null,
    'problema':    null,
    'productos':   'productos',
    'como-funciona': 'como-funciona',
    'beneficios':  'como-funciona',
    'colegios':    'colegios',
    'objeciones':  'colegios',
    'contacto':    null,
  };

  const setActiveLink = () => {
    const allSections = document.querySelectorAll('section[id]');
    const navbarOffset = window.innerHeight / 2;
    let activeNavId = null;

    // recorre de abajo hacia arriba y encuentra la primera sección
    // cuyo top ya pasó el navbar
    const arr = Array.from(allSections).reverse();
    for (const section of arr) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= navbarOffset) {
        const id = section.getAttribute('id');
        activeNavId = sectionNavMap[id] ?? null;
        break;
      }
    }

    navLinksAll.forEach(a => {
      const href = a.getAttribute('href').replace('#', '');
      if (href === activeNavId) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  };

  window.addEventListener('scroll', setActiveLink, { passive: true });
  setActiveLink();

});