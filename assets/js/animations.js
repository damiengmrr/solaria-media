/* Adds only entry/scroll motion to the untouched original page elements. */
(()=>{
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced||!('IntersectionObserver' in window))return;
  const selectors=[
    '.home-hero-copy .hero-location', '.home-hero-copy h1', '.home-hero-copy > p',
    '.home-hero-copy .actions', '.home-hero-art img',
    '.intro-strip > p', '.intro-strip > div', '.section-topline',
    '.agency-highlight-visual', '.campaign-image img', '.closing-cta .wrap',
    '.page-hero-copy', '.page-hero-art', '.agency-mission h2', '.mission-detail',
    '.process-heading', '.audience-section > div:first-child', '.location-flex',
    '.expert-intro', '.work-intro > div', '.portfolio-controls',
    '.portfolio-next > *', '.contact-intro', '.form-panel', '.contact-bottom-inner'
  ];
  const targets=[...document.querySelectorAll(selectors.join(','))]
    .filter(el=>!el.classList.contains('reveal-on-view'));
  const watcher=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('solaria-motion-seen');
        watcher.unobserve(entry.target);
      }
    });
  },{rootMargin:'0px 0px 65px 0px', threshold:.04});
  targets.forEach((el,i)=>{
    el.classList.add('solaria-motion-target');
    el.style.setProperty('--solaria-delay', `${Math.min((i%5)*65,260)}ms`);
    watcher.observe(el);
  });
  document.documentElement.classList.add('solaria-motion-ready');
})();
