/* Navigation entre les cinq vues.
   Comportement d'origine conservé : une seule maquette, vues [data-view],
   URL en #/vue, titres, menu mobile, présélection ?projet=. La mise en
   scène des passages est confiée à SolariaMotion lorsqu'il est disponible.
   Corrections (voir MOTION_CHANGELOG.md) : les ancres internes (#digital,
   #notre-approche, #haut, #contenu) ne renvoient plus vers l'accueil, le
   retour arrière vers une page ouverte par son chemin affiche la bonne vue,
   les URL sans « .html » (Netlify) sont reconnues. */
(()=>{
 const names=['index','agence','expertises','realisations','contact'];
 const pageTitles={index:'Solaria Media | Accueil',agence:'Solaria Media | L’agence',expertises:'Solaria Media | Expertises',realisations:'Solaria Media | Réalisations',contact:'Solaria Media | Contact'};
 const views=document.querySelectorAll('[data-view]');
 const ROUTE=/^#\/(index|agence|expertises|realisations|contact)(?:\/(.+))?$/;
 const PATH=/\/(index|agence|expertises|realisations|contact)(?:\.html)?\/?$/;
 const motion=window.SolariaMotion&&!window.SolariaMotion.env.reduced?window.SolariaMotion:null;
 const pathView=()=>(PATH.exec(location.pathname)||[])[1]||'index';
 const visible=()=>([...views].find(v=>!v.hidden)||{dataset:{view:'index'}}).dataset.view;
 const byId=id=>{try{return id&&document.getElementById(decodeURIComponent(id))}catch(e){return null}};
 // Avec la mise en scène, la position de défilement est restituée après le
 // passage (et non sous l'ancienne vue) : on la mémorise dans l'historique.
 if(motion&&'scrollRestoration' in history)history.scrollRestoration='manual';
 const remember=()=>{if(motion)try{history.replaceState({...(history.state||{}),y:scrollY},'')}catch(e){}};

 function apply(name,project){
  views.forEach(v=>v.hidden=v.dataset.view!==name);
  document.querySelectorAll('.nav-desktop a,.nav-mobile a').forEach(a=>{const active=a.getAttribute('href')===name+'.html';a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  document.title=pageTitles[name];
  const mob=document.getElementById('nav-mobile');if(mob){mob.hidden=true;const btn=document.querySelector('.menu-toggle');btn?.setAttribute('aria-expanded','false');btn?.setAttribute('aria-label','Ouvrir le menu')}
  if(project){const select=document.querySelector('#project');if(select?.querySelector('option[value="'+project+'"]'))select.value=project}
 }
 // Les images (chargement différé) situées avant l'ancre peuvent la déplacer
 // en arrivant : on réaligne une fois qu'elles sont chargées.
 function afterImages(anchor,cap){
  const t=byId(anchor);if(!t)return null;
  const host=t.closest('[data-view]')||document;
  const imgs=[...host.querySelectorAll('img')].filter(i=>!i.complete&&(i.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING));
  if(!imgs.length)return null;
  const all=Promise.all(imgs.map(i=>new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})})));
  return Promise.race([all,new Promise(r=>setTimeout(r,cap))]).then(()=>t);
 }
 function land(anchor,y){
  window.scrollTo({top:0,behavior:'instant'});
  if(typeof y==='number'){window.scrollTo({top:y,behavior:'instant'});return}
  if(!anchor)return;
  if(motion){
   byId(anchor)?.scrollIntoView({behavior:'instant',block:'start'});
   return afterImages(anchor,1200)?.then(t=>t.scrollIntoView({behavior:'instant',block:'start'})); // sous le rideau
  }
  setTimeout(()=>byId(anchor)?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  afterImages(anchor,2500)?.then(t=>{if(Math.abs(t.getBoundingClientRect().top-95)>20)t.scrollIntoView({behavior:'smooth',block:'start'})});
 }
 function show(name,anchor='',project='',updateHistory=true,origin=null,y){
  if(!names.includes(name))name='index';
  const from=visible();
  if(updateHistory){remember();history.pushState({name,anchor,project},'', '#/'+name+(anchor?'/'+encodeURIComponent(anchor):''))}
  if(!motion){apply(name,project);land(anchor);return}
  if(from===name){
   // Même vue : pas de rideau, on glisse vers la cible.
   apply(name,project);
   const t=byId(anchor);
   if(typeof y==='number')window.scrollTo({top:y,behavior:'smooth'});
   else if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
   else window.scrollTo({top:0,behavior:'smooth'});
   return;
  }
  motion.navSlide(from,name);
  motion.go({from,to:name,origin,swap:()=>{apply(name,project);return land(anchor,y)}});
 }

 let fragClick=false;
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return; // ouverture dans un nouvel onglet
  const raw=a.getAttribute('href');
  if(raw&&raw[0]==='#'&&!ROUTE.test(raw)){
   const t=byId(raw.slice(1));
   if(t&&/sticky|fixed/.test(getComputedStyle(t).position)){
    // « Haut de page » vise le header collant, que le navigateur considère déjà visible.
    e.preventDefault();remember();history.pushState(motion?{y:0}:null,'',raw);
    window.scrollTo({top:0,behavior:motion?'smooth':'auto'});return;
   }
   remember();fragClick=true;setTimeout(()=>fragClick=false,60);return; // ancre interne : défilement natif
  }
  const m=/^(index|agence|expertises|realisations|contact)\.html(?:\?([^#]*))?(?:#(.+))?$/.exec(raw||'');
  if(!m)return;
  e.preventDefault();let project='';if(m[2])project=new URLSearchParams(m[2]).get('projet')||'';
  const r=a.getBoundingClientRect();
  const origin=(e.clientX||e.clientY)?{x:e.clientX,y:e.clientY}:{x:r.left+r.width/2,y:r.top+r.height/2};
  show(m[1],m[3]||'',project,true,origin);
 });

 window.addEventListener('popstate',e=>{
  const y=motion&&typeof e.state?.y==='number'?e.state.y:undefined;
  const m=ROUTE.exec(location.hash);
  if(m)return show(m[1],decodeURIComponent(m[2]||''),'',false,null,y);
  const id=location.hash.slice(1),target=byId(id);
  if(target){
   const host=target.closest('[data-view]');
   if(host&&host.hidden)return show(host.dataset.view,decodeURIComponent(id),'',false,null,y);
   if(fragClick){fragClick=false;return} // clic sur une ancre : le navigateur a déjà défilé
   if(motion){
    if(typeof y==='number')window.scrollTo({top:y,behavior:'instant'});
    else if(/sticky|fixed/.test(getComputedStyle(target).position))window.scrollTo({top:0,behavior:'instant'});
    else target.scrollIntoView({behavior:'instant',block:'start'});
   }
   return;
  }
  show(pathView(),'','',false,null,y);
 });

 // Vue initiale
 const m=ROUTE.exec(location.hash);
 let initial='index';
 if(m){initial=m[1];apply(initial,'');land(decodeURIComponent(m[2]||''))}
 else{
  const id=location.hash.slice(1),target=byId(id),host=target&&target.closest('[data-view]');
  initial=host?host.dataset.view:pathView();
  if(initial!=='index'){apply(initial,'');if(host)land(decodeURIComponent(id))}
 }
 if(motion){
  const intro=document.documentElement.classList.contains('sm-intro')&&initial==='index';
  motion.enter(initial,{mode:intro?'intro':window.__smLate?'late':'load',base:120});
  if(!intro)motion.liftEnterCurtain();
  else{
   // La cinématique n'est chargée que lorsqu'elle sera jouée (préchargée depuis <head>).
   const s=document.createElement('script');s.src='assets/js/cinematic-intro.js';
   s.onerror=()=>{document.documentElement.classList.remove('sm-intro');motion.hero.skip()};
   document.body.append(s);
  }
 }
})();
