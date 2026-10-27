/* Hira Baqar portfolio: small, dependency-free helpers.
   Page still works if this file fails to load. */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.add('js');

  /* footer year */
  var yr = d.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* mobile menu */
  var btn = d.querySelector('.nav-toggle');
  var menu = d.getElementById('menu');
  function closeMenu() {
    if (!menu || !btn) return;
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
  }
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });
  }

  /* image preview (lightbox) */
  var lb = d.querySelector('.lightbox');
  var lbImg = lb && lb.querySelector('img');
  var lastFocus = null;
  function openLb(img) {
    lastFocus = img;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lb.hidden = false;
    d.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  }
  function closeLb() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    lbImg.removeAttribute('src');
    d.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  if (lb) {
    d.querySelectorAll('main img').forEach(function (img) {
      if (img.closest('.icons') || img.classList.contains('logo')) return;
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'View larger: ' + img.alt);
      img.addEventListener('click', function () { openLb(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img); }
      });
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb-close')) closeLb();
    });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLb(); closeMenu(); }
  });

  /* scroll reveal + active menu link */
  var hasIO = 'IntersectionObserver' in window;
  var blocks = d.querySelectorAll('section h2, .about-text, .exp, .grid4, .certs, .samples, .pair, .learn, .icons, .project, .social, .card, .prices');
  blocks.forEach(function (el) { el.classList.add('reveal'); });
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        if (it.isIntersecting) { it.target.classList.add('in'); io.unobserve(it.target); }
      });
    }, { threshold: 0.12 });
    blocks.forEach(function (el) { io.observe(el); });
  } else {
    blocks.forEach(function (el) { el.classList.add('in'); });
  }

  var links = d.querySelectorAll('.topbar nav a');
  if (hasIO && links.length) {
    var spy = new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        if (!it.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + it.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    d.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  }
})();
