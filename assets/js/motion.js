/* =====================================================================
   SOLARIA MEDIA — système de motion design
   « The design is locked. The motion is unlimited. »

   Principe : chaque mouvement est une animation Web Animations qui part
   d'un état temporaire et revient vers le rendu CSS d'origine. À la fin,
   l'animation est retirée : aucun style en ligne, aucune classe, aucun
   nœud ajouté ne subsiste. Les découpages de texte sont restaurés à
   l'identique. Sans JavaScript ou en mouvement réduit, le site original
   s'affiche tel quel.
   ===================================================================== */
(()=>{
'use strict';
const d=document, root=d.documentElement, w=window;
if(!('animate' in Element.prototype) || !w.IntersectionObserver) return;

/* ---------------------------------------------------------------- env */
const mq=q=>w.matchMedia(q);
const RM=mq('(prefers-reduced-motion: reduce)');
const FINE=mq('(hover:hover) and (pointer:fine)');
const SMALL=mq('(max-width:740px)');
const env={
  get reduced(){return RM.matches},
  get fine(){return FINE.matches},
  get small(){return SMALL.matches},
};
const $=(s,c=d)=>c.querySelector(s);
const $$=(s,c=d)=>[...c.querySelectorAll(s)];

/* ------------------------------------------------------------- easing
   Une seule famille de courbes : le « rayonnement » sort vite et se pose
   longuement (expo out), les passages de rideau sont symétriques. */
const linearOK=w.CSS&&CSS.supports&&CSS.supports('animation-timing-function','linear(0, 1)');
function spring(k,c){
  if(!linearOK) return {ease:'cubic-bezier(.34,1.4,.5,1)',dur:900};
  const w0=Math.sqrt(k),z=c/(2*w0),wd=w0*Math.sqrt(1-z*z),T=-Math.log(.002)/(z*w0),n=44,pts=[];
  for(let i=0;i<=n;i++){const t=T*i/n;pts.push((1-Math.exp(-z*w0*t)*(Math.cos(wd*t)+z*w0/wd*Math.sin(wd*t))).toFixed(4))}
  pts[n]='1';
  return {ease:`linear(${pts.join(',')})`,dur:Math.round(T*1000)};
}
const EASE={
  out:'cubic-bezier(.16,1,.3,1)',
  soft:'cubic-bezier(.25,1,.5,1)',
  inout:'cubic-bezier(.76,0,.24,1)',
  precise:'cubic-bezier(.83,0,.17,1)',
  in:'cubic-bezier(.55,0,.75,.2)',
};
const SPRING=spring(210,17), SPRING_SOFT=spring(120,15);

/* ------------------------------------------------------------ helpers */
function tempStyle(el,props){
  // instantané complet avant écriture : -webkit-mask-* et mask-* sont des alias
  const prev={};
  for(const k in props)prev[k]=el.style[k];
  for(const k in props)el.style[k]=props[k];
  let done=false;
  return ()=>{if(done)return;done=true;for(const k in prev)el.style[k]=prev[k];if(!el.getAttribute('style'))el.removeAttribute('style')};
}
// Positionnement relatif temporaire, partagé entre plusieurs effets simultanés.
const posCount=new WeakMap();
function pos(el){
  const n=posCount.get(el)||0;
  if(!n){el.__smPosUndo=getComputedStyle(el).position==='static'?tempStyle(el,{position:'relative'}):null}
  posCount.set(el,n+1);
  let done=false;
  return ()=>{if(done)return;done=true;const m=(posCount.get(el)||1)-1;posCount.set(el,m);if(!m){el.__smPosUndo?.();el.__smPosUndo=null}};
}
function addClass(el,c){el.classList.add(c)}
function rmClass(el,c){el.classList.remove(c);if(!el.classList.length)el.removeAttribute('class')}
function fx(tag,cls,parent){const n=d.createElement(tag);n.className=cls;n.setAttribute('aria-hidden','true');parent.append(n);return n}

/* -------------------------------------------------------------- scope
   Une scène = une vue. Tout ce qu'elle lance est annulable d'un coup. */
class Scope{
  constructor(name){this.name=name;this.anims=new Set();this.undo=new Set();this.timers=new Set();this.holds=new Set();this.io=null;this.dead=false;this.beats=new Map();this.first=true}
  add(a){this.anims.add(a);const rm=()=>this.anims.delete(a);a.finished.then(rm,rm);return a}
  later(fn,ms){const t=setTimeout(()=>{this.timers.delete(t);if(!this.dead)fn()},Math.max(0,ms));this.timers.add(t)}
  kill(){
    this.dead=true;this.io?.disconnect();
    this.timers.forEach(clearTimeout);this.timers.clear();
    [...this.anims].forEach(a=>{try{a.cancel()}catch(e){}});this.anims.clear();
    [...this.holds].forEach(h=>h.cancel());this.holds.clear();
    [...this.undo].forEach(f=>{try{f()}catch(e){}});this.undo.clear();
  }
}

/* ------------------------------------------------------------- holds
   L'état de départ d'un mouvement, posé avant que l'élément n'entre dans
   le champ, sous forme d'animation en pause (jamais de style permanent). */
const H=new WeakMap();
function holdRec(scope,beat,el,key,make){
  let m=H.get(el);if(!m){m=new Map();H.set(el,m)}
  m.get(key)?.cancel();
  const undo=make();
  const rec={cancel(){if(rec.off)return;rec.off=true;undo();if(m.get(key)===rec)m.delete(key);scope.holds.delete(rec)}};
  m.set(key,rec);scope.holds.add(rec);beat&&beat.holds.push(rec);
  return rec;
}
function hold(scope,beat,el,frame,pseudo,kind){
  return holdRec(scope,beat,el,(pseudo||'')+'|'+kind,()=>{
    const o={duration:1000,fill:'both'};if(pseudo)o.pseudoElement=pseudo;
    const a=el.animate([{...frame,offset:0},{...frame,offset:1}],o);a.pause();
    return ()=>a.cancel();
  });
}
function release(el,pseudo,kind){H.get(el)?.get((pseudo||'')+'|'+kind)?.cancel()}

function play(scope,el,kf,o){
  const frames=kf.map((k,i)=>i===0&&k.offset==null?{...k,offset:0}:k);
  const opt={duration:o.dur,delay:o.delay||0,easing:o.ease||EASE.out,fill:o.fill||'backwards'};
  if(o.pseudo)opt.pseudoElement=o.pseudo;
  return scope.add(el.animate(frames,opt));
}

/* --------------------------------------------------------- text split
   Les mots deviennent temporairement des inline-blocks pour se lever
   ligne par ligne derrière un masque. Avant de jouer, on vérifie que la
   mise en page est strictement identique ; sinon on renonce au découpage. */
function split(el){
  const clone=el.cloneNode(true), before=el.getBoundingClientRect(), words=[], ref=[], jobs=[];
  // 1) mesure de chaque mot dans le texte d'origine
  const walk=n=>{
    for(const ch of n.childNodes){
      if(ch.nodeType===3){
        const parts=ch.data.split(/([ \t\n\r]+)/).filter(Boolean);
        if(!parts.length)continue;
        let off=0;
        for(const p of parts){
          if(!/^[ \t\n\r]+$/.test(p)){const r=d.createRange();r.setStart(ch,off);r.setEnd(ch,off+p.length);ref.push(r.getBoundingClientRect().left)}
          off+=p.length;
        }
        jobs.push([ch,parts]);
      }else if(ch.nodeType===1&&ch.tagName!=='BR'){walk(ch)}
    }
  };
  walk(el);
  // 2) découpage
  for(const [ch,parts] of jobs){
    const frag=d.createDocumentFragment();
    for(const p of parts){
      if(/^[ \t\n\r]+$/.test(p))frag.append(p);
      else{const s=d.createElement('span');s.className='sm-w';s.textContent=p;frag.append(s);words.push(s)}
    }
    ch.replaceWith(frag);
  }
  let done=false;
  const restore=()=>{if(done)return;done=true;el.replaceChildren(...clone.childNodes)};
  const after=el.getBoundingClientRect();
  let ok=words.length>0&&Math.abs(after.height-before.height)<.6&&Math.abs(after.width-before.width)<.6;
  if(ok)for(let i=0;i<words.length;i++){if(Math.abs(words[i].getBoundingClientRect().left-ref[i])>1){ok=false;break}}
  if(!ok){restore();return null}
  const lines=[];let top=null;
  for(const wd of words){const r=wd.getBoundingClientRect();if(top===null||Math.abs(r.top-top)>r.height*.5){lines.push([]);top=r.top}lines[lines.length-1].push(wd)}
  return {words,lines,restore};
}

/* -------------------------------------------------------------- glint
   La lumière traverse les mots en italique (la signature « rayonner »). */
function lum(c){const m=c.match(/[\d.]+/g);if(!m)return 0;const [r,g,b]=m.map(Number);return (.299*r+.587*g+.114*b)/255}
function glint(scope,el,delay=0){
  scope.later(()=>{
    if(!el.isConnected)return;
    const col=getComputedStyle(el).color;
    const undo=tempStyle(el,{});
    el.style.setProperty('--sm-gc',col);
    el.style.setProperty('--sm-gl',lum(col)>.62?'#ffffff':'#ffc23d');
    addClass(el,'sm-glint');
    const off=()=>{rmClass(el,'sm-glint');el.style.removeProperty('--sm-gc');el.style.removeProperty('--sm-gl');undo();scope.undo.delete(off)};
    scope.undo.add(off);
    const a=play(scope,el,[{backgroundPosition:'100% 0'},{backgroundPosition:'0% 0'}],{dur:1500,ease:EASE.inout});
    a.finished.then(off,off);
  },delay);
}

/* ------------------------------------------------------------ context
   Une chorégraphie est écrite une fois et exécutée deux fois :
   en mode « hold » (pose des états de départ) puis « play ». */
// Zooms photographiques réservés aux écrans larges (> 960 px), où les images sont
// affichées à leur taille native ou au-delà. Plus petites, Chrome les décode à la
// taille d'affichage ; les décoder plus tôt ou les transformer changerait ce
// décodage et donc, de quelques niveaux, leur rendu final.
const wide=()=>innerWidth>960;
function prime(img){if(img&&wide()&&!img.__smDec&&img.decode){img.__smDec=1;img.decode().then(()=>{img.__smOk=1},()=>{})}}
function ready(img){return wide()&&!!img.__smOk}
const SWEEP={right:['90deg','250% 100%','100% 0%','0% 0%'],left:['270deg','250% 100%','0% 0%','100% 0%'],up:['0deg','100% 250%','0% 0%','0% 100%'],down:['180deg','100% 250%','0% 100%','0% 0%']};
function ctx(scope,beat,mode,base,opts){
  const H_=mode==='hold';
  const c={mode,opts:opts||{},end:0};
  const T=(dl,du)=>{c.end=Math.max(c.end,dl+du)};

  c.frames=(el,from,o={})=>{
    if(!el)return;
    const kf=Array.isArray(from)?from:[from];
    const kind=o.kind||'f';
    if(H_){hold(scope,beat,el,kf[0],o.pseudo,kind);return}
    release(el,o.pseudo,kind);
    const dur=o.dur??900, delay=base+(o.delay||0);
    T(delay,dur);
    return play(scope,el,kf,{dur,delay,ease:o.ease,pseudo:o.pseudo});
  };
  c.rise=(el,o={})=>c.frames(el,{opacity:0,transform:`translateY(${o.y??22}px)`},{dur:950,...o,kind:'rise'});
  // Zoom photographique : uniquement si l'image est déjà décodée à son entrée.
  // Sinon Chrome peut la décoder pendant le mouvement à une autre échelle et
  // garder ce décodage : le rendu final différerait de quelques niveaux.
  c.zoom=(img,from,o={})=>{if(!img)return;if(H_){prime(img);return}if(ready(img))return c.frames(img,from,{dur:1600,...o,kind:'zoom'})};
  c.ready=img=>!img||ready(img);
  c.fade=(el,o={})=>c.frames(el,{opacity:0},{dur:700,...o,kind:'fade'});
  c.clip=(el,o)=>c.frames(el,[{clipPath:o.from},{clipPath:o.to}],{dur:1100,...o,kind:'clip'});

  c.lines=(el,o={})=>{
    if(!el)return;
    if(H_){hold(scope,beat,el,{opacity:0},null,'lines');return}
    const delay=base+(o.delay||0);
    const s=split(el);
    release(el,null,'lines');
    if(!s){T(delay,900);play(scope,el,[{opacity:0,transform:'translateY(.35em)'}],{dur:900,delay});return}
    scope.undo.add(s.restore);
    const dur=o.dur??(o.small?950:1200), st=o.stagger??(o.small?65:115);
    const anims=[];
    s.lines.forEach((line,i)=>{
      const dl=delay+i*st;
      for(const wd of line)anims.push(play(scope,wd,[
        {transform:'translateY(calc(100% + .25em))',clipPath:'inset(-.25em -.3em 100% -.3em)'},
        {transform:'translateY(0)',clipPath:'inset(-.25em -.3em -.25em -.3em)'}
      ],{dur,delay:dl,ease:o.ease||EASE.out}));
    });
    T(delay,(s.lines.length-1)*st+dur);
    const fin=()=>{s.restore();scope.undo.delete(s.restore);
      if(o.glint!==false&&el.matches('h1,h2'))$$('em,span',el).forEach((e,i)=>glint(scope,e,60+i*120));
    };
    Promise.all(anims.map(a=>a.finished)).then(()=>{if(!scope.dead)fin()},()=>{});
  };

  c.sweep=(el,o={})=>{
    if(!el)return;
    const [ang,size,from,to]=SWEEP[o.dir||'right'];
    const g=`linear-gradient(${ang},#000 40%,transparent 60%)`;
    const set=()=>tempStyle(el,{webkitMaskImage:g,maskImage:g,webkitMaskSize:size,maskSize:size,webkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',webkitMaskPosition:from,maskPosition:from});
    if(H_){holdRec(scope,beat,el,'|sweep',set);return}
    release(el,null,'sweep');
    const undo=set();scope.undo.add(undo);
    const dur=o.dur??1100, delay=base+(o.delay||0);T(delay,dur);
    const a=play(scope,el,[{webkitMaskPosition:from,maskPosition:from},{webkitMaskPosition:to,maskPosition:to}],{dur,delay,ease:o.ease||EASE.soft});
    const off=()=>{undo();scope.undo.delete(undo)};
    a.finished.then(off,off);
  };

  // Tracé d'un filet existant (bordure) : le vrai filet est masqué, un
  // calque le redessine puis s'efface.
  c.line=(el,o={})=>{
    if(!el)return;
    const side=o.side||'top', P={top:'borderTopColor',bottom:'borderBottomColor',left:'borderLeftColor'}[side];
    const key='line-'+side;
    if(H_){hold(scope,beat,el,{[P]:'transparent'},null,key);return}
    const delay=base+(o.delay||0), dur=o.dur??1100;
    // Le filet reste masqué (hold propre à la scène) jusqu'au tracé.
    hold(scope,null,el,{[P]:'transparent'},null,key);
    scope.later(()=>{
      const cs=getComputedStyle(el);
      const bw=k=>parseFloat(cs['border'+k+'Width'])||0;
      const W={top:bw('Top'),bottom:bw('Bottom'),left:bw('Left'),right:bw('Right')};
      // la couleur calculée est masquée par le hold : on lit celle d'origine
      release(el,null,key);
      const color=getComputedStyle(el)[P];
      hold(scope,null,el,{[P]:'transparent'},null,key);
      const unpos=pos(el);
      const ln=fx('i','sm-line',el);
      const st=ln.style;
      if(side==='left'){st.left=-W.left+'px';st.top=-W.top+'px';st.bottom=-W.bottom+'px';st.width=W.left+'px';st.transformOrigin='50% 0'}
      else{st.left=-W.left+'px';st.right=-W.right+'px';st.height=W[side]+'px';st[side]=-W[side]+'px'}
      st.background=color;
      const off=()=>{ln.remove();unpos();release(el,null,key);scope.undo.delete(off)};
      scope.undo.add(off);
      const kf=side==='left'?[{transform:'scaleY(0)'},{transform:'none'}]:[{transform:'scaleX(0)'},{transform:'none'}];
      if(o.glow)kf[0].background=o.glow;
      const a=play(scope,ln,kf,{dur,ease:o.ease||EASE.out});
      a.finished.then(off,off);
    },delay);
    T(delay,dur);
  };

  c.sheen=(el,o={})=>{if(H_||!el)return;const delay=base+(o.delay||0);scope.later(()=>sheen(scope,el,o.dur||1400),delay);T(delay,o.dur||1400)};
  c.call=(fn,delay=0)=>{if(!H_)scope.later(fn,base+delay)};
  c.bars=(el,o={})=>{
    if(!el)return;
    const n=o.n||4,size=100/n+.4,img=Array(n).fill('linear-gradient(#000,#000)').join(',');
    const posn=Array.from({length:n},(_,i)=>`${(i/(n-1)*100).toFixed(3)}% 100%`).join(',');
    const sz=h=>h.map(v=>`${size}% ${v.toFixed(2)}%`).join(',');
    const set=()=>tempStyle(el,{webkitMaskImage:img,maskImage:img,webkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',webkitMaskPosition:posn,maskPosition:posn,webkitMaskSize:sz(Array(n).fill(0)),maskSize:sz(Array(n).fill(0))});
    if(H_){holdRec(scope,beat,el,'|bars',set);return}
    release(el,null,'bars');
    const undo=set();scope.undo.add(undo);
    const st=o.stagger||150,du=o.dur||720,total=(n-1)*st+du,delay=base+(o.delay||0),S=24,kf=[];
    const e=t=>1-Math.pow(1-t,4);
    for(let k=0;k<=S;k++){const t=total*k/S;const h=Array.from({length:n},(_,i)=>100*e(Math.min(1,Math.max(0,(t-i*st)/du))));const s=sz(h);kf.push({offset:k/S,webkitMaskSize:s,maskSize:s})}
    T(delay,total);
    const a=play(scope,el,kf,{dur:total,delay,ease:'linear'});
    const off=()=>{undo();scope.undo.delete(undo)};
    a.finished.then(off,off);
  };
  return c;
}

function sheen(scope,el,dur){
  if(!el.isConnected)return;
  const host=el.parentElement,unpos=pos(host);
  const s=fx('span','sm-sheen',host);
  const r=el.getBoundingClientRect(),hr=host.getBoundingClientRect(),cs=getComputedStyle(el),hs=getComputedStyle(host);
  Object.assign(s.style,{left:r.left-hr.left-parseFloat(hs.borderLeftWidth)+'px',top:r.top-hr.top-parseFloat(hs.borderTopWidth)+'px',width:r.width+'px',height:r.height+'px',borderRadius:cs.borderRadius});
  const off=()=>{s.remove();unpos();scope.undo.delete(off)};scope.undo.add(off);
  const a=play(scope,s,[{transform:'translateX(-100%)'},{transform:'translateX(100%)'}],{dur,ease:EASE.inout,pseudo:'::after'});
  a.finished.then(off,off);
}

/* -------------------------------------------------------- motifs */
function eyebrow(c,el,delay=0){
  if(!el)return;
  c.frames(el,{transform:'scaleX(0)',transformOrigin:'0 50%'},{pseudo:'::before',delay,dur:800,kind:'dash'});
  c.sweep(el,{delay:delay+60,dur:1000});
}
function heading(c,box,delay=0){
  if(!box)return;
  eyebrow(c,$('.section-eyebrow',box),delay);
  c.lines($('h1,h2',box),{delay:delay+110});
}
function cta(c,el){
  const wrap=$('.wrap',el),[p,h,btn]=wrap.children;
  c.frames(el,{transform:'translateY(-50%) rotate(-150deg) scale(.5)',opacity:0},{pseudo:'::after',dur:2200,ease:EASE.out,kind:'star'});
  c.call(()=>ctaLight(c.scope,el),120);
  c.sweep(p,{delay:120,dur:1000});
  c.lines(h,{delay:220,stagger:140,dur:1300});
  button(c,btn,720);
}
function button(c,btn,delay){
  if(!btn)return;
  c.clip(btn,{from:'inset(0% 100% 0% 0% round 8px)',to:'inset(0% 0% 0% 0% round 8px)',delay,dur:950,ease:EASE.out});
  c.frames($('span',btn),{transform:'translate(-14px,14px)',opacity:0},{delay:delay+380,dur:800,kind:'arrow'});
}
function pills(c,list,delay,step=75){list.forEach((el,i)=>c.frames(el,{opacity:0,transform:'translateY(16px) scale(.86)'},{delay:delay+i*step,dur:SPRING.dur,ease:SPRING.ease,kind:'pill'}))}
function symbol(c,el,i,delay){
  if(!el)return;
  const o='16px 50%';
  const F=[
    [{transform:'scale(2.6)',opacity:0,transformOrigin:o},{transform:'scale(.86)',opacity:1,offset:.55,transformOrigin:o},{transform:'scale(1)',opacity:1,transformOrigin:o}],
    [{transform:'rotate(-200deg) scale(.2)',opacity:0,transformOrigin:o}],
    [{transform:'translate(-26px,26px)',opacity:0}],
    [{transform:'scale(0)',opacity:0,textShadow:'0 0 0 rgba(255,223,41,0)',transformOrigin:o},{transform:'scale(1.3)',opacity:1,textShadow:'0 0 22px rgba(255,223,41,.9)',offset:.5,transformOrigin:o},{transform:'scale(1)',opacity:1,textShadow:'0 0 0 rgba(255,223,41,0)',transformOrigin:o}],
  ][i%4];
  c.frames(el,F,{delay,dur:i===1?1300:1000,ease:i===2?SPRING.ease:EASE.out,kind:'sym'});
}

/* -------------------------------------------- chorégraphies par vue */
const BEATS={};

BEATS.index=[
  ['.home-hero',(c,el)=>{
    const copy=$('.home-hero-copy',el),art=$('.home-hero-art',el),img=$('img',art),intro=c.opts.intro;
    c.sweep($('.hero-location',copy),{dur:1100});
    c.lines($('h1',copy),{delay:90,stagger:130,dur:1300});
    c.lines($(':scope>p',copy),{delay:380,small:true});
    button(c,$('.button',copy),600);
    c.sweep($('.button-link',copy),{delay:760,dur:950});
    const corner=$('.hero-corner',copy);
    c.sweep(corner,{delay:880,dur:1100});
    c.frames($('.pulse-sun',corner),[{scale:'0'},{scale:'1.8',offset:.45},{scale:'1'}],{delay:900,dur:1200,ease:EASE.soft,kind:'sun'});
    if(intro&&c.mode==='hold'&&img){
      const ar=art.getBoundingClientRect(),ir=img.getBoundingClientRect();
      c.opts.inset=`inset(${ir.top-ar.top}px ${ar.right-ir.right}px ${ar.bottom-ir.bottom}px ${ir.left-ar.left}px round 5px)`;
    }
    if(intro){c.clip(art,{from:c.opts.inset||'inset(0px round 0px)',to:'inset(0px 0px 0px 0px round 0px)',dur:1400,ease:EASE.inout})}
    else{
      c.clip(art,{from:'inset(12% 14% 16% 14% round 24px)',to:'inset(0% 0% 0% 0% round 0px)',dur:1400,ease:EASE.inout});
      c.fade(art,{dur:420});
      c.zoom(img,{transform:'scale(1.13) translateY(16px)'},{dur:1700});
    }
    c.frames(art,{opacity:0,transform:'translate(-14%,40%) scale(.5)'},{pseudo:'::before',delay:intro?100:200,dur:2100,kind:'blob'});
    c.frames($('.art-label',art),{opacity:0,transform:'translateY(10px)'},{delay:950,dur:800,kind:'label'});
    if(intro){
      $$('.nav-desktop a').forEach((a,i)=>c.frames(a,{opacity:0,transform:'translateY(-12px)'},{delay:60+i*70,dur:850,kind:'nav'}));
      c.clip($('.nav-action'),{from:'inset(0% 0% 0% 100% round 50px)',to:'inset(0% 0% 0% 0% round 50px)',delay:330,dur:1000});
      c.frames($('.menu-toggle'),{opacity:0,transform:'scale(.6) rotate(-90deg)'},{delay:200,dur:900,kind:'menu'});
    }
  },{hero:true}],
  ['.intro-strip',(c,el)=>{
    const [p,txt,a]=el.children;
    c.line(el,{side:'bottom',dur:1400});
    c.lines(p,{stagger:140});
    c.lines(txt,{delay:240,small:true});
    c.frames(a,{transform:'rotate(-135deg) scale(.4)',opacity:0},{delay:420,dur:SPRING.dur,ease:SPRING.ease,kind:'circ'});
  }],
  ['.section-topline',(c,el)=>{heading(c,el);c.lines($(':scope>p',el),{delay:420,small:true})}],
  ['.service-tile',(c,el)=>{
    // La carte se lève (opacité et translation, composées sur le GPU), puis une
    // bande de lumière traverse le visuel en calque séparé. Le visuel lui-même
    // n'est jamais transformé ni découpé : les essais répétés montrent que Chrome
    // peut alors en garder un rendu différent de quelques niveaux.
    const info=$('.tile-info',el);
    c.frames(el,{opacity:0,transform:'translateY(46px)'},{dur:1200,ease:EASE.out,kind:'tile'});
    c.sheen($('.service-art',el),{delay:520,dur:1400});
    c.lines($('h3',info),{delay:260});
    c.rise($('p',info),{delay:400,y:12});
    c.frames($('.tile-arrow',info),{transform:'rotate(-120deg) scale(.4)',opacity:0},{delay:480,dur:SPRING.dur,ease:SPRING.ease,kind:'arw'});
  }],
  ['.agency-highlight-visual',(c,el)=>{
    const img=$('img',el);
    c.sweep(img,{dur:1500,ease:EASE.inout});
    c.zoom(img,{transform:'scale(1.09)'},{dur:1900});
    c.sheen(img,{delay:900});
  }],
  ['.agency-highlight-copy',(c,el)=>{
    heading(c,el,150);
    c.lines($(':scope>p:not(.section-eyebrow)',el),{delay:520,small:true});
    const steps=$('.agency-steps',el);
    c.line(steps,{side:'top',delay:700,dur:900});
    $$('span',steps).forEach((s,i)=>{
      const t=800+i*150;
      c.line(s,{side:'bottom',delay:t,dur:900});
      c.frames(s,{transform:'scale(0) rotate(-120deg)'},{pseudo:'::before',delay:t+80,dur:SPRING.dur,ease:SPRING.ease,kind:'check'});
      c.sweep(s,{delay:t+40,dur:900});
    });
    const link=$('.text-link',el);
    c.line(link,{side:'bottom',delay:1320,dur:900});
    c.sweep(link,{delay:1280,dur:900});
  },{root:true}],
  ['.campaign-image',(c,el)=>{
    const img=$('img',el);
    c.clip(img,{from:'inset(31% 0% 31% 0% round 6px)',to:'inset(0% 0% 0% 0% round 6px)',dur:1500,ease:EASE.inout});
    c.zoom(img,{transform:'scale(1.24)'},{dur:2000});
    c.sheen(img,{delay:1250});
  }],
  ['.campaign-body',(c,el)=>{heading(c,el,200);c.lines($(':scope>p:not(.section-eyebrow)',el),{delay:560,small:true});button(c,$('.button',el),760)},{root:true}],
  ['.closing-cta',cta],
];

BEATS.agence=[
  ['.page-hero',(c,el)=>{
    const copy=$('.page-hero-copy',el),art=$('.page-hero-art',el);
    eyebrow(c,$('.section-eyebrow',copy));
    c.lines($('h1',copy),{delay:100,stagger:125,dur:1300});
    c.lines($(':scope>p:not(.section-eyebrow)',copy),{delay:440,small:true});
    c.sweep($('.button-link',copy),{delay:720});
    c.clip(art,{from:'inset(0% 100% 0% 0% round 15px)',to:'inset(0% 0% 0% 0% round 15px)',delay:120,dur:1400,ease:EASE.inout});
    c.zoom($('img',art),{transform:'scale(1.16)',filter:env.fine?'blur(8px)':'none'},{delay:120,dur:1800});
  },{hero:true}],
  ['.agency-mission',(c,el)=>{
    c.line(el,{side:'top',dur:1400});
    heading(c,$('.mission-title',el),100);
    $$('.mission-detail p',el).forEach((p,i)=>c.sweep(p,{delay:520+i*220,dur:1300}));
  }],
  ['.process-heading',(c,el)=>heading(c,el)],
  ['.process-grid',(c,el)=>{
    $$('article',el).forEach((a,i)=>{
      const t=i*280;
      c.line(a,{side:'top',delay:t,dur:560,glow:'#ffdf29',ease:EASE.soft});
      symbol(c,$('.process-symbol',a),i,t+220);
      c.lines($('h3',a),{delay:t+300});
      c.rise($('p',a),{delay:t+430,y:14});
    });
  }],
  ['.audience-section',(c,el)=>{heading(c,el.children[0]);pills(c,$$('.audience-grid span',el),320)}],
  ['.location-flex',(c,el)=>{heading(c,el.children[0]);c.sweep($(':scope>p',el),{delay:520,dur:1300})}],
  ['.closing-cta',cta],
];

function expertContent(c,el,beat=90){
  c.sweep($('.expert-kind',el),{dur:1000});
  c.lines($('h2',el),{delay:110});
  c.lines($(':scope>p',el),{delay:360,small:true});
  $$('.service-bullets li',el).forEach((li,i)=>{
    const t=560+i*beat;
    c.frames(li,[{transform:'scale(0)'},{transform:'scale(1.6)',offset:.45},{transform:'scale(1)'}],{pseudo:'::before',delay:t,dur:700,kind:'dot'});
    c.sweep(li,{delay:t+30,dur:800});
  });
  c.sweep($('.text-link',el),{delay:560+4*beat+120});
}
function rings(scope,art){
  if(!art.isConnected)return;
  const unpos=pos(art),list=[0,1,2].map(()=>fx('span','sm-ring',art));
  const off=()=>{list.forEach(r=>r.remove());unpos();scope.undo.delete(off)};scope.undo.add(off);
  const anims=list.map((r,i)=>play(scope,r,[{transform:'scale(.15)',opacity:.75},{transform:'scale(2.8)',opacity:0}],{dur:1700,delay:i*280,ease:EASE.out}));
  Promise.allSettled(anims.map(a=>a.finished)).then(off);
}
function guides(scope,art){
  if(!art.isConnected)return;
  const unpos=pos(art),L=[];
  [[1/3,'h'],[2/3,'h'],[1/3,'v'],[2/3,'v']].forEach(([f,o],i)=>{
    const g=fx('span','sm-guide',art);
    if(o==='h')Object.assign(g.style,{left:'0',right:'0',top:f*100+'%',height:'1px',transformOrigin:i%2?'100% 50%':'0 50%'});
    else Object.assign(g.style,{top:'0',bottom:'0',left:f*100+'%',width:'1px',transformOrigin:i%2?'50% 100%':'50% 0'});
    L.push(g);
    play(scope,g,[{transform:o==='h'?'scaleX(0)':'scaleY(0)'},{transform:'none'}],{dur:620,delay:i*90,ease:EASE.precise,fill:'both'});
  });
  const off=()=>{L.forEach(g=>g.remove());unpos();scope.undo.delete(off)};scope.undo.add(off);
  const fade=L.map(g=>play(scope,g,[{opacity:.55},{opacity:0}],{dur:600,delay:1500,ease:EASE.soft,fill:'forwards'}));
  Promise.allSettled(fade.map(a=>a.finished)).then(off);
}
BEATS.expertises=[
  ['.expert-intro',(c,el)=>{
    eyebrow(c,$(':scope>.section-eyebrow',el));
    c.lines($('h1',el),{delay:100,stagger:125,dur:1300});
    c.lines($('.expert-intro-grid>div>p',el),{delay:420,small:true});
    pills(c,$$('.quick-links a',el),640,70);
  },{hero:true}],
  ['.art-digital',(c,el)=>{
    const img=$('img',el);if(c.mode==='hold')prime(img);
    c.frames(el,c.ready(img)?{opacity:0,transform:'translateY(70px) scale(.9) rotate(-3deg)'}:{opacity:0,transform:'translateY(70px)'},{dur:SPRING_SOFT.dur,ease:SPRING_SOFT.ease,kind:'pub'});
    c.call(()=>rings(c.scope,el),520);
  }],
  ['.art-branding',(c,el)=>{
    c.fade(el,{dur:450});
    c.call(()=>guides(c.scope,el),150);
    c.clip($('img',el),{from:'inset(50% 50% 50% 50% round 8px)',to:'inset(0% 0% 0% 0% round 8px)',delay:560,dur:1150,ease:EASE.precise});
  }],
  ['.art-production',(c,el)=>{
    const img=$('img',el);if(c.mode==='hold')prime(img);
    if(c.mode==='hold'||c.ready(img)){c.frames(el,{opacity:0,transform:'perspective(1100px) rotateY(34deg) rotateX(12deg) translateZ(-140px) scale(.92)'},{dur:1700,ease:EASE.out,kind:'turn'});c.sheen(el,{delay:820,dur:1500})}
    else c.frames(el,{opacity:0,transform:'translateY(30px)'},{dur:1100,kind:'turn'});
  }],
  ['.art-campagnes',(c,el)=>{
    c.fade(el,{dur:380});
    c.bars($('img',el),{delay:240,n:4,stagger:160,dur:760});
  }],
  ['.expert-content',(c,el)=>expertContent(c,el,el.closest('#campagnes')?160:90),{root:true}],
  ['.closing-cta',cta],
];

BEATS.realisations=[
  ['.work-intro',(c,el)=>{
    const [a,b]=el.children;
    eyebrow(c,$('.section-eyebrow',a));
    c.lines($('h1',a),{delay:100,stagger:125,dur:1300});
    c.lines($('p',b),{delay:400,small:true});
    const note=$('.legal-visual-note',b);
    c.line(note,{side:'left',delay:620,dur:900});
    c.sweep(note,{delay:660,dur:1100});
  },{hero:true}],
  ['.portfolio-controls',(c,el)=>{
    c.line(el,{side:'top',dur:1300});
    c.sweep($(':scope>span',el),{delay:120});
    pills(c,$$('.portfolio-filters button',el),220,55);
  }],
  ['.portfolio-card',(c,el)=>{
    const large=el.classList.contains('portfolio-large'),img=$('.portfolio-photo img',el),cap=$('.portfolio-caption',el);
    c.clip(el,{from:large?'inset(0% 100% 0% 0% round 14px)':'inset(100% 0% 0% 0% round 14px)',to:'inset(0% 0% 0% 0% round 14px)',dur:1250,ease:EASE.out});
    c.zoom(img,{transform:'scale(1.22)',filter:env.fine?'blur(6px)':'none'},{delay:80,dur:1600});
    c.lines(cap.children[0],{delay:large?380:300});
    c.frames(cap.children[1],{transform:'translate(-10px,10px)',opacity:0},{delay:large?560:460,dur:800,kind:'arw'});
  }],
  ['.portfolio-next',(c,el)=>{c.line(el,{side:'top',dur:1300});heading(c,el.children[0],100);c.lines($(':scope>p',el),{delay:420,small:true})}],
  ['.closing-cta',cta],
];

BEATS.contact=[
  ['.contact-intro',(c,el)=>{
    eyebrow(c,$('.section-eyebrow',el));
    c.lines($('h1',el),{delay:100,stagger:125,dur:1300});
    c.lines($(':scope>p:not(.section-eyebrow)',el),{delay:420,small:true});
    const where=$('.contact-where',el);
    c.line(where,{side:'top',delay:560,dur:1100});
    [...where.children].forEach((x,i)=>c.sweep(x,{delay:640+i*120,dur:1000}));
    c.frames($('.contact-motif',el),{transform:'rotate(-130deg) scale(.35)',opacity:0},{delay:250,dur:2300,ease:EASE.out,kind:'motif'});
  },{hero:true}],
  ['.form-panel',(c,el)=>{
    c.frames(el,{opacity:0,transform:'translateY(48px) scale(.965)'},{delay:160,dur:1300,kind:'panel'});
    c.lines($('h2',el),{delay:380});
    c.sweep($(':scope>p',el),{delay:520});
    $$('.field,.demo-disclaimer,.submit-button',el).forEach((f,i)=>c.rise(f,{delay:600+i*70,y:16,dur:900}));
  },{hero:true}],
  ['.contact-bottom-inner',(c,el)=>{c.sweep($('p',el),{dur:1100});$$('a',el).forEach((a,i)=>c.sweep(a,{delay:220+i*140}))}],
];

/* ------------------------------------------------------ CTA lumière */
function ctaLight(sc,el){
  if(!sc||sc.dead||!el.isConnected)return;
  const s=fx('span','sm-sheen',el);
  Object.assign(s.style,{inset:'0',zIndex:'0'});
  const off=()=>{s.remove();sc.undo.delete(off)};sc.undo.add(off);
  const a=play(sc,s,[{transform:'translateX(-100%)'},{transform:'translateX(100%)'}],{dur:2200,ease:EASE.inout,pseudo:'::after'});
  a.finished.then(off,off);
}

/* ---------------------------------------------------------- moteur */
let active=null;
const globalScope=new Scope('global');

function collect(name,view){
  const out=[];
  (BEATS[name]||[]).forEach(([sel,fn,opts])=>$$(sel,view).forEach(el=>out.push({el,fn,hero:!!opts?.hero,root:!!opts?.root,holds:[],played:false})));
  return out;
}
function run(scope,b,mode,base=0,opts){
  const c=ctx(scope,b,mode,base,opts||b.runOpts);
  c.scope=scope;
  // Blocs de texte placés sous une image sans dimensions (chargement différé) :
  // invisibles avant leur entrée, comme dans la version d'origine, pour que le
  // décalage provoqué par l'image ne compte pas dans le CLS.
  if(b.root){if(mode==='hold')hold(scope,b,b.el,{opacity:0},null,'root');else release(b.el,null,'root')}
  try{b.fn(c,b.el)}catch(err){
    b.holds.forEach(h=>h.cancel());b.holds=[];
    if(w.console)console.warn('[Solaria motion]',err);
  }
  if(mode==='play'){
    b.played=true;
    // filet de sécurité : aucun état de départ ne survit à la chorégraphie
    const hs=b.holds;b.holds=[];
    scope.later(()=>{hs.forEach(h=>h.cancel());repaint(b.el)},c.end+120);
  }
  return c.end;
}
// Pendant une animation voisine, Chrome peut peindre une image avec un filtrage
// allégé et ne pas toujours la repeindre ensuite. Une fois la scène posée, on
// invalide une fois le rendu des images (contour nul, sans effet visuel).
function repaint(el){
  const imgs=el.tagName==='IMG'?[el]:$$('img',el);
  if(!imgs.length)return;
  const undo=imgs.map(i=>tempStyle(i,{outline:'0px solid transparent'}));
  requestAnimationFrame(()=>requestAnimationFrame(()=>undo.forEach(u=>u())));
}
function playBatch(scope,list,base){
  list.sort((a,b)=>{const ra=a.el.getBoundingClientRect(),rb=b.el.getBoundingClientRect();return (ra.top-rb.top)||(ra.left-rb.left)});
  list.forEach((b,i)=>{scope.io?.unobserve(b.el);run(scope,b,'play',base+Math.min(i,5)*110)});
}

function enter(name,o={}){
  const view=d.querySelector(`[data-view="${name}"]`);
  if(active)active.scope.kill();
  const scope=new Scope(name);
  active={name,scope,view};
  if(env.reduced||!view)return scope;
  const beats=collect(name,view),intro=o.mode==='intro',late=o.mode==='late';
  scope.beatList=beats;
  beats.forEach(b=>{
    scope.beats.set(b.el,b);
    if(intro&&b.hero)return;
    // scripts arrivés après le rideau de secours : ce qui est déjà affiché ne rejoue pas
    if(late){const r=b.el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0){b.played=true;return}}
    run(scope,b,'hold');
  });
  const io=new IntersectionObserver(entries=>{
    const hits=entries.filter(e=>e.isIntersecting).map(e=>scope.beats.get(e.target)).filter(b=>b&&!b.played);
    if(!hits.length)return;
    const base=scope.first?(o.base||0):0;scope.first=false;
    playBatch(scope,hits,base);
  },{rootMargin:'0px 0px -7% 0px',threshold:0});
  scope.io=io;
  scope.observe=()=>{if(scope.dead||scope.observing)return;scope.observing=true;beats.forEach(b=>{if(!b.played)io.observe(b.el)})};
  if(!intro)scope.observe();
  return scope;
}

// Accès clavier, recherche dans la page, impression : rien ne reste caché.
d.addEventListener('focusin',e=>{
  const sc=active?.scope;if(!sc||sc.dead)return;
  const f=e.target;
  for(let n=f;n&&n!==d.body;n=n.parentElement){const b=sc.beats.get(n);if(b&&!b.played){sc.io?.unobserve(n);run(sc,b,'play',0);break}}
  // ce qui entoure l'élément focalisé se pose immédiatement
  [...sc.anims].forEach(a=>{const t=a.effect?.target;if(t&&(t.contains(f)||f.contains(t)))try{a.finish()}catch(_){}});
});
w.addEventListener('beforeprint',()=>{active?.scope.kill()});
RM.addEventListener?.('change',()=>{if(env.reduced){active?.scope.kill();globalScope.kill()}});

/* ----------------------------------------------- rideau d'entrée */
function liftEnterCurtain(){
  if(!root.classList.contains('sm-enter'))return;
  const main=$('main');
  try{
    const a=main.animate([{opacity:1},{opacity:0}],{duration:380,easing:EASE.soft,fill:'forwards',pseudoElement:'::before'});
    a.finished.then(()=>{root.classList.remove('sm-enter');a.cancel()},()=>root.classList.remove('sm-enter'));
  }catch(e){root.classList.remove('sm-enter')}
}

/* ------------------------------------------------- pied de page */
function footerOnce(){
  const f=$('.site-footer');if(!f||env.reduced)return;
  const parts=[...$$('.footer-main>*',f),$('.footer-bottom',f)].filter(Boolean);
  const b={el:f,holds:[],played:false,fn:(c)=>{parts.forEach((p,i)=>c.rise(p,{delay:i*110,y:26,dur:1100}))}};
  run(globalScope,b,'hold');
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();run(globalScope,b,'play')}},{rootMargin:'0px 0px -5% 0px'});
  globalScope.io=io;io.observe(f);
  globalScope.footer=b;
}

/* =========================================== transitions de page */
let veil=null;
const nav={token:0,phase:'idle',pending:null,cover:null,reveal:null,push:null};
function ensureVeil(){
  if(veil)return veil;
  veil=d.createElement('div');veil.className='sm-veil';veil.setAttribute('aria-hidden','true');
  veil.innerHTML='<span class="sm-veil-glow"></span><span class="sm-veil-star">✳</span>';
  d.body.append(veil);
  return veil;
}
function shellBottom(){const s=$('.header-shell');return s?Math.max(0,s.getBoundingClientRect().bottom):0}

function go({from,to,origin,swap}){
  const tok=++nav.token;
  if(env.reduced){swap();enter(to,{mode:'instant'});return}
  nav.pending={from,to,swap};
  if(nav.phase==='covering')return;
  if(nav.phase==='revealing'){nav.reveal?.cancel();nav.cover?.cancel();nav.reveal=null}
  const v=ensureVeil(),top=shellBottom();
  v.style.setProperty('--sm-veil-top',top+'px');
  v.classList.add('is-on');
  const vw=innerWidth,vh=innerHeight-top;
  let x=vw/2,y=vh/2;
  if(origin){x=origin.x;y=Math.min(Math.max(origin.y-top,0),vh)}
  const R=Math.hypot(Math.max(x,vw-x),Math.max(y,vh-y))+40;
  nav.phase='covering';
  const star=$('.sm-veil-star',v),glow=$('.sm-veil-glow',v);
  [star,glow].forEach(n=>n.getAnimations().forEach(a=>a.cancel()));
  nav.cover=v.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${R}px at ${x}px ${y}px)`}],{duration:520,easing:EASE.inout,fill:'forwards'});
  star.animate([{transform:'rotate(-120deg) scale(.4)',opacity:0},{transform:'rotate(0deg) scale(1)',opacity:1}],{duration:820,easing:EASE.out,fill:'forwards'});
  glow.animate([{transform:`translate(${x-vw/2}px,${y-vh/2}px) scale(.2)`,opacity:1},{transform:'translate(0,0) scale(1)',opacity:.85}],{duration:700,easing:EASE.out,fill:'forwards'});
  const main=$('main');
  nav.push=main.animate([{transform:'none',opacity:1},{transform:'translateY(-14px) scale(.985)',opacity:.55}],{duration:520,easing:EASE.in,fill:'forwards'});
  // Sous le rideau : on quitte l'ancienne vue, on affiche la nouvelle, on
  // attend éventuellement que l'ancre soit stable, puis on lève le rideau.
  // Une navigation arrivée entre-temps est appliquée avant de lever.
  const commit=()=>{
    if(nav.phase!=='covering')return;
    const p=nav.pending;
    if(!p){enter(nav.to,{mode:'nav',base:180});reveal(v,star,glow);return}
    nav.pending=null;nav.to=p.to;
    nav.push?.cancel();nav.push=null;
    active?.scope.kill();
    const r=p.swap();
    if(r&&typeof r.then==='function')r.then(commit,commit);else commit();
  };
  nav.cover.finished.then(commit,()=>{});
  void tok;
}
function reveal(v,star,glow){
  nav.phase='revealing';
  const sb=Math.round(innerHeight*.22);
  nav.reveal=v.animate([
    {clipPath:`inset(0% 0% 0% 0% round 0px 0px 50% 50% / 0px 0px 0px 0px)`},
    {clipPath:`inset(0% 0% 100% 0% round 0px 0px 50% 50% / 0px 0px ${sb}px ${sb}px)`}
  ],{duration:760,easing:EASE.inout,fill:'forwards'});
  star.animate([{transform:'rotate(0deg) scale(1)',opacity:1},{transform:'rotate(70deg) scale(.7) translateY(-18vh)',opacity:0}],{duration:620,easing:EASE.in,fill:'forwards'});
  const mine=nav.reveal;
  const done=()=>{
    if(nav.phase!=='revealing'||nav.reveal!==mine)return;
    nav.phase='idle';
    v.classList.remove('is-on');
    [v,star,glow].forEach(n=>n.getAnimations().forEach(a=>a.cancel()));
    nav.cover=nav.reveal=null;
  };
  nav.reveal.finished.then(done,()=>{});
}

/* Indicateur actif glissant dans le header (un seul à la fois) */
let slideStop=null;
function navSlide(from,to){
  slideStop?.();
  const navEl=$('.nav-desktop');
  if(env.reduced||!navEl||getComputedStyle(navEl).display==='none')return null;
  const links=$$('a',navEl),a=links.find(l=>l.getAttribute('href')===from+'.html'),b=links.find(l=>l.getAttribute('href')===to+'.html');
  if((!a&&!b)||a===b)return null;
  const header=$('.site-header'),hr=header.getBoundingClientRect();
  const R=l=>{const r=l.getBoundingClientRect();return {x:r.left-hr.left,y:r.bottom-hr.top-2,w:r.width}};
  const ra=a&&R(a),rb=b&&R(b);
  const undo=[a&&tempStyle(a,{boxShadow:'none'}),b&&tempStyle(b,{boxShadow:'none'})].filter(Boolean);
  const bar=fx('i','sm-nav-bar',header);
  const t=(r,s)=>`translate(${r.x+(s===0?r.w/2:0)}px,${r.y}px) scaleX(${s===0?0:r.w})`;
  const kf=[{transform:ra?t(ra):t(rb,0)},{transform:rb?t(rb):t(ra,0)}];
  const an=bar.animate(kf,{duration:640,easing:EASE.out,fill:'forwards'});
  const clean=()=>{if(slideStop===clean)slideStop=null;bar.remove();undo.forEach(u=>u())};
  slideStop=clean;
  an.finished.then(clean,clean);
  return an;
}

/* ====================================================== interactions */
function interactions(){
  // Flèches : elles partent dans leur direction et reviennent par l'autre côté.
  const DIR={'↗':[1,-1],'→':[1,0],'↓':[0,1],'↘':[1,1],'↑':[0,-1]};
  const HOSTS='.button,.nav-action,.button-link,.text-link,.footer-email';
  d.addEventListener('pointerover',e=>{
    if(env.reduced||!env.fine)return;
    const host=e.target.closest?.(HOSTS);if(!host||host.contains(e.relatedTarget))return;
    const s=host.querySelector(':scope>span[aria-hidden="true"]');if(!s||s.getAnimations().length)return;
    const v=DIR[s.textContent.trim()]||[1,-1],m=.55;
    s.animate([{transform:'none',opacity:1},{transform:`translate(${v[0]*m}em,${v[1]*m}em)`,opacity:0,offset:.4},{transform:`translate(${-v[0]*m}em,${-v[1]*m}em)`,opacity:0,offset:.41},{transform:'none',opacity:1}],{duration:640,easing:EASE.soft});
  });

  // Pression : réponse immédiate au clic, retour élastique.
  const PRESS='.button,.nav-action,.circle-next,.portfolio-filters button,.quick-links a,.menu-toggle,.lightbox-close,.tile-arrow,.sm-skip';
  let pressed=null;
  const unpress=()=>{if(!pressed)return;const el=pressed;pressed=null;el.__smPress?.cancel();el.animate([{scale:'.955'},{scale:'1'}],{duration:SPRING.dur,easing:SPRING.ease})};
  d.addEventListener('pointerdown',e=>{
    if(env.reduced||e.button)return;
    const el=e.target.closest?.(PRESS);if(!el)return;
    pressed=el;el.__smPress=el.animate([{scale:'1'},{scale:'.955'}],{duration:130,easing:EASE.soft,fill:'forwards'});
    if(el.matches('.button-dark,.nav-action,.submit-button'))burst(el,e);
  });
  ['pointerup','pointercancel','dragstart'].forEach(t=>d.addEventListener(t,unpress));
  d.addEventListener('pointerout',e=>{if(pressed&&!pressed.contains(e.relatedTarget))unpress()});

  // Aimantation très légère (pointeur précis uniquement).
  const MAG='.nav-action,.button,.circle-next';
  let magEl=null,raf=0,mx=0,my=0;
  d.addEventListener('pointermove',e=>{
    if(env.reduced||!env.fine||e.pointerType!=='mouse')return;
    const el=e.target.closest?.(MAG);
    if(el!==magEl){releaseMag();magEl=el}
    if(!el)return;
    mx=e.clientX;my=e.clientY;
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(!magEl)return;const r=magEl.getBoundingClientRect(),k=magEl.matches('.circle-next')?7:4;
      const dx=Math.max(-1,Math.min(1,(mx-(r.left+r.width/2))/(r.width/2))),dy=Math.max(-1,Math.min(1,(my-(r.top+r.height/2))/(r.height/2)));
      magEl.style.translate=`${(dx*k).toFixed(2)}px ${(dy*k*.7).toFixed(2)}px`});
  },{passive:true});
  function releaseMag(){
    if(!magEl)return;const el=magEl;magEl=null;const cur=el.style.translate;
    if(!cur)return;el.style.translate='';if(!el.getAttribute('style'))el.removeAttribute('style');
    el.animate([{translate:cur},{translate:'0px 0px'}],{duration:SPRING.dur,easing:SPRING.ease});
  }
  d.addEventListener('pointerout',e=>{if(!e.relatedTarget){releaseMag();leaveTilt()}});
  d.addEventListener('click',()=>releaseMag(),true);

  // Cartes : perspective et lumière qui suivent le pointeur.
  const TILT='.service-tile,.portfolio-card';
  let tiltEl=null,traf=0,tx=0,ty=0;
  const leaveTilt=()=>{
    if(!tiltEl)return;const el=tiltEl;tiltEl=null;
    rmClass(el,'is-hover');
    el.style.transform='';el.style.removeProperty('--sm-mx');el.style.removeProperty('--sm-my');
    const img=$('.service-art img,.portfolio-photo img',el);
    if(img&&img.style.translate){const cur=img.style.translate;img.style.translate='';if(!img.getAttribute('style'))img.removeAttribute('style');img.animate([{translate:cur},{translate:'0px 0px'}],{duration:700,easing:EASE.out})}
    if(!el.getAttribute('style'))el.removeAttribute('style');
    clearTimeout(el.__smT);el.__smT=setTimeout(()=>{if(tiltEl!==el)rmClass(el,'sm-tilt')},500);
  };
  d.addEventListener('pointermove',e=>{
    if(env.reduced||!env.fine||e.pointerType!=='mouse')return;
    const el=e.target.closest?.(TILT);
    if(el!==tiltEl){leaveTilt();if(el&&!el.getAnimations().some(a=>!(w.CSSTransition&&a instanceof CSSTransition))){tiltEl=el;clearTimeout(el.__smT);addClass(el,'sm-tilt');requestAnimationFrame(()=>{if(tiltEl===el)addClass(el,'is-hover')})}}
    if(!tiltEl)return;
    tx=e.clientX;ty=e.clientY;
    if(!traf)traf=requestAnimationFrame(()=>{traf=0;const el=tiltEl;if(!el)return;const r=el.getBoundingClientRect(),px=(tx-r.left)/r.width,py=(ty-r.top)/r.height;
      el.style.setProperty('--sm-mx',(px*100).toFixed(1)+'%');el.style.setProperty('--sm-my',(py*100).toFixed(1)+'%');
      const big=r.width>600?.45:1;
      el.style.transform=`perspective(1000px) translateY(-5px) rotateX(${((.5-py)*4*big).toFixed(2)}deg) rotateY(${((px-.5)*5*big).toFixed(2)}deg)`;
      const img=$('.service-art img,.portfolio-photo img',el);if(img)img.style.translate=`${((px-.5)*-9).toFixed(1)}px ${((py-.5)*-7).toFixed(1)}px`;
    });
  },{passive:true});
  d.addEventListener('click',e=>{if(tiltEl&&e.target.closest?.(TILT)===tiltEl)leaveTilt()},true);

  // CTA final : l'astérisque solaire suit le pointeur puis revient.
  d.addEventListener('pointermove',e=>{
    if(env.reduced||!env.fine)return;
    const c=e.target.closest?.('.closing-cta');
    $$('.closing-cta.sm-live').forEach(x=>{if(x!==c)ctaOff(x)});
    if(!c)return;
    clearTimeout(c.__smT);addClass(c,'sm-live');
    const r=c.getBoundingClientRect();c.style.setProperty('--sm-rot',(((e.clientX-r.left)/r.width-.5)*26).toFixed(1)+'deg');
  },{passive:true});
  function ctaOff(c){c.style.setProperty('--sm-rot','0deg');clearTimeout(c.__smT);c.__smT=setTimeout(()=>{rmClass(c,'sm-live');c.style.removeProperty('--sm-rot');if(!c.getAttribute('style'))c.removeAttribute('style')},1150)}

  // Le soleil du hero accélère avec le défilement (inertie), puis retrouve son rythme.
  const sun=$('.pulse-sun');
  if(sun){
    let last=scrollY,lt=performance.now(),rate=1,loop=0;
    const spins=()=>sun.getAnimations().filter(a=>w.CSSAnimation&&a instanceof CSSAnimation);
    const tick=()=>{
      const now=performance.now(),dt=Math.max(16,now-lt),v=Math.abs(scrollY-last)/dt*16;last=scrollY;lt=now;
      const target=1+Math.min(v*.55,14);rate+=(target-rate)*.12;
      spins().forEach(a=>a.playbackRate=rate);
      if(Math.abs(rate-1)>.01||v>.1)loop=requestAnimationFrame(tick);else{loop=0;rate=1;spins().forEach(a=>a.playbackRate=1)}
    };
    w.addEventListener('scroll',()=>{if(!loop&&!env.reduced&&sun.offsetParent){lt=performance.now();loop=requestAnimationFrame(tick)}},{passive:true});
  }

  mobileMenu();
  portfolio();
  lightbox();
  form();
}

function burst(el,e){
  el.__smBurst?.();
  const r=el.getBoundingClientRect(),undo=tempStyle(el,{overflow:'hidden',isolation:'isolate'}),unpos=pos(el);
  const b=fx('span','sm-fx',el),s=Math.max(r.width,r.height)*2.2;
  Object.assign(b.style,{left:e.clientX-r.left-s/2+'px',top:e.clientY-r.top-s/2+'px',width:s+'px',height:s+'px',borderRadius:'50%',background:'radial-gradient(circle,rgba(255,223,41,.55),rgba(252,157,41,.18) 40%,rgba(252,157,41,0) 70%)',zIndex:'-1'});
  const a=b.animate([{transform:'scale(0)',opacity:1},{transform:'scale(1)',opacity:0}],{duration:700,easing:EASE.out});
  const off=()=>{if(el.__smBurst!==off)return;el.__smBurst=null;a.cancel();b.remove();unpos();undo()};
  el.__smBurst=off;a.finished.then(off,()=>{});
}

function mobileMenu(){
  const navEl=$('#nav-mobile'),btn=$('.menu-toggle');if(!navEl||!btn)return;
  const header=$('.site-header'),shell=$('.header-shell');
  btn.addEventListener('click',()=>{if(env.reduced)return;$$('span',btn).forEach((s,i)=>s.animate([{transform:'none'},{transform:`scaleX(${i?.45:.7}) translateX(${i?-4:4}px)`},{transform:'none'}],{duration:520,easing:EASE.soft,delay:i*40}))});
  let wasHidden=navEl.hidden;
  new MutationObserver(()=>{
    const h=navEl.hidden;if(h===wasHidden)return;wasHidden=h;
    if(env.reduced)return;
    if(!h){
      navEl.animate([{clipPath:'inset(0% 0% 100% 0%)'},{clipPath:'inset(0% 0% 0% 0%)'}],{duration:520,easing:EASE.out});
      $$('a',navEl).forEach((a,i)=>a.animate([{opacity:0,transform:'translateY(-14px)'},{opacity:1,transform:'none'}],{duration:620,delay:60+i*45,easing:EASE.out,fill:'backwards'}));
    }else{
      const g=navEl.cloneNode(true);g.removeAttribute('id');g.hidden=false;g.setAttribute('aria-hidden','true');g.inert=true;
      Object.assign(g.style,{position:'absolute',left:'0',right:'0',top:shell.offsetHeight+'px',zIndex:'1'});
      header.append(g);
      const a=g.animate([{clipPath:'inset(0% 0% 0% 0%)',opacity:1},{clipPath:'inset(0% 0% 100% 0%)',opacity:.4}],{duration:380,easing:EASE.inout});
      const off=()=>g.remove();a.finished.then(off,off);
    }
  }).observe(navEl,{attributes:true,attributeFilter:['hidden']});
}

/* Réalisations : filtres en FLIP, pastille active « liquide ». */
function portfolio(){
  const bar=$('.portfolio-filters');if(!bar)return;
  const grid=$('.portfolio-grid'),cards=$$('.portfolio-card',grid);
  let first=null,oldBtn=null,running=[];
  bar.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-filter]');if(!btn||env.reduced){first=null;return}
    running.forEach(a=>a.cancel());running=[];
    first=new Map(cards.filter(c=>!c.hidden).map(c=>[c,c.getBoundingClientRect()]));
    oldBtn=$('button.active',bar);
  },true);
  bar.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-filter]');if(!btn||!first)return;
    const F=first;first=null;
    pill(oldBtn,btn);
    const sc=active?.scope;
    let k=0;
    cards.forEach(c=>{
      if(c.hidden){
        const r=F.get(c);if(!r)return;
        const g=c.cloneNode(true);g.setAttribute('aria-hidden','true');g.inert=true;g.tabIndex=-1;
        Object.assign(g.style,{position:'absolute',margin:'0',left:r.left+scrollX+'px',top:r.top+scrollY+'px',width:r.width+'px',height:r.height+'px',zIndex:'2',pointerEvents:'none'});
        d.body.append(g);
        const a=g.animate([{opacity:1,transform:'none'},{opacity:0,transform:'scale(.9) translateY(10px)'}],{duration:420,easing:EASE.in});
        const off=()=>g.remove();a.finished.then(off,off);
        return;
      }
      const b=sc?.beats.get(c);if(b&&!b.played)return; // pas encore révélée : l'entrée normale s'en charge
      const l=c.getBoundingClientRect(),r=F.get(c);
      let a;
      if(r){const dx=r.left-l.left,dy=r.top-l.top,sx=r.width/l.width,sy=r.height/l.height;
        if(Math.abs(dx)<1&&Math.abs(dy)<1&&Math.abs(sx-1)<.01)return;
        a=c.animate([{transformOrigin:'0 0',transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`},{transformOrigin:'0 0',transform:'none'}],{duration:760,easing:EASE.out});
      }else{
        a=c.animate([{opacity:0,transform:'translateY(26px) scale(.94)'},{opacity:1,transform:'none'}],{duration:820,delay:120+k*60,easing:EASE.out,fill:'backwards'});k++;
      }
      running.push(a);
    });
  });
  // Une seule animation de pastille par bouton : la précédente est annulée
  // et ses styles restaurés avant d'en lancer une nouvelle.
  function fill(el,side,kf,dur,ink){
    el.__smPill?.();
    const u=tempStyle(el,{backgroundColor:'transparent',backgroundImage:`linear-gradient(${ink},${ink})`,backgroundRepeat:'no-repeat',backgroundPosition:side});
    const a=el.animate(kf,{duration:dur,easing:EASE.out});
    const stop=()=>{if(el.__smPill===stop)el.__smPill=null;a.cancel();u()};
    el.__smPill=stop;
    a.finished.then(()=>{if(el.__smPill===stop){el.__smPill=null;u()}},()=>{});
  }
  function pill(a,b){
    if(!b||a===b)return;
    const ra=a?.getBoundingClientRect(),rb=b.getBoundingClientRect(),fromLeft=!ra||ra.left<rb.left;
    const ink=getComputedStyle(root).getPropertyValue('--ink').trim()||'#211c1a';
    fill(b,fromLeft?'0% 50%':'100% 50%',[{backgroundSize:'0% 100%',color:ink,borderColor:'#d8cbbd'},{backgroundSize:'100% 100%',color:'#fff',borderColor:ink}],520,ink);
    if(a)fill(a,fromLeft?'100% 50%':'0% 50%',[{backgroundSize:'100% 100%',color:'#fff',borderColor:ink},{backgroundSize:'0% 100%',color:ink,borderColor:'#d8cbbd'}],420,ink);
  }
}

