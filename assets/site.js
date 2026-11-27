/* Mik Zid Villa — shared behaviour
   One IIFE, every block feature-detected so the page only runs what it has.
   Single night theme: no theme switching. */
(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- preloader ----------
     Only present when <head> added .preload (cold open or reload). Hidden
     once the page has loaded, with a safety net so it can never stick. */
  var preloader = document.getElementById('preloader');
  if (preloader && root.classList.contains('preload')) {
    var hidden = false;
    var hidePreloader = function () {
      if (hidden) return;
      hidden = true;
      setTimeout(function () {
        preloader.classList.add('is-hidden');
        setTimeout(function () {
          root.classList.remove('preload');
          if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, prefersReduced ? 0 : 550);
      }, prefersReduced ? 0 : 600);
    };
    var loaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(function (resolve) { window.addEventListener('load', resolve, { once: true }); });
    var safetyNet = new Promise(function (resolve) { setTimeout(resolve, 4000); });
    Promise.race([loaded, safetyNet]).then(hidePreloader);
  } else if (preloader && preloader.parentNode) {
    preloader.parentNode.removeChild(preloader);
  }

  /* ---------- soft in-page scrolling (respects reduced motion) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('site-menu');
  if (toggle && menu) {
    var setOpen = function (open) {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
  }

  /* ---------- nav: condense on scroll; FAB hides near the top and footer ---------- */
  var nav = document.querySelector('.site-nav');
  var fab = document.querySelector('.fab');
  var footer = document.querySelector('.site-footer');
  var ticking = false;
  var onScroll = function () {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('is-condensed', y > 24);
    if (fab) {
      var nearFooter = footer && footer.getBoundingClientRect().top < window.innerHeight - 40;
      fab.classList.toggle('is-hidden', y < 320 || nearFooter);
    }
  };
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- scroll reveal ---------- */
  var revealTargets = document.querySelectorAll(
    'main .section-head, main .pair figure, main .space, main .reel, main .uses > div, main .gallery__item, main .form-card'
  );
  if (hasIO && !prefersReduced) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); rio.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    each(revealTargets, function (el) {
      if (el.closest('.hero')) return;
      el.classList.add('reveal');
      /* small stagger for siblings in the same grid */
      var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 5) * 60 + 'ms';
      rio.observe(el);
    });
  }

  /* ---------- gallery lightbox ----------
     Tiles are plain links to the photos; where <dialog> is supported they
     open in the viewer instead. Arrow keys and swipes move between photos. */
  var gallery = document.querySelector('[data-gallery]');
  var box = document.getElementById('lightbox');
  if (gallery && box && typeof box.showModal === 'function') {
    var items = Array.prototype.slice.call(gallery.querySelectorAll('.gallery__item'));
    var boxImg = box.querySelector('.lightbox__img');
    var boxCap = box.querySelector('.lightbox__caption');
    var boxCount = box.querySelector('.lightbox__count');
    var current = 0;
    var showPhoto = function (n) {
      current = (n + items.length) % items.length;
      var link = items[current];
      var thumb = link.querySelector('img');
      var label = link.querySelector('span');
      boxImg.src = link.getAttribute('href');
      boxImg.alt = thumb ? thumb.alt : '';
      boxCap.textContent = label ? label.textContent : '';
      boxCount.textContent = (current + 1) + ' / ' + items.length;
    };
    gallery.addEventListener('click', function (e) {
      var link = e.target.closest('.gallery__item');
      if (!link) return;
      e.preventDefault();
      showPhoto(items.indexOf(link));
      box.showModal();
    });
    box.querySelector('.lightbox__prev').addEventListener('click', function () { showPhoto(current - 1); });
    box.querySelector('.lightbox__next').addEventListener('click', function () { showPhoto(current + 1); });
    box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') showPhoto(current - 1);
      else if (e.key === 'ArrowRight') showPhoto(current + 1);
    });
    var touchX = null;
    box.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showPhoto(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });
    box.addEventListener('close', function () { items[current].focus(); });
  }

  /* ---------- footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
