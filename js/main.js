/* ============================================================
   HOT GUYS — Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ── Scroll reveal ── */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }

  /* ── Animated illustration draw-on observer ── */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const illusSVGs = document.querySelectorAll('.illus-svg');
  if (illusSVGs.length) {
    if (reducedMotion) {
      illusSVGs.forEach(el => el.classList.add('drawn'));
    } else {
      const illusIO = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('drawn');
            illusIO.unobserve(e.target);
          }
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
      setTimeout(() => {
        active.pause();
        [active, next] = [next, active];
        crossing = false;
      }, 520);
    }

    function monitor() {
      if (this.duration && !crossing && this.currentTime >= this.duration - FADE) {
        swap();
      }
    }

    v1.addEventListener('timeupdate', monitor);
    v2.addEventListener('timeupdate', monitor);
  })();

  /* ── Sectional scroll lock (pin + play) ──
     Each top-level section is a full-screen "slide". Scrolling past one
     pins it, lets its reveal/illustration animations finish, then
     releases to advance. Falls back to normal document scroll entirely
     when reduced motion is requested or the stage isn't present. */
  const scrollJack = (function () {
    const stage = document.getElementById('scroll-stage');
    if (!stage || reducedMotion) return { active: false };

    const slides = Array.from(stage.querySelectorAll(':scope > .slide'));
    if (slides.length < 2) return { active: false };

    const DEFAULT_LOCK = 900;
    const TRANSFORM_MS = 850;
    let current = 0;
    let locked = false;
    let lockTimer = null;

    document.documentElement.classList.add('scrolljack');

    // IO callbacks are async; by the time they fire the slide already has
    // overflow-y:auto (a clipping ancestor) so the first slide's reveals
    // never get in-view. Force them immediately for the initial slide.
    requestAnimationFrame(function () {
      slides[0].querySelectorAll('.reveal').forEach(function (el) {
        el.classList.add('in-view');
      });
    });

    function place(index, animate) {
      if (!animate) stage.style.transition = 'none';
      stage.style.transform = 'translateY(-' + (index * 100) + 'svh)';
      if (!animate) {
        // Force reflow so the transition-less jump actually applies before re-enabling it
        void stage.offsetHeight;
        stage.style.transition = '';
      }
    }

    function fireEnter(slide) {
      slide.dispatchEvent(new CustomEvent('slideenter', { bubbles: true }));
    }
    function fireSettled(slide) {
      slide.dispatchEvent(new CustomEvent('slidesettled', { bubbles: true }));
    }

    function goTo(index, opts) {
      index = Math.max(0, Math.min(slides.length - 1, index));
      if (index === current) return;
      const immediate = opts && opts.immediate;
      current = index;
      place(current, !immediate);
      fireEnter(slides[current]);
      if (immediate) {
        fireSettled(slides[current]);
      } else {
        locked = true;
        const lockMs = parseInt(slides[current].dataset.lock, 10) || DEFAULT_LOCK;
        clearTimeout(lockTimer);
        lockTimer = setTimeout(() => {
          locked = false;
          fireSettled(slides[current]);
        }, Math.max(TRANSFORM_MS, lockMs));
      }
    }

    function slideOverflow(slide) {
      return slide.scrollHeight > slide.clientHeight + 4;
    }
    function atTop(slide) { return slide.scrollTop <= 0; }
    function atBottom(slide) { return Math.ceil(slide.scrollTop + slide.clientHeight) >= slide.scrollHeight; }

    function tryAdvance(dir) {
      if (locked) return;
      const slide = slides[current];
      if (dir > 0) {
        if (slideOverflow(slide) && !atBottom(slide)) return; // let it scroll internally first
        goTo(current + 1);
      } else {
        if (slideOverflow(slide) && !atTop(slide)) return;
        goTo(current - 1);
      }
    }

    let wheelCooldown = false;
    window.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) < 4) return;
      const slide = slides[current];
      const needsNative = slideOverflow(slide) && (
        (e.deltaY > 0 && !atBottom(slide)) || (e.deltaY < 0 && !atTop(slide))
      );
      if (needsNative) return; // allow native in-slide scroll
      e.preventDefault();
      if (locked || wheelCooldown) return;
      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 60);
      tryAdvance(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    let touchStartY = 0;
    let touchActive = false;
    window.addEventListener('touchstart', function (e) {
      touchStartY = e.touches[0].clientY;
      touchActive = true;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!touchActive) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (Math.abs(dy) < 40) return;
      const slide = slides[current];
      const dir = dy > 0 ? 1 : -1;
      const needsNative = slideOverflow(slide) && (
        (dir > 0 && !atBottom(slide)) || (dir < 0 && !atTop(slide))
      );
      if (needsNative) return;
      e.preventDefault();
      if (locked) return;
      touchActive = false;
      tryAdvance(dir);
    }, { passive: false });

    window.addEventListener('keydown', function (e) {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); tryAdvance(1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp')     { e.preventDefault(); tryAdvance(-1); }
    });

    // Keep keyboard-focused content visible when tabbing between slides
    stage.addEventListener('focusin', function (e) {
      const slide = e.target.closest ? e.target.closest('.slide') : null;
      if (!slide) return;
      const idx = slides.indexOf(slide);
      if (idx !== -1 && idx !== current) goTo(idx, { immediate: true });
    });

    window.addEventListener('resize', function () { place(current, false); });

    place(0, false);

    return {
      active: true,
      goToElement(el) {
        const slide = el.closest('.slide');
        if (!slide) return false;
        const idx = slides.indexOf(slide);
        if (idx === -1) return false;
        goTo(idx);
        return true;
      }
    };
  })();

  /* ── Smooth scroll for hash links on same page ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (scrollJack.active && scrollJack.goToElement(target)) {
        // Move focus into the destination slide so the clicked link
        // (which keeps native focus) doesn't fight the focus-tracking
        // handler and pull the view back to where it was.
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── Navbar: transparent-over-hero, active links, progress, hamburger ── */
  (function () {
    var nav         = document.getElementById('site-nav');
    var progressBar = document.getElementById('nav-progress');
    var hamburger   = document.getElementById('nav-hamburger');
    var mobileMenu  = document.getElementById('nav-links');
    if (!nav) return;

    // Slide index → data-nav value for active highlighting
    var slideNavMap = ['', 'about', 'process', 'team', 'testimonials', 'find-us'];
    var allSlides   = Array.from(document.querySelectorAll('#scroll-stage > .slide'));
    var totalSlides = allSlides.length;
    var currentIdx  = 0;

    function setActive(idx) {
      currentIdx = idx;
      var activeKey = slideNavMap[idx] || '';

      // Transparent only over hero (slide 0)
      nav.classList.toggle('nav-hero', idx === 0);

      // Progress bar
      var pct = totalSlides > 1 ? (idx / (totalSlides - 1)) * 100 : 0;
      progressBar.style.width = pct + '%';

      // Active nav link underline
      nav.querySelectorAll('.nav-link').forEach(function (link) {
        link.classList.toggle('active', link.dataset.nav === activeKey);
      });
    }

    // Listen to scroll-jack slide changes
    document.addEventListener('slideenter', function (e) {
      var idx = allSlides.indexOf(e.target);
      if (idx !== -1) setActive(idx);
    });

    // Initialise to hero state
    setActive(0);

    // Hamburger toggle
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', function () {
        var open = mobileMenu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
        hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });

      // Close menu when a link is tapped
      mobileMenu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          mobileMenu.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.setAttribute('aria-label', 'Open menu');
        });
      });
    }
  })();

})();