/* Visionneuse : ouverture depuis la carte, fermeture vers la carte. */
function lightbox(){
  const dlg=$('dialog.lightbox');if(!dlg)return;
  const frame=$('.lightbox-frame',dlg),close=$('.lightbox-close',dlg);
  let from=null,closing=false;
  $$('.portfolio-card').forEach(card=>card.addEventListener('click',()=>{
    if(env.reduced||!dlg.open)return;
    from=card;closing=false;
    const pr=$('.portfolio-photo img',card).getBoundingClientRect(),img=$('img',frame);
    const go=()=>{
      const ir=img.getBoundingClientRect();if(!ir.width)return;
      const s=pr.width/ir.width,dx=(pr.left+pr.width/2)-(ir.left+ir.width/2),dy=(pr.top+pr.height/2)-(ir.top+ir.height/2);
      frame.animate([{transform:`translate(${dx}px,${dy}px) scale(${s})`,borderRadius:'14px'},{transform:'none',borderRadius:'12px'}],{duration:640,easing:EASE.out});
      $('p',frame).animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:500,delay:300,easing:EASE.out,fill:'backwards'});
      close.animate([{opacity:0,transform:'scale(.4) rotate(-90deg)'},{opacity:1,transform:'none'}],{duration:SPRING.dur,delay:260,easing:SPRING.ease,fill:'backwards'});
    };
    if(img.complete&&img.naturalWidth)go();else img.decode().then(go,()=>{});
  }));
  const animatedClose=()=>{
    if(closing||!dlg.open)return;closing=true;
    const card=from&&!from.hidden?from:null;
    let kf=[{transform:'none',opacity:1},{transform:'scale(.92) translateY(12px)',opacity:0}];
    if(card){const pr=card.getBoundingClientRect(),img=$('img',frame),ir=img.getBoundingClientRect();
      if(pr.bottom>0&&pr.top<innerHeight&&ir.width){const s=pr.width/ir.width;kf=[{transform:'none',opacity:1},{transform:`translate(${(pr.left+pr.width/2)-(ir.left+ir.width/2)}px,${(pr.top+pr.height/2)-(ir.top+ir.height/2)}px) scale(${s})`,opacity:.2}]}}
    dlg.classList.add('sm-closing');
    const a=frame.animate(kf,{duration:380,easing:EASE.in,fill:'forwards'});
    const end=()=>{if(!closing)return;a.cancel();dlg.classList.remove('sm-closing');closing=false;if(dlg.open)dlg.close()};
    a.finished.then(end,end);
    setTimeout(end,600);
  };
  dlg.addEventListener('click',e=>{
    if(env.reduced)return;
    if(e.target===close||e.target===dlg){e.stopImmediatePropagation();e.preventDefault();animatedClose()}
  },true);
  dlg.addEventListener('cancel',e=>{if(env.reduced)return;e.preventDefault();animatedClose()});
}

