/* ==========================================================================
   Maison Bonjour — theme.js
   Fonctions :
     1. Intro overlay (cookie mb_intro, 7 jours)
     2. Menu mobile open/close
     3. Header scroll → .is-scrolled
     4. Reveal IntersectionObserver
     5. Stagger groups (frise 12 régions)
     6. Countdown jours restants avant le 15 du mois
   ========================================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------
  // Cookies
  // ---------------------------------------------------------------------
  const Cookies = {
    get(name) {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    },
    set(name, value, days) {
      const maxAge = days * 86400;
      document.cookie = name + '=' + encodeURIComponent(value)
        + '; max-age=' + maxAge
        + '; path=/; SameSite=Lax';
    }
  };

  // ---------------------------------------------------------------------
  // 1. Intro overlay
  // ---------------------------------------------------------------------
  function initIntro() {
    const intro = document.querySelector('[data-mb-intro]');
    if (!intro) return;

    // Cookie déjà posé → cacher immédiatement (peut être doublé par le
    // sniff inline en <head>, sans effet).
    if (Cookies.get('mb_intro')) {
      intro.classList.add('is-skipped');
      return;
    }

    const readyDuration = prefersReducedMotion ? 200 : 700;
    const holdDuration  = prefersReducedMotion ? 200 : 1100;
    const leaveDuration = prefersReducedMotion ? 300 : 1300;

    // Affiche le logo (transition CSS).
    requestAnimationFrame(() => intro.classList.add('is-ready'));

    // Lance la sortie après ready + hold, puis cache et pose le cookie.
    setTimeout(() => {
      intro.classList.add('is-leaving');
      setTimeout(() => {
        intro.classList.add('is-skipped');
        Cookies.set('mb_intro', '1', 7);
      }, leaveDuration);
    }, readyDuration + holdDuration);
  }

  // ---------------------------------------------------------------------
  // 2. Mobile menu
  // ---------------------------------------------------------------------
  function initMobileMenu() {
    const toggle = document.querySelector('[data-mb-menu-toggle]');
    const close  = document.querySelector('[data-mb-menu-close]');
    const panel  = document.querySelector('[data-mb-mobile-nav]');
    if (!toggle || !panel) return;

    function openMenu() {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      document.dispatchEvent(new CustomEvent('mb:menu-open'));
    }

    function closeMenu() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      document.dispatchEvent(new CustomEvent('mb:menu-close'));
    }

    toggle.addEventListener('click', () => {
      if (panel.classList.contains('is-open')) closeMenu();
      else openMenu();
    });

    if (close) close.addEventListener('click', closeMenu);

    panel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) closeMenu();
    });
  }

  // ---------------------------------------------------------------------
  // 3. Header scroll state
  // ---------------------------------------------------------------------
  function initHeaderScroll() {
    const header = document.querySelector('[data-mb-header]');
    if (!header) return;

    let ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 50);
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  // ---------------------------------------------------------------------
  // 4. Reveal — IntersectionObserver
  // ---------------------------------------------------------------------
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.classList.add('is-visible'));
        });
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    items.forEach(el => io.observe(el));

    // Filet de sécurité : si après 1,5 s un élément en viewport n'a toujours
    // pas reçu .is-visible (IO bug sur certaines compositions), on force.
    setTimeout(() => {
      items.forEach(el => {
        if (el.classList.contains('is-visible')) return;
        const rect = el.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (inView) el.classList.add('is-visible');
      });
    }, 1500);
  }

  // ---------------------------------------------------------------------
  // 5. Stagger groups (frise 12 régions, etc.)
  //    <div data-stagger-group data-stagger-step="80">
  //      <div data-stagger-item>...</div>
  //      ...
  //    </div>
  // ---------------------------------------------------------------------
  function initStagger() {
    const groups = document.querySelectorAll('[data-stagger-group]');
    if (!groups.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      groups.forEach(group => {
        group.querySelectorAll('[data-stagger-item]').forEach(item => {
          item.classList.add('is-visible');
        });
      });
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const items = entry.target.querySelectorAll('[data-stagger-item]');
        const step  = parseInt(entry.target.dataset.staggerStep || '120', 10);
        items.forEach((item, i) => {
          setTimeout(() => item.classList.add('is-visible'), i * step);
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    groups.forEach(group => io.observe(group));
  }

  // ---------------------------------------------------------------------
  // 6. Countdown — jours restants avant le 15 du mois
  // ---------------------------------------------------------------------
  function initCountdown() {
    const el = document.querySelector('#days-remaining');
    if (!el) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // Cible : 15 du mois courant si on est avant ou le 15, sinon 15 du mois suivant.
    const target = (day <= 15)
      ? new Date(year, month, 15)
      : new Date(year, month + 1, 15);

    const today = new Date(year, month, day);
    const diff  = Math.max(0, Math.ceil((target - today) / 86400000));

    el.textContent = diff;
  }

  // ---------------------------------------------------------------------
  // 7. Lenis smooth scroll — desktop only, respecte reduced-motion
  // ---------------------------------------------------------------------
  function initLenis() {
    if (prefersReducedMotion) return;
    if (typeof window.Lenis === 'undefined') return;
    // Skip on touch devices (let native momentum scroll)
    if (window.matchMedia('(hover: none)').matches) return;

    // lerp-based interpolation : frame-rate indépendant et bien plus
    // réactif que `duration`. ~0.12 = snappy mais lissé.
    // wheelMultiplier 1.4 donne plus de distance par tick (sensation directe).
    const lenis = new window.Lenis({
      lerp: 0.12,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.4,
      touchMultiplier: 1.5
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Exposé pour d'autres modules (region-explorer notamment) — scroll
    // synchronisé avec l'inertie globale au lieu d'un window.scrollTo concurrent.
    window.__mbLenis = lenis;

    // Stop Lenis quand le menu mobile est ouvert
    document.addEventListener('mb:menu-open', () => lenis.stop());
    document.addEventListener('mb:menu-close', () => lenis.start());
  }

  // ---------------------------------------------------------------------
  // 8. Image reveal — clip-path cinematic
  // ---------------------------------------------------------------------
  function initImageReveal() {
    const items = document.querySelectorAll('.img-reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    // Threshold abaissé à 0.05 : pour les images plus hautes que le viewport
    // ou contraintes par la grille, 0.2 (20%) pouvait ne jamais être atteint
    // sur certaines tailles d'écran → image clip-pathée à jamais.
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Une seule rAF suffit : on garantit un paint entre observe() et
        // l'ajout de la classe pour amorcer la transition. Le double-rAF
        // précédent décalait l'ajout sur certains éléments déjà observés
        // au moment de la création de l'IO.
        requestAnimationFrame(() => el.classList.add('is-visible'));
        io.unobserve(el);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

    items.forEach(el => io.observe(el));

    // Filet de sécurité : si après 1,2 s un élément n'a toujours pas reçu
    // `.is-visible` alors qu'il occupe le viewport (image cachée par bug
    // d'IO sur certaines compositions de grille), on force la révélation.
    setTimeout(() => {
      items.forEach(el => {
        if (el.classList.contains('is-visible')) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const inView = rect.bottom > 0 && rect.top < vh;
        if (inView) el.classList.add('is-visible');
      });
    }, 1200);
  }

  // ---------------------------------------------------------------------
  // 9. Count-up — anime un chiffre de 0 à valeur cible
  // ---------------------------------------------------------------------
  function initCountUp() {
    const items = document.querySelectorAll('[data-count-up]');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

    function animate(el, num, suffix, prefix) {
      const duration = 2400;
      const start = performance.now();
      const ease = t => 1 - Math.pow(1 - t, 5);

      function frame(now) {
        const p = Math.min(1, (now - start) / duration);
        const v = num * ease(p);
        const display = Number.isInteger(num) ? Math.round(v) : v.toFixed(1);
        el.textContent = prefix + display + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    // Pre-parse + reset to "0..." pour figer la largeur initiale
    const parsed = [];
    items.forEach(el => {
      const original = el.textContent.trim();
      const m = original.match(/^([^0-9]*)(\d+(?:\.\d+)?)(.*)$/);
      if (!m) { parsed.push(null); return; }
      const prefix = m[1];
      const num = parseFloat(m[2]);
      const suffix = m[3];
      parsed.push({ num, suffix, prefix });
      el.textContent = prefix + '0' + suffix;
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const idx = Array.prototype.indexOf.call(items, entry.target);
        const data = parsed[idx];
        if (data) animate(entry.target, data.num, data.suffix, data.prefix);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    items.forEach(el => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // 10. Magnetic — boutons attirent légèrement le curseur (desktop only)
  // ---------------------------------------------------------------------
  function initMagnetic() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const items = document.querySelectorAll('.btn--magnetic');
    if (!items.length) return;

    const strength = 0.45;
    const maxOffset = 24;

    items.forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const tx = Math.max(-maxOffset, Math.min(maxOffset, x * strength));
        const ty = Math.max(-maxOffset, Math.min(maxOffset, y * strength));
        el.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ---------------------------------------------------------------------
  // 11. Split words — révélation mot par mot avec stagger spring
  // ---------------------------------------------------------------------
  function initSplitWords() {
    const items = document.querySelectorAll('[data-split-words]');
    if (!items.length) return;

    items.forEach(el => {
      // Évite double-split si re-init (cache miss, etc.)
      if (el.dataset.splitDone === '1') return;

      const raw = el.textContent;
      const tokens = raw.split(/(\s+)/);
      el.textContent = '';
      tokens.forEach(tok => {
        if (tok === '') return;
        if (/^\s+$/.test(tok)) {
          el.appendChild(document.createTextNode(tok));
        } else {
          const wrap = document.createElement('span');
          wrap.className = 'split-word-wrap';
          const word = document.createElement('span');
          word.className = 'split-word';
          word.textContent = tok;
          wrap.appendChild(word);
          el.appendChild(wrap);
        }
      });
      el.dataset.splitDone = '1';
    });

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.split-word').forEach(w => w.classList.add('is-visible'));
      return;
    }

    const step = 85;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const words = entry.target.querySelectorAll('.split-word');
        words.forEach((w, i) => {
          setTimeout(() => w.classList.add('is-visible'), i * step);
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3, rootMargin: '0px 0px -5% 0px' });

    items.forEach(el => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // 12. Reveal spring — variante reveal avec ressort
  // ---------------------------------------------------------------------
  function initRevealSpring() {
    const items = document.querySelectorAll('.reveal-spring');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // 13. Section markers — slide-in from left
  // ---------------------------------------------------------------------
  function initSectionMarkers() {
    const items = document.querySelectorAll('.section-marker');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    items.forEach(el => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // 14. Parallax — translate Y basé sur position viewport
  // ---------------------------------------------------------------------
  function initParallax() {
    if (prefersReducedMotion) return;
    const items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;

    let ticking = false;
    function update() {
      const vh = window.innerHeight;
      items.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Visible only when in viewport range
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const speed = (parseFloat(el.dataset.parallax) || 0.12) * 2.2;
        const center = rect.top + rect.height / 2;
        const distance = (center - vh / 2) / vh;
        const offset = -distance * speed * 100;
        el.style.transform = 'translate3d(0, ' + offset.toFixed(2) + 'px, 0)';
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  // ---------------------------------------------------------------------
  // 15. Custom cursor — point or qui suit, hover state élargi
  // ---------------------------------------------------------------------
  function initCursor() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const cursor = document.querySelector('[data-mb-cursor]');
    if (!cursor) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX, curY = mouseY;
    const lerp = 0.18;

    cursor.style.opacity = '0';

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.opacity = '1';
    }, { passive: true });

    function frame() {
      curX += (mouseX - curX) * lerp;
      curY += (mouseY - curY) * lerp;
      cursor.style.transform = 'translate3d(' + curX + 'px, ' + curY + 'px, 0) translate(-50%, -50%)';
      requestAnimationFrame(frame);
    }
    frame();

    // Hover state on interactive elements
    const hoverSelectors = 'a, button, [role="button"], input, textarea, select, label[for], .hover-lift';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverSelectors)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverSelectors)) cursor.classList.remove('is-hover');
    });

    // Hide when leaving window
    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
  }

  // ---------------------------------------------------------------------
  // 16. Scroll progress — barre or top viewport
  // ---------------------------------------------------------------------
  function initScrollProgress() {
    const bar = document.querySelector('[data-mb-scroll-progress]');
    if (!bar) return;

    let ticking = false;
    function update() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
      bar.style.width = (ratio * 100).toFixed(2) + '%';
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  // ---------------------------------------------------------------------
  // 17. Marquee — clone le contenu pour boucle infinie sans coupure
  // ---------------------------------------------------------------------
  function initMarquee() {
    const tracks = document.querySelectorAll('[data-mb-marquee]');
    tracks.forEach(track => {
      if (track.dataset.cloned === '1') return;
      const clone = track.innerHTML;
      track.innerHTML = clone + clone;
      track.dataset.cloned = '1';
    });
  }

  // ---------------------------------------------------------------------
  // 18. Live time — heure Cluj-Napoca (UTC+2/+3 selon DST)
  // ---------------------------------------------------------------------
  function initLiveTime() {
    const items = document.querySelectorAll('[data-mb-live-time]');
    if (!items.length) return;

    function format() {
      const d = new Date();
      // Force Europe/Bucharest timezone (Cluj-Napoca)
      const opts = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Bucharest' };
      const time = new Intl.DateTimeFormat('fr-FR', opts).format(d);
      items.forEach(el => { el.textContent = time; });
    }

    format();
    setInterval(format, 30000);
  }

  // ---------------------------------------------------------------------
  // 19. Tilt cards — micro mouvement éditorial sur cartes papier
  // ---------------------------------------------------------------------
  function initTiltCards() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const cards = document.querySelectorAll('.tilt-card');
    if (!cards.length) return;

    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (-y * 8).toFixed(2);
        const rotateY = (x * 10).toFixed(2);
        card.style.transform = 'perspective(900px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translate3d(0, -6px, 0) scale(1.015)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ---------------------------------------------------------------------
  // 20. Draw paths — cartes et itinéraires SVG au scroll
  // ---------------------------------------------------------------------
  function initDrawPaths() {
    const groups = document.querySelectorAll('[data-draw-group]');
    if (!groups.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      groups.forEach(group => group.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    groups.forEach(group => io.observe(group));
  }

  // ---------------------------------------------------------------------
  // 21. Product gallery — clic sur miniature sans rechargement
  // ---------------------------------------------------------------------
  function initProductGallery() {
    const main = document.querySelector('[data-product-main-image]') || document.querySelector('.product__main .product__img');
    const buttons = document.querySelectorAll('[data-product-thumb]');
    if (!main || !buttons.length) return;

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const src = button.getAttribute('data-product-thumb');
        const alt = button.getAttribute('data-product-alt') || '';
        if (!src) return;

        main.classList.add('is-swapping');
        setTimeout(() => {
          main.setAttribute('src', src);
          main.setAttribute('alt', alt);
          buttons.forEach(btn => btn.classList.remove('is-active'));
          button.classList.add('is-active');
          main.classList.remove('is-swapping');
        }, prefersReducedMotion ? 0 : 160);
      });
    });
  }

  // ---------------------------------------------------------------------
  // 22. Motion hero — profondeur au curseur façon Framer Motion
  // ---------------------------------------------------------------------
  function initMotionHero() {
    return;
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const hero = document.querySelector('[data-motion-hero]');
    if (!hero) return;

    const layers = hero.querySelectorAll('[data-motion-layer]');
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let pointerX = 50;
    let pointerY = 42;
    let active = false;

    function setTargets(e) {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = Math.max(-1, Math.min(1, x * 2));
      targetY = Math.max(-1, Math.min(1, y * 2));
      pointerX = Math.max(0, Math.min(100, (x + 0.5) * 100));
      pointerY = Math.max(0, Math.min(100, (y + 0.5) * 100));
      active = true;
    }

    function resetTargets() {
      targetX = 0;
      targetY = 0;
      pointerX = 50;
      pointerY = 42;
      active = false;
    }

    function frame() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      hero.style.setProperty('--hero-pointer-x', pointerX.toFixed(2) + '%');
      hero.style.setProperty('--hero-pointer-y', pointerY.toFixed(2) + '%');

      layers.forEach(layer => {
        const depth = parseFloat(layer.dataset.motionDepth || '10') * 2.4;
        const x = currentX * depth;
        const y = currentY * depth;
        layer.style.setProperty('--layer-x', x.toFixed(2) + 'px');
        layer.style.setProperty('--layer-y', y.toFixed(2) + 'px');
      });

      if (active || Math.abs(currentX) > 0.001 || Math.abs(currentY) > 0.001) {
        requestAnimationFrame(frame);
      }
    }

    hero.addEventListener('mousemove', e => {
      const wasActive = active;
      setTargets(e);
      if (!wasActive) requestAnimationFrame(frame);
    }, { passive: true });

    hero.addEventListener('mouseleave', () => {
      resetTargets();
      requestAnimationFrame(frame);
    });
  }

  // ---------------------------------------------------------------------
  // 23. Framer Motion — auto reveal scroll system
  // ---------------------------------------------------------------------
  function initFramerMotion() {
    if (!('IntersectionObserver' in window)) return;

    // -- Auto-tag pass : applique data-fm aux blocs éditoriaux du <main>
    const main = document.querySelector('main');
    if (main && !prefersReducedMotion) {
      const SKIP_SELF = '.reveal, .reveal-spring, .img-reveal, .split-word, .split-word-wrap, [data-split-words], [data-fm], [data-fm-skip]';
      const SKIP_ANCESTOR = '.hero, .mb-header, .mb-intro, .mb-mobile-nav, .reveal, .reveal-spring, .img-reveal, [data-split-words], [data-fm-skip]';
      const candidates = main.querySelectorAll(
        'section h1, section h2, section h3, section h4, ' +
        'section .container > p, section blockquote, ' +
        'section figure, section .container > ul, section .container > ol, ' +
        'section .paper-panel'
      );
      let idx = 0;
      candidates.forEach(el => {
        if (el.matches(SKIP_SELF)) return;
        if (el.closest(SKIP_ANCESTOR)) return;
        if (el.dataset.fm) return;
        // Choisit variante selon tag
        const tag = el.tagName.toLowerCase();
        let variant = 'rise';
        if (tag === 'h1' || tag === 'h2') variant = 'lines';
        else if (tag === 'h3' || tag === 'h4') variant = 'rise';
        else if (tag === 'ul' || tag === 'ol') {
          el.setAttribute('data-fm-stagger', '60');
          return;
        } else if (tag === 'blockquote') variant = 'blur';
        else if (tag === 'figure') variant = 'scale';
        el.setAttribute('data-fm', variant);
        // Petit delay progressif intra-section pour rythme
        const localDelay = Math.min(idx * 40, 240);
        el.style.setProperty('--fm-delay', localDelay + 'ms');
        idx++;
      });
    }

    // -- Lines split : génère .fm-line-wrap > .fm-line pour data-fm="lines"
    const linesEls = document.querySelectorAll('[data-fm="lines"]');
    linesEls.forEach(el => {
      if (el.dataset.fmLinesDone === '1') return;
      // Heuristique simple : si pas de <br>, on garde tout en une ligne ; sinon on split.
      const html = el.innerHTML.trim();
      const rawParts = html.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
      el.innerHTML = '';
      const parts = rawParts.length ? rawParts : [html];
      parts.forEach((part, i) => {
        const wrap = document.createElement('span');
        wrap.className = 'fm-line-wrap';
        const line = document.createElement('span');
        line.className = 'fm-line';
        line.style.setProperty('--fm-line-delay', (i * 110) + 'ms');
        line.innerHTML = part;
        wrap.appendChild(line);
        el.appendChild(wrap);
      });
      el.dataset.fmLinesDone = '1';
    });

    // -- Stagger children delay
    document.querySelectorAll('[data-fm-stagger]').forEach(parent => {
      const step = parseInt(parent.dataset.fmStagger || '70', 10);
      Array.prototype.forEach.call(parent.children, (child, i) => {
        child.style.setProperty('--fm-child-delay', (i * step) + 'ms');
      });
    });

    // -- Observers
    const fmEls = document.querySelectorAll('[data-fm], [data-fm-stagger]');
    if (!fmEls.length) return;

    if (prefersReducedMotion) {
      fmEls.forEach(el => el.classList.add('is-fm-in'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.classList.add('is-fm-in'));
        });
        if (el.dataset.fmOnce !== 'false') io.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    fmEls.forEach(el => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // 24b. Region Explorer — fullscreen carousel des 12 éditions
  //
  //      Comportement :
  //      - Clic sur une ligne → la section passe en `.is-stage` : le UL
  //        explorer devient une bande horizontale position:fixed avec
  //        scroll-snap-x sur 100vw par slide. Body bloqué.
  //      - Swipe / drag horizontal natif (touch + trackpad horizontal).
  //      - Wheel vertical / clavier ↑↓→← / boutons prev-next → naviguent
  //        d'une région à l'autre (throttle anti-skip).
  //      - Le scroll horizontal met à jour le slide actif (counter, hash,
  //        is-active pour le kenburns).
  //      - Bouton X ou Escape → ferme le stage, débloque le scroll.
  //      - Le ancien mode `is-takeover` (CSS encore présent) n'est plus
  //        activé par le JS — remplacé par `is-stage`.
  // ---------------------------------------------------------------------
  function initRegionExplorer() {
    const explorer = document.querySelector('[data-region-explorer]');
    if (!explorer) return;

    const section = explorer.closest('.journey') || explorer.closest('section');
    const toggles = explorer.querySelectorAll('[data-region-toggle]');
    if (!toggles.length || !section) return;

    const items = Array.prototype.slice.call(explorer.querySelectorAll('[data-region-slug]'));
    if (!items.length) return;

    let inStage = false;
    let currentIdx = 0;
    let wheelLock = false;
    let wheelTimer = null;
    let scrollTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function getItem(slug) {
      return explorer.querySelector('[data-region-slug="' + slug + '"]');
    }
    function slugOf(item) { return item.getAttribute('data-region-slug'); }

    // ----- Stage controls overlay (close / prev / next / counter) -----

    const controls = document.createElement('div');
    controls.className = 'journey__stage-controls';
    controls.setAttribute('aria-hidden', 'true');
    controls.innerHTML =
      '<button class="journey__stage-close" type="button" aria-label="Fermer">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
      '</button>' +
      '<button class="journey__stage-arrow journey__stage-prev" type="button" aria-label="Région précédente">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>' +
      '</button>' +
      '<button class="journey__stage-arrow journey__stage-next" type="button" aria-label="Région suivante">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' +
      '</button>' +
      '<div class="journey__stage-counter" aria-live="polite">' +
        '<span class="journey__stage-counter-num">01</span>' +
        '<span class="journey__stage-counter-sep">/</span>' +
        '<span class="journey__stage-counter-total">' + pad2(items.length) + '</span>' +
      '</div>';
    section.appendChild(controls);

    const closeBtn   = controls.querySelector('.journey__stage-close');
    const prevBtn    = controls.querySelector('.journey__stage-prev');
    const nextBtn    = controls.querySelector('.journey__stage-next');
    const counterNum = controls.querySelector('.journey__stage-counter-num');

    function setActive(idx) {
      idx = Math.max(0, Math.min(items.length - 1, idx));
      if (items[currentIdx]) items[currentIdx].classList.remove('is-active');
      currentIdx = idx;
      if (items[currentIdx]) items[currentIdx].classList.add('is-active');
      counterNum.textContent = pad2(idx + 1);
      prevBtn.disabled = (idx === 0);
      nextBtn.disabled = (idx === items.length - 1);
      const slug = slugOf(items[idx]);
      if (slug && history.replaceState && inStage) {
        history.replaceState(null, '', '#voyage-' + slug);
      }
    }

    function scrollToIdx(idx, opts) {
      opts = opts || {};
      idx = Math.max(0, Math.min(items.length - 1, idx));
      const target = items[idx];
      if (!target) return;
      try {
        explorer.scrollTo({
          top: target.offsetTop,
          behavior: opts.instant ? 'auto' : 'smooth'
        });
      } catch (_) {
        explorer.scrollTop = target.offsetTop;
      }
    }

    function navigateBy(dir) {
      const next = Math.max(0, Math.min(items.length - 1, currentIdx + dir));
      if (next === currentIdx) return;
      scrollToIdx(next);
    }

    // ----- Open / Close stage -----

    function openStage(slug) {
      if (inStage) {
        const idx = items.findIndex(it => slugOf(it) === slug);
        if (idx >= 0) scrollToIdx(idx);
        return;
      }
      const idx = items.findIndex(it => slugOf(it) === slug);
      if (idx < 0) return;
      inStage = true;
      section.classList.add('is-stage');
      document.body.classList.add('is-region-stage');
      explorer.classList.add('has-open');
      controls.setAttribute('aria-hidden', 'false');
      // Tous les panels visibles a11y en stage (rows masquées via CSS).
      items.forEach(it => {
        const panel = it.querySelector('[data-region-panel]');
        if (panel) panel.setAttribute('aria-hidden', 'false');
      });
      if (window.__mbLenis && typeof window.__mbLenis.stop === 'function') {
        window.__mbLenis.stop();
      }
      // Snap au slide cible sans animation (on est en train d'apparaître).
      requestAnimationFrame(() => {
        scrollToIdx(idx, { instant: true });
        setActive(idx);
      });
    }

    function closeStage() {
      if (!inStage) return;
      inStage = false;
      section.classList.remove('is-stage');
      explorer.classList.remove('has-open');
      document.body.classList.remove('is-region-stage');
      controls.setAttribute('aria-hidden', 'true');
      items.forEach(it => {
        it.classList.remove('is-active');
        const panel = it.querySelector('[data-region-panel]');
        if (panel) panel.setAttribute('aria-hidden', 'true');
      });
      try { explorer.scrollTop = 0; } catch (_) {}
      if (window.__mbLenis && typeof window.__mbLenis.start === 'function') {
        window.__mbLenis.start();
      }
      if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      // Restaure le focus sur la row qui avait ouvert.
      const lastItem = items[currentIdx];
      if (lastItem) {
        const toggle = lastItem.querySelector('[data-region-toggle]');
        if (toggle && typeof toggle.focus === 'function') {
          toggle.focus({ preventScroll: true });
        }
      }
    }

    // ----- Scroll tracking dans le carousel : détecte le slide centré -----

    explorer.addEventListener('scroll', () => {
      if (!inStage) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const center = explorer.scrollTop + explorer.clientHeight / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        items.forEach((it, i) => {
          const c = it.offsetTop + it.offsetHeight / 2;
          const d = Math.abs(c - center);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        if (bestIdx !== currentIdx) setActive(bestIdx);
      }, 90);
    }, { passive: true });

    // ----- Toggles : clic sur une ligne ouvre le stage -----

    explorer.querySelectorAll('[data-region-toggle]').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const slug = toggle.getAttribute('data-region-toggle');
        if (!slug) return;
        openStage(slug);
      });
    });

    // ----- Controls -----

    closeBtn.addEventListener('click', () => closeStage());
    prevBtn.addEventListener('click', () => navigateBy(-1));
    nextBtn.addEventListener('click', () => navigateBy(1));

    // ----- Wheel : wheel vertical/horizontal → nav slide (throttle) -----

    window.addEventListener('wheel', (e) => {
      if (!inStage) return;
      e.preventDefault();
      if (wheelLock) return;
      const dy = e.deltaY || 0;
      const dx = e.deltaX || 0;
      const delta = Math.abs(dy) > Math.abs(dx) ? dy : dx;
      if (Math.abs(delta) < 12) return;
      wheelLock = true;
      navigateBy(delta > 0 ? 1 : -1);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelLock = false; }, 680);
    }, { passive: false });

    // ----- Touch : swipe horizontal natif via scroll-snap ; swipe vertical
    //       déclenche la close si l'utilisateur tire vers le bas. -----

    window.addEventListener('touchstart', (e) => {
      if (!inStage) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!inStage) return;
      const t = (e.changedTouches && e.changedTouches[0]);
      if (!t) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      // Swipe vertical net (> 80px) sans intention horizontale → close.
      if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx) * 1.4) {
        closeStage();
      }
    }, { passive: true });

    // ----- Clavier -----

    window.addEventListener('keydown', (e) => {
      if (!inStage) return;
      const active = document.activeElement;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
      switch (e.key) {
        case 'Escape':
          e.preventDefault(); closeStage(); break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
        case 'Spacebar':
          e.preventDefault(); navigateBy(1); break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault(); navigateBy(-1); break;
        case 'ArrowDown':
          e.preventDefault(); navigateBy(1); break;
        case 'ArrowUp':
          e.preventDefault(); navigateBy(-1); break;
        case 'Home':
          e.preventDefault(); scrollToIdx(0); break;
        case 'End':
          e.preventDefault(); scrollToIdx(items.length - 1); break;
      }
    });

    // --- Hash deep-link : #voyage-provence ouvre directement le stage ----

    function handleHash() {
      const hash = (window.location.hash || '').replace('#', '');
      const m = hash.match(/^voyage-([a-z0-9-]+)$/i);
      if (!m) return;
      const slug = m[1].toLowerCase();
      if (!getItem(slug)) return;
      openStage(slug);
    }
    handleHash();
    window.addEventListener('hashchange', handleHash);
  }


  // ---------------------------------------------------------------------
  // 24. Title cinema — anime garantie h1/h2/h3 des sections
  //     Initial state appliqué AVANT paint via classe inline, IO + double rAF
  //     pour s'assurer que la transition s'amorce.
  // ---------------------------------------------------------------------
  function initTitleCinema() {
    const SKIP_ANCESTOR = '.hero, .mb-header, .mb-intro, .mb-mobile-nav, [data-fm-skip]';
    const titles = document.querySelectorAll('section h1, section h2, section h3');
    if (!titles.length) return;

    const eligible = [];
    titles.forEach(el => {
      if (el.closest(SKIP_ANCESTOR)) return;
      if (el.dataset.fm) return;          // déjà géré par data-fm
      if (el.dataset.splitWords !== undefined) return;
      el.classList.add('title-cine');
      eligible.push(el);
    });

    if (!eligible.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      eligible.forEach(el => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Double rAF garantit que le state initial est peint avant la transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.classList.add('is-in'));
        });
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    eligible.forEach(el => io.observe(el));
  }

  // ---------------------------------------------------------------------
  // 25. Scroll typewriter — le texte s'écrit seul, lié au scroll
  //
  //     Opt-in via data-typewriter sur n'importe quel élément texte.
  //     - Découpe en .tw-word > .tw-char (mots insécables, wrap propre).
  //     - La fraction révélée suit la position de l'élément dans le viewport :
  //       commence à 82% de hauteur, finie à 38% → effet de frappe au scroll,
  //       réversible quand on remonte (scrubbing façon useScroll/useTransform).
  //     - Un curseur absolu (.tw-caret) est déplacé à la position d'écriture.
  //     - data-typewriter peut valoir "start:end" (fractions viewport, ex
  //       "0.9:0.3") pour personnaliser la plage de scrub.
  // ---------------------------------------------------------------------
  function initScrollTypewriter() {
    const items = document.querySelectorAll('[data-typewriter]');
    if (!items.length) return;

    // -- Split pass : .tw-word > .tw-char + curseur
    items.forEach(el => {
      if (el.dataset.twDone === '1') return;

      const text = el.textContent;
      el.textContent = '';
      el.classList.add('tw');

      const frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(token => {
        if (token === '') return;
        if (/^\s+$/.test(token)) {
          frag.appendChild(document.createTextNode(token));
          return;
        }
        const word = document.createElement('span');
        word.className = 'tw-word';
        for (const ch of token) {
          const c = document.createElement('span');
          c.className = 'tw-char';
          c.textContent = ch;
          word.appendChild(c);
        }
        frag.appendChild(word);
      });
      el.appendChild(frag);

      const caret = document.createElement('span');
      caret.className = 'tw-caret';
      caret.setAttribute('aria-hidden', 'true');
      el.appendChild(caret);

      // Plage de scrub personnalisable : data-typewriter="0.9:0.3"
      const range = (el.getAttribute('data-typewriter') || '').split(':');
      el.__twStart = parseFloat(range[0]) || 0.82;
      el.__twEnd   = parseFloat(range[1]) || 0.38;
      el.__twChars = el.querySelectorAll('.tw-char');
      el.__twCaret = caret;
      el.__twLast  = -1;
      el.dataset.twDone = '1';
    });

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.tw-char').forEach(c => c.classList.add('is-typed'));
      document.querySelectorAll('.tw-caret').forEach(c => { c.style.display = 'none'; });
      return;
    }

    // -- Anime seulement les éléments proches du viewport
    const active = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      if (active.size) requestTick();
    }, { rootMargin: '25% 0px 25% 0px', threshold: 0 });
    items.forEach(el => io.observe(el));

    let ticking = false;
    function requestTick() {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }

    function placeCaret(el, reveal) {
      const chars = el.__twChars;
      const caret = el.__twCaret;
      let x, y, h;
      if (reveal > 0) {
        const ref = chars[reveal - 1];
        x = ref.offsetLeft + ref.offsetWidth;
        y = ref.offsetTop;
        h = ref.offsetHeight;
      } else if (chars.length) {
        const ref = chars[0];
        x = ref.offsetLeft;
        y = ref.offsetTop;
        h = ref.offsetHeight;
      } else {
        return;
      }
      caret.style.height = h + 'px';
      caret.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    }

    function update() {
      ticking = false;
      const vh = window.innerHeight;
      active.forEach(el => {
        const chars = el.__twChars;
        if (!chars.length) return;
        const rect = el.getBoundingClientRect();
        const startY = vh * el.__twStart;
        const endY   = vh * el.__twEnd;
        let p = (startY - rect.top) / (startY - endY);
        p = Math.max(0, Math.min(1, p));

        const reveal = Math.round(p * chars.length);
        if (reveal !== el.__twLast) {
          const from = Math.min(el.__twLast < 0 ? 0 : el.__twLast, reveal);
          const to   = Math.max(el.__twLast, reveal);
          for (let i = from; i <= to && i < chars.length; i++) {
            chars[i].classList.toggle('is-typed', i < reveal);
          }
          placeCaret(el, reveal);
          el.classList.toggle('tw-complete', reveal >= chars.length);
          el.__twLast = reveal;
        }
      });
    }

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', () => {
      // Recalage des positions de curseur après reflow
      items.forEach(el => { el.__twLast = -1; });
      requestTick();
    }, { passive: true });

    requestTick();
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  function init() {
    // Tôt dans l'init : aucun module suivant ne peut bloquer la frappe au scroll.
    try { initScrollTypewriter(); } catch (e) { /* no-op */ }
    initMobileMenu();
    initHeaderScroll();
    initReveal();
    initStagger();
    initCountdown();
    initLenis();
    initImageReveal();
    initCountUp();
    initMagnetic();
    initSplitWords();
    initRevealSpring();
    initSectionMarkers();
    initParallax();
    initScrollProgress();
    initMarquee();
    initLiveTime();
    initTiltCards();
    initDrawPaths();
    initProductGallery();
    initMotionHero();
    initFramerMotion();
    initTitleCinema();
    initRegionExplorer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
