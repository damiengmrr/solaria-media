
(()=>{
 const names=['index','agence','expertises','realisations','contact'];
 const pageTitles={index:'Solaria Media | Accueil',agence:'Solaria Media | L’agence',expertises:'Solaria Media | Expertises',realisations:'Solaria Media | Réalisations',contact:'Solaria Media | Contact'};
 const views=document.querySelectorAll('[data-view]');
 function show(name,anchor='',project='',updateHistory=true){
  if(!names.includes(name))name='index';
  const swapView=()=>{views.forEach(v=>v.hidden=v.dataset.view!==name)};
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(updateHistory && !reduceMotion && typeof document.startViewTransition==='function'){
   document.startViewTransition(swapView);
  }else{
   swapView();
   if(updateHistory && !reduceMotion){
    const entered=[...views].find(v=>v.dataset.view===name);
    entered?.animate?.([{opacity:.72,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
   }
  }
  document.querySelectorAll('.nav-desktop a,.nav-mobile a').forEach(a=>{const active=a.getAttribute('href')===name+'.html';a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  document.title=pageTitles[name];
  const mob=document.getElementById('nav-mobile');if(mob){mob.hidden=true;const btn=document.querySelector('.menu-toggle');btn?.setAttribute('aria-expanded','false');btn?.setAttribute('aria-label','Ouvrir le menu')}
  if(project){const select=document.querySelector('#project');if(select?.querySelector('option[value="'+project+'"]'))select.value=project}
  if(updateHistory)history.pushState({name,anchor,project},'', '#/'+name+(anchor?'/'+encodeURIComponent(anchor):''));
  window.scrollTo({top:0,behavior:'instant'});
  if(anchor)setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'start'}),80);
 }
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  const raw=a.getAttribute('href');const m=/^(index|agence|expertises|realisations|contact)\.html(?:\?([^#]*))?(?:#(.+))?$/.exec(raw||'');
  if(!m)return;
  e.preventDefault();let project='';if(m[2])project=new URLSearchParams(m[2]).get('projet')||'';
  show(m[1],m[3]||'',project);
 });
 window.addEventListener('popstate',()=>{
  const m=/^#\/(index|agence|expertises|realisations|contact)(?:\/(.+))?$/.exec(location.hash);
  show(m?.[1]||'index',decodeURIComponent(m?.[2]||''),'',false);
 });
 const m=/^#\/(index|agence|expertises|realisations|contact)(?:\/(.+))?$/.exec(location.hash);
 if(m)show(m[1],decodeURIComponent(m[2]||''),'',false);
 else{
  const path=location.pathname.match(/\/(index|agence|expertises|realisations|contact)\.html$/);
  if(path&&path[1]!=='index')show(path[1],'','',false);
 }
})();
