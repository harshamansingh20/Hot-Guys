/* ============================================================
   HOT GUYS — Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Scroll reveal ── */
  if (!reducedMotion) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }

  /* ── Animated illustration draw-on ── */
  const illusSVGs = document.querySelectorAll('.illus-svg');
  if (illusSVGs.length) {
    if (reducedMotion) {
      illusSVGs.forEach(el => el.classList.add('drawn'));
    } else {
      const illusIO = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('drawn'); illusIO.unobserve(e.target); }
        }),
        { threshold: 0.12, rootMargin: '0px 0px -20px 0px' }
      );
      illusSVGs.forEach(el => illusIO.observe(el));
    }
  }

  /* ── Hero video seamless crossfade loop ── */
  (function () {
    const wrap = document.querySelector('.hero-video-col');
    if (!wrap) return;
    const v1 = wrap.querySelector('video');
    if (!v1) return;
    v1.loop = false;
    const v2 = v1.cloneNode(true);
    v2.removeAttribute('autoplay');
    v2.loop = false;
    v2.style.opacity = '0';
    wrap.appendChild(v2);
    const FADE = 0.55;
    let active = v1, next = v2, crossing = false;
    function swap() {
      if (crossing) return;
      crossing = true;
      next.currentTime = 0;
      next.play().catch(() => {});
      active.style.transition = 'opacity 0.5s linear';
      next.style.transition   = 'opacity 0.5s linear';
      active.style.opacity = '0';
      next.style.opacity   = '1';
      setTimeout(() => { active.pause(); [active, next] = [next, active]; crossing = false; }, 520);
    }
    function monitor() {
      if (this.duration && !crossing && this.currentTime >= this.duration - FADE) swap();
    }
    v1.addEventListener('timeupdate', monitor);
    v2.addEventListener('timeupdate', monitor);
  })();

  /* ── Hero-only scroll lock ──
     Locks the viewport on the hero section; on the first downward
     scroll past it, removes the lock and lets the page scroll freely. */
  (function () {
    const stage = document.getElementById('scroll-stage');
    if (!stage || reducedMotion) return;

    const hero = stage.querySelector(':scope > .slide');
    if (!hero) return;

    document.documentElement.classList.add('scrolljack');

    // Immediately reveal hero elements
    requestAnimationFrame(function () {
      hero.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    });

    let released = false;
    let cooldown = false;

    function atHeroBottom() {
      return Math.ceil(hero.scrollTop + hero.clientHeight) >= hero.scrollHeight;
    }
    function heroScrollable() {
      return hero.scrollHeight > hero.clientHeight + 4;
    }

    function release() {
      if (released) return;
      released = true;
      document.documentElement.classList.remove('scrolljack');
    }

    function tryRelease() {
      if (released) return;
      if (heroScrollable() && !atHeroBottom()) return;
      release();
    }

    window.addEventListener('wheel', function (e) {
      if (released) return;
      if (Math.abs(e.deltaY) < 4) return;
      const needsNative = heroScrollable() && (
        (e.deltaY > 0 && !atHeroBottom()) || (e.deltaY < 0 && hero.scrollTop > 0)
      );
      if (needsNative) return;
      e.preventDefault();
      if (e.deltaY > 0 && !cooldown) {
        cooldown = true;
        setTimeout(function () { cooldown = false; }, 60);
        tryRelease();
      }
    }, { passive: false });

    let touchStartY = 0;
    window.addEventListener('touchstart', function (e) {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (released) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (Math.abs(dy) < 40) return;
      const needsNative = heroScrollable() && (
        (dy > 0 && !atHeroBottom()) || (dy < 0 && hero.scrollTop > 0)
      );
      if (needsNative) return;
      e.preventDefault();
      if (dy > 0) tryRelease();
    }, { passive: false });

    window.addEventListener('keydown', function (e) {
      if (released) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); tryRelease(); }
    });
  })();

  /* ── Navbar: transparent over hero, active links, progress, hamburger ── */
  (function () {
    var nav         = document.getElementById('site-nav');
    var progressBar = document.getElementById('nav-progress');
    var hamburger   = document.getElementById('nav-hamburger');
    var mobileMenu  = document.getElementById('nav-links');
    if (!nav) return;

    var sectionIds = ['about', 'team', 'gallery', 'testimonials', 'find-us'];
    var currentKey = '';

    function setActive(key) {
      currentKey = key;
      var isHero = key === '';
      nav.classList.toggle('nav-hero', isHero);
      progressBar.style.width = isHero ? '0%'
        : ((sectionIds.indexOf(key) + 1) / sectionIds.length * 100) + '%';
      nav.querySelectorAll('.nav-link').forEach(function (link) {
        link.classList.toggle('active', link.dataset.nav === key);
      });
    }

    // Hero visibility: watch #scroll-stage leaving viewport
    var stage = document.getElementById('scroll-stage');
    if (stage) {
      var heroObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            setActive('');
          }
        });
      }, { threshold: 0.05 });
      heroObs.observe(stage);
    }

    // Section visibility: watch each non-hero section
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { threshold: 0.35 });

    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionObs.observe(el);
    });

    setActive('');

    // Hamburger toggle
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', function () {
        var open = mobileMenu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
        hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      mobileMenu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          mobileMenu.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.setAttribute('aria-label', 'Open menu');
        });
      });
    }
  })();

  /* ── Smooth scroll for hash links ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      // If hero lock is still active, release it first
      if (document.documentElement.classList.contains('scrolljack')) {
        document.documentElement.classList.remove('scrolljack');
      }
      setTimeout(function () {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  });

})();
