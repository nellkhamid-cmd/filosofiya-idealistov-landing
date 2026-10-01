/* =====================================================================
   «Философия идеалистов на Жуковского» — логика и анимации лендинга
   GSAP 3.13 + ScrollTrigger + SplitText, Lenis (плавный скролл только на десктопе с мышью).
   Приёмы LUCE: scrub-анимации, первый экран-«шторка», раскрытие фото, pin + горизонталь,
   pin + проявление текста, подчёркивание по скроллу. Интерфейс — пружины ui-motion на CSS.
   ===================================================================== */
(function () {
  'use strict';

  const d = document;
  const html = d.documentElement;
  const $ = (s, c) => (c || d).querySelector(s);
  const $$ = (s, c) => [...(c || d).querySelectorAll(s)];
  const CFG = window.FI_CONFIG || {};
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  const MOTION = HAS_GSAP && !REDUCED;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DESK = '(min-width: 1024px)';

  html.classList.add('ready', MOTION ? 'has-motion' : 'no-motion');

  if (HAS_GSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  /* десктоп с мышью: плавный скролл и разбивка заголовков на строки; на телефоне эти библиотеки не грузятся вовсе */
  const RICH = MOTION && FINE && matchMedia(DESK).matches;
  function loadScript(src) {
    return new Promise((res, rej) => { const s = d.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; d.head.appendChild(s); });
  }
  const mm = HAS_GSAP ? gsap.matchMedia() : null;

  /* ---------------------------------------------------------------
     Цели Метрики
     --------------------------------------------------------------- */
  function goal(name) {
    if (!name) return;
    if (CFG.metrikaId && typeof window.ym === 'function') window.ym(CFG.metrikaId, 'reachGoal', name);
  }
  d.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goal]');
    if (g && g.type !== 'submit') goal(g.dataset.goal);   /* у кнопок отправки цель — после успешной заявки */
  });

  /* ---------------------------------------------------------------
     1. Плавный скролл: Lenis только на десктопе с мышью
     --------------------------------------------------------------- */
  let lenis = null;
  if (RICH) {
    loadScript('assets/js/vendor/lenis.min.js').then(() => {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }).catch(() => {});
    loadScript('assets/js/vendor/SplitText.min.js').then(() => { if (window.SplitText) gsap.registerPlugin(SplitText); }).catch(() => {});
  }
  function scrollTo(target) {
    const el = typeof target === 'string' ? (target === '#top' ? 0 : $(target)) : target;
    if (el === null || el === undefined) return;
    if (lenis) { lenis.scrollTo(el, { duration: 1.6 }); return; }
    const y = typeof el === 'number' ? el : el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
  }
  function lockScroll(on) {
    if (lenis) on ? lenis.stop() : lenis.start();
    html.style.overflow = on ? 'hidden' : '';
  }
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-scroll]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href[0] !== '#') return;
    e.preventDefault();
    if (html.classList.contains('open-menu')) toggleMenu(false);
    scrollTo(href);
  });
  $$('[data-policy]').forEach((a) => a.addEventListener('click', (e) => { if (a.getAttribute('href') === '#') e.preventDefault(); }));

  /* ---------------------------------------------------------------
     2. Шапка: компактная после первого экрана, прячется при скролле вниз
     --------------------------------------------------------------- */
  const hdr = $('#hdr');
  let lastY = 0;
  function onScrollHeader(y) {
    hdr.classList.toggle('is-compact', y > 40);
    const goingDown = y > lastY + 2, goingUp = y < lastY - 2;
    if (y > window.innerHeight * 0.9 && goingDown && !html.classList.contains('open-menu')) hdr.classList.add('is-hidden');
    else if (goingUp || y < window.innerHeight * 0.9) hdr.classList.remove('is-hidden');
    lastY = y;
  }
  if (HAS_GSAP) ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => onScrollHeader(self.scroll()) });
  else new IntersectionObserver(([en]) => hdr.classList.toggle('is-compact', !en.isIntersecting), { rootMargin: '-60px 0px 0px 0px' }).observe($('.hero__in'));

  /* Меню (выезжает снизу) */
  const menu = $('#menu');
  const burger = $('.burger');
  $$('.menu__list li').forEach((li, i) => li.style.setProperty('--i', i));
  function toggleMenu(open) {
    const on = open === undefined ? !html.classList.contains('open-menu') : open;
    html.classList.toggle('open-menu', on);
    burger.setAttribute('aria-expanded', String(on));
    burger.setAttribute('aria-label', on ? 'Закрыть меню' : 'Открыть меню');
    menu.inert = !on;
    lockScroll(on);
    if (on) hdr.classList.remove('is-hidden');
  }
  burger.addEventListener('click', () => toggleMenu());

  /* ---------------------------------------------------------------
     3. Первый экран: «прилипает», следующий блок наезжает шторкой.
        Если экран выше окна (маленький телефон) — прилипает после того,
        как показан целиком.
     --------------------------------------------------------------- */
  const hero = $('.hero');
  function heroTop() { hero.style.top = Math.min(0, window.innerHeight - hero.offsetHeight) + 'px'; }
  heroTop();
  window.addEventListener('resize', heroTop);

  /* 4. Интро первого экрана — на CSS (style.css, «Интро первого экрана»): текст виден с первой отрисовки */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------------------------------------------------------
     5. Анимации прокрутки
     --------------------------------------------------------------- */
  function initScrollMotion() {
    if (!MOTION) return;

    /* 5.1 Первый экран уходит под шторку: текст уезжает вверх, фото наезжает и темнеет */
    const dim = d.createElement('span');
    dim.className = 'hero__dim';
    dim.style.cssText = 'position:absolute;inset:0;background:#081616;opacity:0;pointer-events:none';
    $('.hero__media').appendChild(dim);
    const out = { trigger: '.buy', start: 'top bottom', end: 'top top', scrub: true };
    gsap.to('.hero__in', { yPercent: -22, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.buy', start: 'top bottom', end: 'top 35%', scrub: true } });
    gsap.to('.hero__media picture', { scale: 1.12, yPercent: 6, ease: 'none', scrollTrigger: out });
    gsap.to(dim, { opacity: 0.55, ease: 'none', scrollTrigger: out });

    /* 5.2 Заголовки секций: строки выезжают из-под маски */
    gsap.set('[data-split]', { autoAlpha: 0 });
    $$('[data-split]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => {
          gsap.set(el, { autoAlpha: 1 });
          if (window.SplitText) {
            const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
            gsap.from(split.lines, { yPercent: 112, duration: 1.1, ease: 'expo.out', stagger: 0.07, onComplete: () => split.revert() });
          } else {
            gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: 'expo.out' });
          }
        },
      });
    });

    /* 5.3 Появление блоков пачками, с лесенкой */
    gsap.set('[data-reveal]', { y: 48, opacity: 0 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.15, ease: 'expo.out', stagger: 0.09, overwrite: true }),
    });

    /* 5.4 Подчёркивание смысловых слов, когда они доходят до середины экрана (LUCE) */
    $$('.u').forEach((el) => ScrollTrigger.create({
      trigger: el, start: 'top 62%',
      onEnter: () => el.classList.add('is-on'), onLeaveBack: () => el.classList.remove('is-on'),
    }));

    /* 5.5 Счётчики */
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const suf = el.dataset.suffix || '';
      const fmt = (v) => v.toFixed(dec).replace('.', ',') + suf;
      const o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: to, duration: dec ? 1.6 : 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }),
      });
    });

    /* 5.6 Способы покупки: рендер башни медленно опускается внутри карточки (десктоп) */
    mm.add(DESK, () => gsap.fromTo('.buy-card__media img', { yPercent: -6, scale: 1.12 }, { yPercent: 4, scale: 1, ease: 'none', scrollTrigger: { trigger: '.buy-card--mortgage', start: 'top bottom', end: 'bottom top', scrub: true } }));

    /* 5.7 О проекте — «раскрытие»: рамка распахивается до краёв, фото отъезжает (встречные масштабы LUCE) */
    const frame = $('[data-about-frame]');
    gsap.fromTo(frame, { scale: 0.86 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 15%', scrub: true } });
    mm.add(DESK, () => gsap.fromTo('.about__img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom 40%', scrub: true } }));
    mm.add(DESK, () => {
      gsap.fromTo('[data-about-card]', { xPercent: 14, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top 85%', end: 'top 35%', scrub: true } });
    });

    /* 5.8 Инфраструктура: фото «дышат» внутри карточек, правая идёт с другой скоростью */
    mm.add(DESK, () => $$('.photo-card__media img').forEach((img) => {
      gsap.fromTo(img, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.photo-card'), start: 'top bottom', end: 'bottom 30%', scrub: true } });
    }));
    mm.add('(min-width: 768px)', () => {
      gsap.fromTo('.photo-card--tall', { y: 36 }, { y: -18, ease: 'none', scrollTrigger: { trigger: '.infra__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* 5.9 Галерея: кадры въезжают справа со шторкой */
    gsap.fromTo('.g-item', { x: 140, opacity: 0 }, {
      x: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.09,
      scrollTrigger: { trigger: '.gallery__track', start: 'top 85%', once: true },
    });

    /* 5.10 Застройщик: фон медленно сдвигается (параллакс) */
    mm.add(DESK, () => gsap.fromTo('.dev__media', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.dev', start: 'top bottom', end: 'bottom top', scrub: true } }));

    /* 5.11 Отзывы: карточки поднимаются лесенкой, звёзды загораются по одной */
    gsap.from('.rev', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.reviews__track', start: 'top 88%', once: true } });
    gsap.from('.stars svg', { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.03, scrollTrigger: { trigger: '.reviews__track', start: 'top 70%', once: true } });

    /* 5.12 Заявка: фото раскрывается снизу */
    mm.add(DESK, () => gsap.fromTo('.lead__media img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.lead__media', start: 'top bottom', end: 'bottom 40%', scrub: true } }));

    /* 5.13 Отделка: на десктопе экран прилипает, фото отъезжает, плашка White Box проявляется (pin + reveal) */
    mm.add(DESK, () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.finish__pin', start: 'top top', end: '+=90%', pin: true, scrub: true } });
      tl.fromTo('.finish__media img', { scale: 1.2 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('[data-finish-box]', { y: 90, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', duration: 0.45 }, 0.3)
        .fromTo('.finish__badge', { scale: 0.85 }, { scale: 1, ease: 'back.out(2)', duration: 0.3 }, 0.1);
    });
    mm.add('(max-width: 1023px)', () => {
      gsap.fromTo('.finish__media img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.finish', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('[data-finish-box]', { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '[data-finish-box]', start: 'top 92%', once: true } });
    });
  }

  /* ---------------------------------------------------------------
     6. Карусели: преимущества (pin + горизонталь на десктопе), галерея, отзывы
     --------------------------------------------------------------- */
  function carousel(key, opts) {
    const track = $(`[data-track="${key}"]`);
    if (!track) return;
    const scroller = opts && opts.scroller ? $(opts.scroller) : track;
    const arrows = $(`[data-arrows="${key}"]`);
    const bar = $(`[data-progress="${key}"]`);
    const items = [...track.children];
    const step = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : scroller.clientWidth * 0.8);

    let raf = 0;
    function update() {
      raf = 0;
      if (opts && opts.isPinned && opts.isPinned()) return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const p = max > 0 ? scroller.scrollLeft / max : 1;
      const vis = scroller.clientWidth / scroller.scrollWidth;
      if (bar) bar.firstElementChild.style.setProperty('--p', Math.max(vis, Math.min(1, vis + p * (1 - vis))).toFixed(3));
      if (arrows) {
        arrows.querySelector('[data-dir="-1"]').disabled = scroller.scrollLeft < 4;
        arrows.querySelector('[data-dir="1"]').disabled = scroller.scrollLeft > max - 4;
      }
    }
    scroller.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
    update();

    if (arrows) arrows.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dir]');
      if (!b) return;
      const dir = +b.dataset.dir;
      if (opts && opts.onArrow && opts.onArrow(dir)) return;
      scroller.scrollBy({ left: dir * step(), behavior: REDUCED ? 'auto' : 'smooth' });
    });

    /* перетаскивание мышью (на тач-экранах — нативный свайп) */
    if (FINE && !(opts && opts.noDrag)) {
      let down = false, moved = false, sx = 0, sl = 0;
      scroller.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = false; sx = e.clientX; sl = scroller.scrollLeft;
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx;
        if (!moved && Math.abs(dx) > 6) { moved = true; scroller.classList.add('is-drag'); }
        if (moved) scroller.scrollLeft = sl - dx;
      });
      window.addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        if (moved) {
          scroller.classList.remove('is-drag');
          const s = step(); /* доводим до ближайшего кадра */
          scroller.scrollTo({ left: Math.round(scroller.scrollLeft / s) * s, behavior: 'smooth' });
        }
      });
    }
    return { update };
  }

  function initCarousels() {
    /* Преимущества */
    let advPinned = null;
    const advBar = $('[data-progress="adv"] i');
    carousel('adv', {
      scroller: '.adv__viewport', noDrag: true,
      isPinned: () => !!advPinned,
      onArrow: (dir) => {
        if (!advPinned) return false;
        const st = advPinned.scrollTrigger;
        const track = $('.adv__track');
        const cards = track.children;
        const dist = st.end - st.start;
        const stepPx = cards[1].offsetLeft - cards[0].offsetLeft;
        const travel = track.scrollWidth - d.documentElement.clientWidth;
        const p = Math.max(0, Math.min(1, st.progress + dir * (stepPx / travel)));
        const y = st.start + dist * p + 1;
        if (lenis) lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
        return true;
      },
    });
    if (MOTION) {
      mm.add(DESK, () => {
        const track = $('.adv__track');
        const travel = () => track.scrollWidth - d.documentElement.clientWidth;
        advPinned = gsap.to(track, {
          x: () => -travel(), ease: 'none',
          scrollTrigger: {
            trigger: '.adv__pin', start: 'top top', end: () => '+=' + travel(), pin: true, scrub: 1, invalidateOnRefresh: true,
            onUpdate: (self) => {
              const vis = d.documentElement.clientWidth / track.scrollWidth;
              advBar.style.setProperty('--p', (vis + self.progress * (1 - vis)).toFixed(3));
              const arrows = $('[data-arrows="adv"]');
              arrows.querySelector('[data-dir="-1"]').disabled = self.progress < 0.01;
              arrows.querySelector('[data-dir="1"]').disabled = self.progress > 0.99;
            },
          },
        });
        /* карточки поднимаются при подходе к секции; иконки «оживают»: видимые — сразу,
           остальные — когда карточка въезжает в кадр по горизонтали */
        gsap.from('.adv-card', { y: 80, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.adv', start: 'top 85%', once: true } });
        const vw = d.documentElement.clientWidth;
        const icoFrom = { scale: 0.4, rotate: -25, opacity: 0, duration: 0.9, ease: 'back.out(2.2)' };
        $$('.adv-card').forEach((card, i) => {
          const ico = card.querySelector('.adv-card__ico');
          if (card.offsetLeft + card.offsetWidth * 0.5 < vw) {
            gsap.from(ico, Object.assign({}, icoFrom, { delay: 0.35 + i * 0.08, scrollTrigger: { trigger: '.adv', start: 'top 85%', once: true } }));
          } else {
            gsap.from(ico, Object.assign({}, icoFrom, { scrollTrigger: { trigger: card, containerAnimation: advPinned, start: 'left 92%', toggleActions: 'play none none reverse' } }));
          }
        });
        return () => { advPinned = null; };
      });
      mm.add('(max-width: 1023px)', () => {
        gsap.from('.adv-card', { x: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.adv__viewport', start: 'top 85%', once: true } });
      });
    }
    carousel('gal');
    carousel('rev');
  }

  /* ---------------------------------------------------------------
     7. Табы планировок: «жидкий» индикатор (ui-motion) + смена панелей с размытием
     --------------------------------------------------------------- */
  function initTabs() {
    const list = $('[data-tabs]');
    if (!list) return;
    const ind = $('.tabs__ind', list);
    const tabs = $$('[role="tab"]', list);
    let current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const place = (i) => {
      const t = tabs[i];
      ind.style.setProperty('--l', t.offsetLeft + 'px');
      ind.style.setProperty('--r', list.clientWidth - t.offsetLeft - t.offsetWidth + 'px');
    };
    function select(i, focus) {
      if (i === current) return;
      list.dataset.dir = i > current ? 'right' : 'left';
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).classList.toggle('is-active', on);
      });
      current = i;
      place(i);
      if (focus) tabs[i].focus();
    }
    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    list.addEventListener('keydown', (e) => {
      const stepK = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home') select(0, true);
      else if (e.key === 'End') select(tabs.length - 1, true);
      else if (stepK) select((current + stepK + tabs.length) % tabs.length, true);
      else return;
      e.preventDefault();
    });
    const snap = () => { delete list.dataset.dir; place(current); };
    (d.fonts ? d.fonts.ready : Promise.resolve()).then(snap);
    new ResizeObserver(snap).observe(list);
  }

  /* ---------------------------------------------------------------
     8. Карта района (brand-map): метки по координатам, раскрытие кругом,
        дуга-маршрут к объекту, связь с карточками «время → объект»
     --------------------------------------------------------------- */
  function initMap() {
    const map = $('.map');
    if (!map) return;
    const interval = 3400, curve = 0.22;
    if (!REDUCED) map.classList.add('map--anim');
    const [VW, VH] = map.dataset.vb.split(' ').map(Number);
    const home = $('.pin--home', map);
    const HX = +home.dataset.x, HY = +home.dataset.y;
    const route = $('.map__route', map);
    const pins = $$('.pin[data-key]', map);
    const items = $$('.time[data-key]');
    const keys = pins.map((p) => p.dataset.key);
    pins.forEach((p, i) => p.style.setProperty('--n', i));

    let S = 1;   /* текущий масштаб viewBox → px */
    function layout() {
      const w = map.clientWidth, h = map.clientHeight;
      if (!w || !h) return;
      const s = S = Math.max(w / VW, h / VH);
      const ox = (w - VW * s) / 2, oy = (h - VH * s) / 2;
      $$('[data-x]', map).forEach((el) => {
        /* data-ox/oy — сдвиг метки в px, если объект слишком близко к дому и метки перекрываются */
        el.style.left = (ox + el.dataset.x * s + (+el.dataset.ox || 0)).toFixed(1) + 'px';
        el.style.top = (oy + el.dataset.y * s + (+el.dataset.oy || 0)).toFixed(1) + 'px';
        if (el.dataset.r) el.style.setProperty('--r', el.dataset.r + 'deg');
      });
      requestAnimationFrame(() => {
        const mr = map.getBoundingClientRect();
        $$('.map__lbl', map).forEach((el) => {
          el.hidden = false;
          const r = el.getBoundingClientRect();
          el.hidden = r.left < mr.left + 8 || r.right > mr.right - 8 || r.top < mr.top + 8 || r.bottom > mr.bottom - 24;
        });
      });
      map.style.setProperty('--cx', ((ox + HX * s) / w * 100).toFixed(1) + '%');
      map.style.setProperty('--cy', ((oy + HY * s) / h * 100).toFixed(1) + '%');
    }
    new ResizeObserver(() => { layout(); if (current) { const k = current; current = null; activate(k); } }).observe(map);
    layout();

    let current = null;
    function activate(key) {
      if (key === current) return;
      current = key;
      pins.forEach((p) => p.classList.toggle('is-active', p.dataset.key === key));
      items.forEach((t) => t.classList.toggle('is-active', t.dataset.key === key));
      const p = pins.find((x) => x.dataset.key === key);
      if (!p) return;
      const tx = +p.dataset.x + (+p.dataset.ox || 0) / S, ty = +p.dataset.y + (+p.dataset.oy || 0) / S;
      pins.forEach((x) => x.classList.toggle('pin--below', x === p && ty > HY + 80));
      const mx = (HX + tx) / 2, my = (HY + ty) / 2, dx = tx - HX, dy = ty - HY;
      route.setAttribute('d', `M${HX} ${HY}Q${(mx - dy * curve).toFixed(0)} ${(my + dx * curve).toFixed(0)} ${tx} ${ty}`);
      route.classList.remove('is-drawn');
      void route.getBoundingClientRect();
      route.classList.add('is-drawn');
      /* подпись не должна вылезать за край карты на узком экране */
      const lbl = $('.pin__lbl', p);
      lbl.style.setProperty('--lx', '0px');
      requestAnimationFrame(() => {
        const mr = map.getBoundingClientRect(), lr = lbl.getBoundingClientRect();
        const shift = lr.right > mr.right - 8 ? mr.right - 8 - lr.right : lr.left < mr.left + 8 ? mr.left + 8 - lr.left : 0;
        lbl.style.setProperty('--lx', shift.toFixed(0) + 'px');
      });
    }

    let timer = null, touched = false, visible = false;
    const stop = () => { clearInterval(timer); timer = null; };
    const cycle = () => {
      stop();
      if (touched || !visible || REDUCED) return;
      timer = setInterval(() => activate(keys[(keys.indexOf(current) + 1) % keys.length]), interval);
    };
    const pick = (key) => { touched = true; stop(); activate(key); };
    pins.forEach((p) => p.addEventListener('click', () => pick(p.dataset.key)));
    items.forEach((t) => {
      t.addEventListener('click', () => pick(t.dataset.key));
      t.addEventListener('mouseenter', () => { if (FINE) pick(t.dataset.key); });
      t.addEventListener('focus', () => pick(t.dataset.key));
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(t.dataset.key); } });
    });

    /* раскрытие кругом начинаем только когда подложка загружена и декодирована;
       сама подложка начинает грузиться заранее — за 1500 px до блока */
    const base = $('.map__base', map);
    if ('IntersectionObserver' in window && base.loading === 'lazy') {
      const early = new IntersectionObserver(([en]) => { if (en.isIntersecting) { base.loading = 'eager'; early.disconnect(); } }, { rootMargin: '1500px 0px' });
      early.observe(map);
    }
    const baseReady = (base.complete ? Promise.resolve() : new Promise((r) => { base.addEventListener('load', r, { once: true }); base.addEventListener('error', r, { once: true }); }))
      .then(() => (base.decode ? base.decode().catch(() => {}) : null));
    const start = () => baseReady.then(() => {
      map.classList.add('is-in');
      setTimeout(() => { map.classList.add('is-ready'); if (!current) activate(keys[0]); cycle(); }, REDUCED ? 0 : 1400);
    });
    let started = false;
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !started) { started = true; start(); }
      else if (started) visible ? cycle() : stop();
    }, { threshold: 0.35 }).observe(map);
  }

  /* ---------------------------------------------------------------
     9. Отзывы: длинный текст сворачивается, «Читать полностью»
     --------------------------------------------------------------- */
  function initReviews() {
    $$('.rev__text').forEach((p) => {
      if (p.scrollHeight <= p.clientHeight + 2) return;
      const card = p.closest('.rev');
      const btn = d.createElement('button');
      btn.type = 'button';
      btn.className = 'rev__more';
      btn.textContent = 'Читать полностью';
      btn.setAttribute('aria-expanded', 'false');
      p.after(btn);
      btn.addEventListener('click', () => {
        const open = card.classList.toggle('is-open');
        btn.textContent = open ? 'Свернуть' : 'Читать полностью';
        btn.setAttribute('aria-expanded', String(open));
        if (HAS_GSAP) ScrollTrigger.refresh();
      });
    });
  }

  /* ---------------------------------------------------------------
     10. Лайтбокс галереи
     --------------------------------------------------------------- */
  function initLightbox() {
    const lb = $('#lightbox');
    const img = $('.lb__img', lb);
    const count = $('.lb__count', lb);
    const thumbs = $$('[data-lightbox] img');
    const srcs = thumbs.map((t) => t.getAttribute('src').replace('-900.webp', '-1600.webp'));
    let idx = 0, opener = null;
    function show(i, dir) {
      idx = (i + srcs.length) % srcs.length;
      const apply = () => {
        img.src = srcs[idx];
        img.alt = thumbs[idx].alt;
        count.textContent = `${idx + 1} / ${srcs.length}`;
        img.classList.remove('is-out');
      };
      if (dir && !REDUCED) {
        img.style.setProperty('--dir', dir);
        img.classList.add('is-out');
        setTimeout(apply, 220);
      } else apply();
    }
    function open(i, from) {
      opener = from;
      show(i);
      lb.inert = false;
      lb.classList.add('is-open');
      lockScroll(true);
      $('.lb__close', lb).focus();
      if (MOTION && from) {
        const r = from.getBoundingClientRect();
        gsap.fromTo(img, { scale: Math.min(0.9, r.width / window.innerWidth), opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out' });
      }
    }
    function close() {
      lb.classList.remove('is-open');
      lb.inert = true;
      lockScroll(false);
      if (opener) opener.focus();
    }
    $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => open(+b.dataset.lightbox, b)));
    $('[data-lb-close]', lb).addEventListener('click', close);
    $$('[data-lb]', lb).forEach((b) => b.addEventListener('click', () => show(idx + +b.dataset.lb, +b.dataset.lb)));
    lb.addEventListener('click', (e) => { if (e.target.classList.contains('lb__stage')) close(); });
    d.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1, 1);
      if (e.key === 'ArrowLeft') show(idx - 1, -1);
    });
    let sx = null;
    const stage = $('.lb__stage', lb);
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  }

  /* ---------------------------------------------------------------
     11. Формы: маска телефона, проверка, кнопка-морф, тост, модалка
     --------------------------------------------------------------- */
  const toast = $('.toast');
  let toastTimer;
  function showToast(text) {
    $('.toast__txt', toast).textContent = text || 'Заявка отправлена';
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2800);
  }

  function phoneMask(input) {
    const format = (raw) => {
      let digits = raw.replace(/\D/g, '');
      if (digits[0] === '8' || digits[0] === '7') digits = digits.slice(1);
      digits = digits.slice(0, 10);
      let out = '+7';
      if (digits.length) out += ' (' + digits.slice(0, 3);
      if (digits.length >= 3) out += ')';
      if (digits.length > 3) out += ' ' + digits.slice(3, 6);
      if (digits.length > 6) out += '-' + digits.slice(6, 8);
      if (digits.length > 8) out += '-' + digits.slice(8, 10);
      return out;
    };
    input.addEventListener('focus', () => { if (!input.value) input.value = '+7 ('; });
    input.addEventListener('blur', () => { if (input.value.replace(/\D/g, '').length <= 1) input.value = ''; });
    input.addEventListener('input', () => { input.value = format(input.value); });
  }

  function setErr(field, msg) {
    const box = field.closest('.field, .check');
    if (box) box.classList.toggle('is-error', !!msg);
    const err = field.closest('.field') ? $('.field__err', field.closest('.field')) : $('.field__err--agree', field.form);
    if (err) err.textContent = msg || '';
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validate(form) {
    let ok = true;
    const name = form.elements.name, phone = form.elements.phone, agree = form.elements.agree;
    if (!name.value.trim()) { setErr(name, 'Введите имя'); ok = false; } else setErr(name, '');
    if (phone.value.replace(/\D/g, '').length !== 11) { setErr(phone, 'Введите номер телефона полностью'); ok = false; } else setErr(phone, '');
    if (!agree.checked) { setErr(agree, 'Нужно согласие на обработку данных'); ok = false; } else setErr(agree, '');
    if (!ok) {
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
    }
    return ok;
  }

  function utm() {
    const p = new URLSearchParams(location.search);
    const o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'].forEach((k) => { if (p.get(k)) o[k] = p.get(k); });
    return o;
  }

  async function send(data) {
    if (!CFG.leadEndpoint) { console.info('[Заявка] leadEndpoint не задан, данные:', data); await wait(1100); return true; }
    const r = await fetch(CFG.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.ok;
  }

  function initForms() {
    $$('input[type="tel"]').forEach(phoneMask);
    $$('.field__select').forEach((s) => {
      const upd = () => s.classList.toggle('is-empty', !s.value);
      s.addEventListener('change', upd); upd();
    });
    $$('form[data-form]').forEach((form) => {
      $$('input', form).forEach((inp) => inp.addEventListener('input', () => { if (inp.getAttribute('aria-invalid') === 'true') setErr(inp, ''); }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('.morph', form);
        if (btn.dataset.state !== 'idle' || !validate(form)) return;
        btn.dataset.state = 'loading';
        btn.setAttribute('aria-busy', 'true');
        const data = Object.assign({
          form: form.dataset.form,
          topic: 'Подберем варианты и проконсультируем по финансовым условиям',
          name: form.elements.name.value.trim(),
          phone: form.elements.phone.value,
          rooms: form.elements.rooms ? form.elements.rooms.value : '',
          page: location.href,
        }, utm());
        let ok = false;
        try { ok = await send(data); } catch (err) { ok = false; }
        btn.removeAttribute('aria-busy');
        if (!ok) { btn.dataset.state = 'idle'; showToast('Не получилось отправить. Попробуйте ещё раз'); return; }
        btn.dataset.state = 'done';
        goal(btn.dataset.goal);
        showToast('Заявка отправлена');
        setTimeout(() => {
          btn.dataset.state = 'idle';
          form.reset();
          $$('.field__select', form).forEach((s) => s.classList.add('is-empty'));
        }, 1500);
      });
    });
  }

  /* Кнопки с data-quiz открывают квиз Марквиз (id — в FI_CONFIG.marquizId).
     Своей всплывающей формы нет: пока квиз не подключён, кнопки ничего не открывают. */
  d.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quiz]');
    if (!b) return;
    e.preventDefault();
    if (html.classList.contains('open-menu')) toggleMenu(false);
    if (CFG.marquizId && window.Marquiz && typeof window.Marquiz.showModal === 'function') window.Marquiz.showModal(CFG.marquizId);
    else console.info('[Квиз] Марквиз ещё не подключён: задайте FI_CONFIG.marquizId и вставьте код Марквиза');
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && html.classList.contains('open-menu')) toggleMenu(false);
  });

  /* ---------------------------------------------------------------
     СТАРТ: лёгкое сразу, анимации прокрутки — порциями после первой отрисовки
     --------------------------------------------------------------- */
  const idle = window.requestIdleCallback ? (fn) => requestIdleCallback(fn, { timeout: 600 }) : (fn) => setTimeout(fn, 60);
  const queue = [initTabs, initForms, initReviews, initLightbox, initMap, initCarousels, initScrollMotion, () => {
    if (!HAS_GSAP) return;
    ScrollTrigger.sort();
    /* общий пересчёт только если шрифты ещё грузятся (после них меняются высоты); остальное ScrollTrigger делает сам */
    if (d.fonts && d.fonts.status !== 'loaded') d.fonts.ready.then(() => ScrollTrigger.refresh());
  }];
  const step = () => { const fn = queue.shift(); if (fn) { fn(); if (queue.length) idle(step); } };
  idle(step);
})();
