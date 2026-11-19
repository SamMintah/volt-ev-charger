(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Nav: theme follows the section underneath; hide on scroll down */
  const nav = document.getElementById('nav');
  const themed = [...document.querySelectorAll('[data-nav]')];
  let lastY = scrollY;
  let ticking = false;
  const navH = () => nav.offsetHeight;
  function onScroll() {
    const y = scrollY;
    // Section under the nav's bottom edge sets its theme.
    const probe = navH() / 2;
    const under = themed.find((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    if (under) nav.dataset.theme = under.dataset.nav;
    // Hide when scrolling down past the hero fold; show when scrolling up.
    if (y > 240 && y > lastY + 4) nav.classList.add('hidden');
    else if (y < lastY - 4 || y < 240) nav.classList.remove('hidden');
    lastY = y;
    tilt();
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  nav.addEventListener('focusin', () => nav.classList.remove('hidden'));

  /* ---------- Reveal on scroll */
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- How it works: sticky phone follows the active step */
  const steps = [...document.querySelectorAll('.step')];
  const screens = [...document.querySelectorAll('.how-device img')];
  const setStep = (i) => {
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    screens.forEach((img, k) => img.classList.toggle('is-active', k === i));
  };
  setStep(0);
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setStep(+e.target.dataset.step); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => so.observe(s));
  }

  /* ---------- Showcase: gentle float/tilt tied to scroll position */
  const showcase = document.getElementById('showcase');
  function tilt() {
    if (reduce || !showcase) return;
    const r = showcase.getBoundingClientRect();
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;   // -1..1 around centre
    const clamped = Math.max(-1, Math.min(1, p));
    showcase.querySelectorAll('.device-md').forEach((d) => d.style.setProperty('--p', clamped.toFixed(3)));
  }
  tilt();

  /* ---------- Hero video: sound toggle */
  const video = document.getElementById('promo');
  const sound = document.getElementById('sound');
  if (reduce) { video.removeAttribute('autoplay'); video.pause(); video.controls = true; }
  sound.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) { video.currentTime = 0; video.play().catch(() => {}); }
    sound.setAttribute('aria-pressed', String(!video.muted));
    sound.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
    sound.querySelector('span').textContent = video.muted ? 'Sound' : 'Sound on';
  });

  /* ---------- FAQ: smooth height animation, one open at a time */
  document.querySelectorAll('.accordion details').forEach((d) => {
    const summary = d.querySelector('summary');
    const body = d.querySelector('.answer');
    summary.addEventListener('click', (e) => {
      if (reduce) return;                      // native toggle
      e.preventDefault();
      if (d.dataset.anim) return;
      const opening = !d.open;
      if (opening) {
        d.parentElement.querySelectorAll('details[open]').forEach((o) => { if (o !== d) o.querySelector('summary').click(); });
        d.open = true;
      }
      const h = body.scrollHeight;
      d.dataset.anim = '1';
      const anim = body.animate(
        opening ? [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }]
                : [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      anim.onfinish = () => { if (!opening) d.open = false; delete d.dataset.anim; };
    });
  });

  /* ---------- Waitlist forms → POST /v1/waitlist */
  const emailOK = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  document.querySelectorAll('form[data-kind]').forEach((form) => {
    const msg = form.querySelector('.form-msg');
    const email = form.querySelector('[name=email]');
    const say = (text, kind) => { msg.textContent = text; msg.className = 'form-msg ' + (kind || ''); };
    email.addEventListener('blur', () => { if (email.value && !emailOK(email.value.trim())) say('Enter an email like name@example.com.', 'err'); });
    email.addEventListener('input', () => { if (msg.classList.contains('err')) say(''); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = email.value.trim();
      if (!emailOK(value)) { say('Enter an email like name@example.com.', 'err'); email.focus(); return; }
      const btn = form.querySelector('button');
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending…';
      const body = { email: value, kind: form.dataset.kind };
      ['name', 'city'].forEach((k) => { const f = form.querySelector(`[name=${k}]`); if (f && f.value.trim()) body[k] = f.value.trim(); });
      try {
        const res = await fetch(window.VOLT_API + '/v1/waitlist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!res.ok) {
          const p = await res.json().catch(() => ({}));
          throw new Error((p.errors && p.errors[0] && p.errors[0].message) || p.detail || 'Something went wrong.');
        }
        form.reset();
        say(form.dataset.kind === 'operator' ? "Thanks — we'll be in touch within two working days." : "You're on the list. We'll email you when Volt launches.", 'ok');
      } catch (err) {
        say(err.message === 'Failed to fetch' ? "We couldn't reach our server. Check your connection and try again." : err.message, 'err');
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    });
  });

  onScroll();
})();
