/* ============================================================
   TEAM INNOVATION — script.js
   Vanilla JS only. No jQuery. No Owl Carousel.

   Original logic preserved exactly:
     • Hero video custom loop (start at 10s, stop 6s before end)
     • Hamburger menu toggle
     • p_g5 artist parallax on mousemove

   Owl Carousel replaced with:
     • createCarousel() — infinite loop, center mode, autoplay,
       dots, prev/next, touch drag, responsive item counts
   ============================================================ */


/* ─────────────────────────────────────────────────────────────
   HERO VIDEO — exact same logic as original script.js
───────────────────────────────────────────────────────────── */
const video = document.getElementById('videoti');

if (video) {
  video.addEventListener('loadedmetadata', () => {
    video.currentTime = 10;
    const stopTime = video.duration - 6;
    video.play();

    video.addEventListener('timeupdate', () => {
      if (video.currentTime >= stopTime) {
        video.currentTime = 10;
        video.play();
      }
    });
  });
}


/* ─────────────────────────────────────────────────────────────
   HAMBURGER MENU — exact same logic as original script.js
───────────────────────────────────────────────────────────── */
const hamburger = document.querySelector('.hamburger');
const sidemenu = document.querySelector('.sidemenu');

if (hamburger && sidemenu) {
  sidemenu.style.top = '-120%';

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    sidemenu.style.top = sidemenu.style.top === '-120%' ? '1rem' : '-120%';
  });
}


/* ─────────────────────────────────────────────────────────────
   P_G5 PARALLAX — exact same logic as original script.js
───────────────────────────────────────────────────────────── */
const pg5 = document.querySelector('.p_g5');

if (pg5) {
  pg5.addEventListener('mousemove', function (e) {
    const mouseX = (e.clientX / this.offsetWidth) - 0.5;
    const mouseY = (e.clientY / this.offsetHeight) - 0.5;
    document.querySelectorAll('.move').forEach(el => {
      el.style.transform = `translate(${mouseX * 30}px, ${mouseY * 30}px)`;
    });
  });
}


/* ─────────────────────────────────────────────────────────────
   VANILLA CAROUSEL
   Replaces Owl Carousel entirely. Matches owl config exactly:

   .loop (Upcoming Shows)
     center: true  |  margin: 30px  |  loop: true
     autoplay: 5000ms  |  autoplayHoverPause: true
     responsive: { 0: 1.25,  600: 2,  1000: 1.5 }

   .nonloop (Past Events)
     center: true  |  margin: 20px  |  loop: true
     autoplay: 5000ms  |  autoplayHoverPause: true
     responsive: { 0: 1.5,  600: 1.5,  1000: 2,  1600: 2 }
───────────────────────────────────────────────────────────── */

/**
 * createCarousel(options)
 *
 * Builds a fully functional infinite-loop carousel, pixel-for-pixel
 * matching Owl Carousel's centre-mode output.
 *
 * @param {string}  stageId     id of the flex-row track element (.loop / .nonloop)
 * @param {string}  dotsId      id of the .ti-dots container
 * @param {string}  prevId      id of the .prev-slide element
 * @param {string}  nextId      id of the .next-slide element
 * @param {number}  margin      gap between items in px  (owl "margin")
 * @param {boolean} center      centre-mode: active item centred, partial items on sides
 * @param {boolean} loop        infinite loop
 * @param {number}  autoplayMs  autoplay interval in ms  (0 = disabled)
 * @param {Object}  responsive  breakpoint→itemCount map  { minWidth: count, … }
 */