/* Formulaire : retours visuels, sans rien changer à son fonctionnement. */
function form(){
  const f=$('#project-form');if(!f)return;
  f.addEventListener('submit',()=>{
    if(env.reduced)return;
    if(!f.checkValidity()){
      const bad=f.querySelector(':invalid');
      bad?.animate([{translate:'0'},{translate:'-8px 0'},{translate:'7px 0'},{translate:'-5px 0'},{translate:'3px 0'},{translate:'0'}],{duration:520,easing:'ease-out'});
      return;
    }
    const fb=$('.form-feedback',f);
    requestAnimationFrame(()=>{if(fb.hidden)return;
      fb.animate([{clipPath:'inset(0% 100% 0% 0% round 8px)',opacity:.6},{clipPath:'inset(0% 0% 0% 0% round 8px)',opacity:1}],{duration:900,easing:EASE.out});
      fb.animate([{transform:'translateY(10px)'},{transform:'none'}],{duration:900,easing:EASE.out});
    });
  });
}

/* ================================================================ API */
const API={
  env,EASE,SPRING,
  get active(){return active},
  enter,go,navSlide,
  hero:{
    // Utilisé par la cinématique : pose puis joue l'arrivée du hero d'accueil.
    hold(){const sc=active?.scope;if(!sc)return;const b=sc.beatList?.find(x=>x.hero);if(!b)return;b.runOpts={intro:true};run(sc,b,'hold')},
    play(){const sc=active?.scope;if(!sc)return 0;const b=sc.beatList?.find(x=>x.hero);if(!b||b.played)return 0;const t=run(sc,b,'play',0);sc.observe?.();return t},
    skip(){const sc=active?.scope;if(!sc)return;const b=sc.beatList?.find(x=>x.hero);if(b&&!b.played&&b.holds.length){run(sc,b,'play',0)}else if(b)b.played=true;sc.observe?.()},
  },
  liftEnterCurtain,
};
w.SolariaMotion=API;

if(!env.reduced){
  root.classList.remove('js-anim'); // le révélateur d'origine est remplacé par ce système
  footerOnce();
  // Les micro-interactions ne sont pas nécessaires au premier affichage.
  const idle=w.requestIdleCallback||(f=>setTimeout(f,200));
  idle(()=>interactions(),{timeout:600});
}
})();
