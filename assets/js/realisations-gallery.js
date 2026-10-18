/* Préparation uniquement : aucune galerie activée sans images validées.
 * Clé : valeur data-image de la carte. Valeur : [{src, alt}, ...].
 * Renseigner au moins deux images pour activer un diaporama.
 */
(() => {
  const galleries = {};
  if (!Object.keys(galleries).length) return;
  const dialog = document.querySelector('dialog.lightbox');
  if (!dialog) return;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  const controls = document.createElement('div');
  controls.className = 'gallery-controls';
  controls.hidden = true;
  controls.innerHTML = '<button type="button" aria-label="Image précédente">←</button><span aria-live="polite"></span><button type="button" aria-label="Image suivante">→</button><button type="button">Lecture automatique</button>';
  dialog.querySelector('.lightbox-frame').append(controls);
  const [previous, next, play] = controls.querySelectorAll('button');
  const counter = controls.querySelector('span');
  let slides = [], index = 0, timer = null, trigger = null, startX = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function stop() {
    clearInterval(timer);
    timer = null;
    play.textContent = 'Lecture automatique';
    play.setAttribute('aria-pressed', 'false');
  }
  function render(step = 0) {
    index = (index + step + slides.length) % slides.length;
    image.src = slides[index].src;
    image.alt = slides[index].alt;
    caption.textContent = slides[index].alt;
    counter.textContent = `${index + 1} / ${slides.length}`;
  }
  function start() {
    if (timer || document.hidden || !dialog.open) return;
    timer = setInterval(() => render(1), 5000);
    play.textContent = 'Mettre en pause';
    play.setAttribute('aria-pressed', 'true');
  }
  function manual(step) { stop(); render(step); }
  previous.addEventListener('click', () => manual(-1));
  next.addEventListener('click', () => manual(1));
  play.addEventListener('click', () => timer ? stop() : start());
  dialog.addEventListener('keydown', event => {
    if (controls.hidden || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    manual(event.key === 'ArrowLeft' ? -1 : 1);
  });
  image.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, {passive: true});
  image.addEventListener('touchend', event => {
    if (startX === null) return;
    const delta = event.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(delta) > 50) manual(delta < 0 ? 1 : -1);
  }, {passive: true});
  image.addEventListener('touchcancel', () => { startX = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  dialog.addEventListener('close', () => {
    stop();
    controls.hidden = true;
    trigger?.focus();
  });
  document.addEventListener('click', event => {
    const card = event.target.closest('.portfolio-card');
    const configured = card && galleries[card.dataset.image];
    if (!configured || configured.length < 2) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    trigger = card;
    slides = configured;
    index = 0;
    stop();
    render();
    controls.hidden = false;
    dialog.showModal();
    if (!reducedMotion.matches) start();
  }, true);
})();