function createCarousel({ stageId, dotsId, prevId, nextId,
                           margin = 20, center = true, loop = true,
                           autoplayMs = 5000, responsive = {} }) {

  const stage    = document.getElementById(stageId);
  const dotsWrap = document.getElementById(dotsId);
  const prevBtn  = document.getElementById(prevId);
  const nextBtn  = document.getElementById(nextId);

  if (!stage) return;

  /* ── collect original real items ── */
  const realItems = Array.from(stage.children);
  const realCount = realItems.length;
  if (realCount === 0) return;

  /* ── state ── */
  let currentIndex  = 0;
  let isDragging    = false;
  let dragStartX    = 0;
  let dragDeltaX    = 0;
  let autoplayTimer = null;
  let isHovered     = false;
  let clonesBefore  = 0;

  /* ── how many items visible at current viewport width ── */
  function getVisible() {
    const w = window.innerWidth;
    const sorted = Object.keys(responsive).map(Number).sort((a, b) => b - a);
    for (const bp of sorted) {
      if (w >= bp) return responsive[bp];
    }
    return responsive[Math.min(...Object.keys(responsive).map(Number))] || 1;
  }

  /* ── item width in px ── */
  function getItemWidth() {
    const visible    = getVisible();
    const outerWidth = stage.parentElement
      ? stage.parentElement.offsetWidth
      : window.innerWidth;
    return (outerWidth - margin * (Math.ceil(visible) - 1)) / visible;
  }

  /* ── rebuild clones for seamless infinite loop ── */
  function buildClones() {
    stage.querySelectorAll('.ti-clone').forEach(c => c.remove());

    /* append clones of first N items at end */
    realItems.forEach(item => {
      const clone = item.cloneNode(true);
      clone.classList.add('ti-clone');
      stage.appendChild(clone);
    });
    /* prepend clones of last N items at start */
    for (let i = realCount - 1; i >= 0; i--) {
      const clone = realItems[i].cloneNode(true);
      clone.classList.add('ti-clone');
      stage.insertBefore(clone, stage.firstChild);
    }
    clonesBefore = realCount;
  }

  /* ── size every item (real + clones) ── */
  function sizeItems() {
    const iw = getItemWidth();
    Array.from(stage.children).forEach(item => {
      item.style.width       = iw + 'px';
      item.style.flexShrink  = '0';
      item.style.marginRight = margin + 'px';
    });
  }

  /* ── pixel offset for a given total index ── */
  function getOffset(totalIdx) {
    const iw   = getItemWidth();
    const step = iw + margin;
    if (center) {
      const outer        = stage.parentElement ? stage.parentElement.offsetWidth : window.innerWidth;
      const centreOffset = (outer / 2) - (iw / 2);
      return totalIdx * step - centreOffset;
    }
    return totalIdx * step;
  }

  /* ── total index = clonesBefore + currentIndex ── */
  function totalIdx() { return clonesBefore + currentIndex; }

  /* ── apply CSS transform (animated or instant) ── */
  function applyTranslate(offset, animate) {
    stage.style.transition = animate ? 'transform 0.35s ease' : 'none';
    stage.style.transform  = `translateX(${-offset}px)`;
  }

  /* ── after transition: silently jump if inside clone territory ── */
  stage.addEventListener('transitionend', () => {
    const ti = totalIdx();
    if (ti < clonesBefore || ti >= clonesBefore + realCount) {
      currentIndex = ((currentIndex % realCount) + realCount) % realCount;
      applyTranslate(getOffset(totalIdx()), false);
    }
  });

  /* ── navigate to a logical index ── */
  function goTo(index, animate) {
    if (animate === undefined) animate = true;
    currentIndex = loop
      ? ((index % realCount) + realCount) % realCount
      : Math.max(0, Math.min(index, realCount - 1));
    applyTranslate(getOffset(totalIdx()), animate);
    updateDots();
  }

  /* ── build dot buttons ── */
  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (let i = 0; i < realCount; i++) {
      const dot = document.createElement('button');
      dot.className = 'ti-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', () => { goTo(i); resetAutoplay(); });
      dotsWrap.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsWrap) return;
    Array.from(dotsWrap.children).forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  /* ── prev / next buttons ── */
  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(currentIndex - 1); resetAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(currentIndex + 1); resetAutoplay(); });

  /* ── autoplay ── */
  function startAutoplay() {
    if (!autoplayMs || isHovered) return;
    autoplayTimer = setInterval(() => goTo(currentIndex + 1), autoplayMs);
  }
  function stopAutoplay()  { clearInterval(autoplayTimer); autoplayTimer = null; }
  function resetAutoplay() { stopAutoplay(); startAutoplay(); }

  /* pause on hover (matches owl autoplayHoverPause:true) */
  const crsl = stage.closest('.crsl');
  if (crsl) {
    crsl.addEventListener('mouseenter', () => { isHovered = true;  stopAutoplay(); });
    crsl.addEventListener('mouseleave', () => { isHovered = false; startAutoplay(); });
  }

  /* ── touch / mouse drag ── */
  function onDragStart(x) {
    isDragging = true; dragStartX = x; dragDeltaX = 0;
    stopAutoplay();
    stage.style.transition = 'none';
  }
  function onDragMove(x) {
    if (!isDragging) return;
    dragDeltaX = x - dragStartX;
    applyTranslate(getOffset(totalIdx()) - dragDeltaX, false);
  }
  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    const threshold = getItemWidth() * 0.25;
    if      (dragDeltaX < -threshold) goTo(currentIndex + 1);
    else if (dragDeltaX >  threshold) goTo(currentIndex - 1);
    else                              goTo(currentIndex);
    resetAutoplay();
  }

  stage.addEventListener('mousedown',  e  => { onDragStart(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', e  => { if (isDragging) onDragMove(e.clientX); });
  window.addEventListener('mouseup',   () => { if (isDragging) onDragEnd(); });

  stage.addEventListener('touchstart', e  => onDragStart(e.touches[0].clientX), { passive: true });
  stage.addEventListener('touchmove',  e  => { if (isDragging) onDragMove(e.touches[0].clientX); }, { passive: true });
  stage.addEventListener('touchend',   () => { if (isDragging) onDragEnd(); });

  /* ── initialise ── */
  function init() {
    buildClones();
    sizeItems();
    buildDots();
    applyTranslate(getOffset(totalIdx()), false);
    startAutoplay();
  }
  init();

  /* ── re-initialise on resize ── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      stopAutoplay();
      buildClones();
      sizeItems();
      applyTranslate(getOffset(totalIdx()), false);
      startAutoplay();
    }, 150);
  });
}


/* ─────────────────────────────────────────────────────────────
   INIT — matches original owlCarousel() configs exactly
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Upcoming Shows (.loop)
     owl config: margin:30, center:true, loop:true, autoplay:5000
     responsive: { 0:1.25, 600:2, 1000:1.5 }                     */
  createCarousel({
    stageId    : 'loopStage',
    dotsId     : 'loopDots',
    prevId     : 'loopPrev',
    nextId     : 'loopNext',
    margin     : 30,
    center     : true,
    loop       : true,
    autoplayMs : 5000,
    responsive : { 0: 1.25, 600: 2, 1000: 1.5 }
  });

  /* Past Events (.nonloop)
     owl config: margin:20, center:true, loop:true, autoplay:5000
     responsive: { 0:1.5, 600:1.5, 1000:2, 1600:2 }              */
  createCarousel({
    stageId    : 'nonloopStage',
    dotsId     : 'nonloopDots',
    prevId     : 'nonloopPrev',
    nextId     : 'nonloopNext',
    margin     : 20,
    center     : true,
    loop       : true,
    autoplayMs : 5000,
    responsive : { 0: 1.5, 600: 1.5, 1000: 2, 1600: 2 }
  });

});