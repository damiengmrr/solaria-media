/* =====================================================================
   SOLARIA MEDIA — THE SOLAR REVEAL
   Cinématique d'ouverture : « le point devient soleil ».

   I.   First light  — un point de lumière se lève dans la pénombre chaude.
   II.  Brand reveal — sa lumière inonde le cadre, il devient le point final
        du logo ; la lumière traverse les lettres depuis ce point.
   III. Creative universe — les visuels de l'agence rayonnent autour de la
        marque.
   IV.  Arrival — le logo rejoint le header, la composition rejoint le hero,
        le titre se lève : la dernière image est la page d'accueil.

   Se joue une fois par session, uniquement à l'arrivée sur l'accueil.
   Passer : bouton, Échap, molette, toucher ou clic. Mouvement réduit :
   jamais jouée (le script de <head> ne pose pas le rideau).
   ===================================================================== */
(()=>{
'use strict';
const d=document,root=d.documentElement,w=window;
if(!root.classList.contains('sm-intro'))return;
w.__smIntro=true;
const M=w.SolariaMotion,view=d.querySelector('[data-view="index"]');
const bail=()=>{root.classList.remove('sm-intro');M?.hero.skip()};
if(!M||M.env.reduced||!view||view.hidden){bail();return}
try{sessionStorage.setItem('sm-intro','1')}catch(e){}

const $=(s,c=d)=>c.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,p)=>a+(b-a)*p;
const E={
  lin:p=>p,
  out:p=>p>=1?1:1-Math.pow(2,-10*p),
  out3:p=>1-Math.pow(1-p,3),
  in3:p=>p*p*p,
  io:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,
  io5:p=>p<.5?16*p*p*p*p*p:1-Math.pow(-2*p+2,5)/2,
};

/* ----------------------------------------------------------- géométrie */
const vw=innerWidth,vh=innerHeight;
const small=vw<768||(matchMedia('(pointer:coarse)').matches&&vw<1024);
const LOGO={w:1272,h:517,dx:.9464,dy:.576,dd:.0629}; // point final de « solaria. » mesuré sur le PNG
const W=small?Math.min(vw*.72,360):Math.min(vw*.42,620),Hh=W*LOGO.h/LOGO.w;
const ox=LOGO.dx*W,oy=LOGO.dy*Hh,dotD=LOGO.dd*W;
const Y0=vh*(small?.42:.46);                       // centre vertical du logo
let lx=vw/2-ox;if(small||lx<28)lx=(vw-W)/2;         // le point est au centre de l'écran
const ly=Y0-Hh/2,dotX=lx+ox,dotY=ly+oy;
const sun0={x:dotX,y:vh*(small?.62:.66)};

/* ----------------------------------------------------------- partition */
const TL=small?{
  fade:[0,450],sunIn:[80,450],rise:[200,1050],rays:[250,1050],dawn:[150,1050],streak:[120,850],
  flood:[950,1650],bars:[950,1450],sunDot:[1000,1650],
  logo:[1300,2150],match:[1450,1750],media:[1750,2300],glint:[2050,2650],pulse:[1500,2150],rays2:[1850,2550],
  pan:null,pull:[2150,2700],cards:[2150,110,800],glints:[2500,150,600],credits:null,
  arrive:2900,end:4000
}:{
  fade:[0,700],sunIn:[150,600],rise:[450,2050],rays:[500,2000],dawn:[300,2100],streak:[250,1350],
  flood:[1900,2850],bars:[1900,2600],sunDot:[2050,2850],
  logo:[2650,3650],match:[2850,3150],media:[3200,3900],glint:[3550,4350],pulse:[2900,3700],rays2:[3300,4300],
  pan:[3750,4650],pull:[3850,4850],cards:[4350,85,950],glints:[4950,130,700],credits:[4700,190],
  arrive:5750,end:6900
};
const A=TL.arrive,AR=small?{logo:[0,950],cards:[0,620],hero:[60,1000],day:[300,720],play:380,end:1080}
                          :{logo:[0,1000],cards:[0,700],hero:[80,1100],day:[330,780],play:420,end:1150};
TL.end=A+AR.end;

/* --------------------------------------------------------------- scène */
const IMG='assets/images/';
// Sur mobile, le 3e visuel n'apparaît pas en vignette réduite sur l'accueil :
// son décodage à la taille de la carte ne peut donc pas influer sur le rendu final.
const SRC=small?['expertise-digital','expertise-branding','expertise-contenu']
               :['expertise-digital','expertise-branding','expertise-objets-plv','realisations-campagnes','expertise-campagnes','expertise-contenu'];
const ov=d.createElement('div');ov.id='sm-intro';ov.setAttribute('aria-hidden','true');
const el=(cls,parent=ov,tag='div')=>{const n=d.createElement(tag);n.className=cls;parent.append(n);return n};

let gl=null,cssLight=null;
const lightHost=el('sm-i-layer');
if(!small)gl=initGL(lightHost);
if(!gl){cssLight=el('sm-i-css',lightHost);cssLight.innerHTML='<div class="sm-i-dawn"></div><div class="sm-i-rays"></div><div class="sm-i-glow"></div>'}
const streak=el('sm-i-streak');
const halo=el('sm-i-halo');
const day=el('sm-i-day');
const stage=el('sm-i-stage');stage.style.perspectiveOrigin=`${dotX}px ${dotY}px`;
const world=el('sm-i-world',stage);

const cardW=small?Math.min(vw*.36,170):clamp(vw*.15,170,240);
// Visuels, logo et composition sont décodés à part (fetch + createImageBitmap,
// servis par le cache HTTP) puis peints une fois dans des canvas : la scène ne
// touche jamais au décodage des images de la page, dont le rendu final reste
// ainsi identique au pixel près.
function load(url){
  const viaImg=()=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
  if(!w.createImageBitmap||!w.fetch)return viaImg();
  return fetch(url).then(r=>r.ok?r.blob():Promise.reject()).then(b=>createImageBitmap(b)).catch(viaImg);
}
const dims=o=>[o.naturalWidth||o.width,o.naturalHeight||o.height];
function paint(cv,src,cw,ch){
  const k=Math.min(2,w.devicePixelRatio||1);cv.width=Math.round(cw*k);cv.height=Math.round(ch*k);cv.style.aspectRatio=cw+'/'+ch;
  const g=cv.getContext('2d');if(g){g.imageSmoothingQuality='high';g.drawImage(src,0,0,cv.width,cv.height)}
}
const cards=SRC.map(n=>{const c=el('sm-i-card',world,'figure');const cv=d.createElement('canvas');c.append(cv);c.style.width=cardW+'px';return {el:c,cv,src:IMG+n+'.webp',bm:null}});
const heroImgReal=$('.home-hero-art img',view);
const heroClone=el('sm-i-hero',world);const heroCv=d.createElement('canvas');heroClone.append(heroCv);let heroBm=null;

const brand=el('sm-i-brand',world);
brand.style.width=W+'px';brand.style.transformOrigin=`${ox}px ${oy}px`;
const logoCv=d.createElement('canvas');logoCv.className='sm-i-logo';brand.append(logoCv);
const glintCv=el('sm-i-glint',brand,'canvas');
function paintGlint(src){ // silhouette blanche des lettres, clé de la bande de lumière
  const k=Math.min(2,w.devicePixelRatio||1);glintCv.width=Math.round(W*k);glintCv.height=Math.round(Hh*k);
  const g=glintCv.getContext('2d');if(!g)return;
  g.drawImage(src,0,0,glintCv.width,glintCv.height);g.globalCompositeOperation='source-in';
  const lg=g.createLinearGradient(0,0,glintCv.width,0);lg.addColorStop(0,'#fff');lg.addColorStop(.5,'#fff6c8');lg.addColorStop(1,'#fff');
  g.fillStyle=lg;g.fillRect(0,0,glintCv.width,glintCv.height);
}
const pulse=el('sm-i-pulse',brand);Object.assign(pulse.style,{left:ox-dotD/2+'px',top:oy-dotD/2+'px',width:dotD+'px',height:dotD+'px'});
const NS='http://www.w3.org/2000/svg',raysSvg=d.createElementNS(NS,'svg');raysSvg.setAttribute('class','sm-i-rays-svg');
const RR=dotD*2.3;Object.assign(raysSvg.style,{left:ox-RR+'px',top:oy-RR+'px',width:RR*2+'px',height:RR*2+'px'});raysSvg.setAttribute('viewBox',`${-RR} ${-RR} ${RR*2} ${RR*2}`);
const rays=[];for(let k=0;k<12;k++){const a=k/12*Math.PI*2,l=d.createElementNS(NS,'line');l.setAttribute('x1',Math.cos(a)*dotD*.82);l.setAttribute('y1',Math.sin(a)*dotD*.82);l.setAttribute('x2',Math.cos(a)*dotD*(k%2?1.55:1.85));l.setAttribute('y2',Math.sin(a)*dotD*(k%2?1.55:1.85));raysSvg.append(l);rays.push(l)}
brand.append(raysSvg);
const sun=el('sm-i-sun',world);

let credits=null;
if(TL.credits){credits=el('sm-i-credits');[...view.querySelectorAll('.service-tile h3')].forEach(h=>{const s=d.createElement('span');s.textContent=h.textContent;credits.append(s)})}
el('sm-i-layer sm-i-bars');
const grain=el('sm-i-grain');

const skip=d.createElement('button');skip.type='button';skip.className='sm-skip';
skip.innerHTML='Passer l’introduction <span aria-hidden="true">→</span><i aria-hidden="true"></i>';

d.body.prepend(skip);d.body.prepend(ov);
root.classList.remove('sm-intro'); // la scène a pris le relais du rideau CSS

// Positions des cartes : un rayonnement autour de la marque.
const angles=small?[-90,32,148]:[-150,-90,-30,30,90,150];
const rx=small?vw*.3:Math.min(vw*.36,580),ry=small?vh*.25:Math.min(vh*.34,330);
const orbit=angles.map((deg,i)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:vw/2+rx*c,y:Y0+ry*s,ry:-c*18,rx:-s*10,rz:-c*4+(i%2?1.5:-1.5)}});

/* ----------------------------------------------------- chargement */
const ready={logo:false,cards:false,hero:false},bitmaps=[];
const keep=o=>{if(o&&o.close)bitmaps.push(o);return o};
load(IMG+'logo-solaria.png').then(o=>{keep(o);paint(logoCv,o,W,Hh);paintGlint(o);ready.logo=true},()=>{});
// Les visuels de l'acte III attendent que l'image du hero (LCP) soit chargée.
const loadCards=()=>{if(loadCards.done)return;loadCards.done=true;
  Promise.all(cards.map(c=>load(c.src).then(o=>{keep(o);const [nw,nh]=dims(o);paint(c.cv,o,cardW-12,(cardW-12)*nh/nw);c.h=c.el.offsetHeight;return true},()=>false)))
    .then(r=>{ready.cards=r.every(Boolean)})};
if(heroImgReal.complete)loadCards();else{heroImgReal.addEventListener('load',loadCards,{once:true});heroImgReal.addEventListener('error',loadCards,{once:true});setTimeout(loadCards,1400)}
load(heroImgReal.currentSrc||heroImgReal.src).then(o=>{heroBm=keep(o);ready.hero=true},()=>{});

/* ---------------------------------------------------------- arrivée */
let targets=null,heldReal=[];
function holdReal(n){const a=n.animate([{opacity:0},{opacity:0}],{duration:1000,fill:'both'});a.pause();heldReal.push({n,a});return a}
function releaseReal(n){heldReal=heldReal.filter(h=>{if(h.n===n){h.a.cancel();return false}return true})}
function prepareArrival(){
  const brandReal=$('.brand img'),heroReal=heroImgReal;
  targets={brand:brandReal.getBoundingClientRect(),hero:heroReal.getBoundingClientRect(),brandEl:brandReal,heroEl:heroReal};
  if(heroBm)paint(heroCv,heroBm,targets.hero.width,targets.hero.height);
  holdReal(brandReal);holdReal(heroReal);
  M.hero.hold();
  skip.classList.add('is-gone');
}

/* ------------------------------------------------------------- rendu */
let t=0,last=null,raf=0,over=false,arrived=false,played=false,swappedLogo=false,swappedHero=false,glDone=false,waitT=0,skipUniverse=false;
const P=(r,e=E.lin,tt=t)=>e(clamp((tt-r[0])/(r[1]-r[0])));
const F=.2*Math.max(vw,vh),R=Math.hypot(Math.max(dotX,vw-dotX),Math.max(dotY,vh-dotY));
const sPull=small?.9:.8;

function brandPose(tt){
  const settle=P(TL.logo,E.out,tt);
  const s=lerp(1,sPull,P(TL.pull,E.io,tt));
  const cx0=lx+W/2,X=TL.pan?lerp(cx0,vw/2,P(TL.pan,E.io5,tt)):cx0;
  return {tx:X-ox-(W/2-ox)*s,ty:Y0-oy-(Hh/2-oy)*s,z:lerp(-180,0,settle),rx:lerp(18,0,settle),s};
}
function render(){
  /* I — lumière */
  const rise=P(TL.rise,E.io);
  const sx=sun0.x,sy=lerp(sun0.y,dotY,rise);
  let size=lerp(0,8,P(TL.sunIn,E.out3));
  size=lerp(size,small?30:46,P([TL.sunIn[1],TL.rise[1]],E.io));
  size=lerp(size,dotD,P(TL.sunDot,E.io));
  sun.style.transform=`translate3d(${sx}px,${sy}px,0) scale(${size/100})`;
  sun.style.opacity=(1-P(TL.match,E.io)).toFixed(3);
  sun.style.setProperty('--sm-sg',(1-P([TL.flood[0]+150,TL.sunDot[1]],E.io)).toFixed(3));
  const fade=P(TL.fade,E.out3),glow=lerp(.22,1,P(TL.rise,E.io)),ray=P(TL.rays,E.io),dawn=P(TL.dawn,E.io);
  const st=P(TL.streak,E.out3)*(1-.55*P([TL.streak[1],TL.flood[0]]));
  const fl=P(TL.flood,E.io);
  if(!glDone){
    if(gl)gl.draw(t/1000,sx,sy,fade,glow,ray,dawn,st);
    else{const [dn,ry,gw]=cssLight.children;dn.style.opacity=(dawn*fade).toFixed(3);
      gw.style.transform=`translate3d(${sx}px,${sy}px,0) scale(${(.12+glow*.88).toFixed(3)})`;gw.style.opacity=fade.toFixed(3);
      ry.style.transform=`translate3d(${sx}px,${sy}px,0) rotate(${(t*.006).toFixed(2)}deg) scale(${(.6+glow*.5).toFixed(3)})`;ry.style.opacity=(ray*fade*.9).toFixed(3)}
    // l'aube recouvre tout : la pénombre et la lumière WebGL sont libérées
    if(fl>=1){glDone=true;lightHost.remove();gl?.dispose();gl=null;ov.style.background='transparent'}
  }
  streak.style.transform=`translate3d(${sx}px,${sy}px,0) scaleX(${st.toFixed(3)})`;
  streak.style.opacity=(st*fade*(1-fl)).toFixed(3);
  /* II — l'aube, puis la marque */
  ov.style.setProperty('--sx',sx+'px');ov.style.setProperty('--sy',sy+'px');
  ov.style.setProperty('--sm-r',lerp(-F,R+F,fl).toFixed(1)+'px');
  halo.style.opacity=(fl>0&&fl<1?Math.sin(fl*Math.PI):0).toFixed(3);
  ov.style.setProperty('--sm-bar',(1-P(TL.bars,E.io)).toFixed(3));
  grain.style.opacity=(.07*(1-fl)).toFixed(3);
  skip.classList.toggle('is-day',fl>.45);
  skip.style.setProperty('--sm-p',(t/TL.end).toFixed(3));

  if(t>=TL.logo[0]-50){
    const b=brandPose(t);
    let tf=`translate3d(${b.tx.toFixed(2)}px,${b.ty.toFixed(2)}px,${b.z.toFixed(1)}px) rotateX(${b.rx.toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
    if(arrived){
      const p=P([A+AR.logo[0],A+AR.logo[1]],E.io5),r=targets.brand,s1=r.width/W;
      const tx1=r.left-ox*(1-s1),ty1=r.top-oy*(1-s1);
      tf=`translate3d(${lerp(b.tx,tx1,p).toFixed(2)}px,${lerp(b.ty,ty1,p).toFixed(2)}px,0) scale(${lerp(b.s,s1,p).toFixed(4)})`;
    }
    brand.style.transform=tf;
    const blur=lerp(10,0,P([TL.logo[0],TL.logo[0]+800],E.out3));
    brand.style.filter=blur>.05?`blur(${blur.toFixed(2)}px)`:'none';
    brand.style.setProperty('--sm-a',(P(TL.logo,E.io)*100).toFixed(2)+'%');
    brand.style.setProperty('--sm-b',(100-P(TL.media,E.io)*100).toFixed(2)+'%');
    brand.style.setProperty('--sm-g',(100-P(TL.glint,E.io)*100).toFixed(2)+'%');
    const pu=P(TL.pulse,E.out3);
    pulse.style.transform=`scale(${(1+pu*3.4).toFixed(3)})`;pulse.style.opacity=(pu>0?(1-pu)*.85:0).toFixed(3);
    const g=P([TL.rays2[0],TL.rays2[0]+(TL.rays2[1]-TL.rays2[0])*.5],E.out3),r=P([TL.rays2[0]+(TL.rays2[1]-TL.rays2[0])*.55,TL.rays2[1]],E.io);
    rays.forEach((l,k)=>{const len=dotD*(k%2?.73:1.03);l.style.strokeDasharray=len;l.style.strokeDashoffset=(len*(1-g)-len*r).toFixed(2);l.style.opacity=g>0&&r<1?1:0});
  }else brand.style.transform='translate3d(-9999px,0,0)';

  /* III — l'univers créatif */
  const [c0,cs,cd]=TL.cards;
  cards.forEach((c,i)=>{
    const o=orbit[i],t0=c0+i*cs,p=skipUniverse?0:P([t0,t0+cd],E.out);
    if(p<=0&&!arrived){c.el.style.opacity='0';return}
    const h=c.h||cardW*.6,fl2=Math.sin((t-t0)/650+i*1.7)*5;
    let x=lerp(vw/2,o.x,p),y=lerp(Y0,o.y,p)+fl2*p,z=lerp(-700,0,p),sc=lerp(.25,1,p),op=clamp(p*3),rY=o.ry*p,rX=o.rx*p,rZ=o.rz*p+Math.sin((t-t0)/900+i)*1.2*p;
    if(arrived){
      const q=P([A+AR.cards[0]+i*40,A+AR.cards[1]+i*40],E.in3),r=targets.hero;
      x=lerp(x,r.left+r.width/2,q);y=lerp(y,r.top+r.height/2,q);z=lerp(z,-160,q);sc=lerp(sc,.3,q);op*=1-clamp(q*1.4);rY*=1-q;rX*=1-q;rZ*=1-q;
    }
    c.el.style.opacity=op.toFixed(3);
    c.el.style.transform=`translate3d(${(x-cardW/2).toFixed(1)}px,${(y-h/2).toFixed(1)}px,${z.toFixed(1)}px) rotateY(${rY.toFixed(2)}deg) rotateX(${rX.toFixed(2)}deg) rotateZ(${rZ.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    const [g0,gs,gd]=TL.glints;c.el.style.setProperty('--sm-g',(100-P([g0+i*gs,g0+i*gs+gd],E.io)*100).toFixed(1)+'%');
  });
  if(credits){const [k0,ks]=TL.credits,out=P([A-250,A+150],E.io);[...credits.children].forEach((s,i)=>{const p=P([k0+i*ks,k0+i*ks+520],E.out3);s.style.opacity=(p*(1-out)).toFixed(3);s.style.setProperty('--sm-d',p.toFixed(3))})}

  /* IV — l'arrivée */
  if(arrived){
    const r=targets.hero,p=P([A+AR.hero[0],A+AR.hero[1]],E.out);
    const iw=r.width,s=lerp(.18,1,p),x=lerp(vw/2-iw*.18/2,r.left,p),y=lerp(Y0-r.height*.18/2,r.top,p);
    heroClone.style.width=iw+'px';
    heroClone.style.opacity=clamp(P([A+AR.hero[0],A+AR.hero[0]+260])).toFixed(3);
    heroClone.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${lerp(-400,0,p).toFixed(1)}px) scale(${(s).toFixed(4)})`;
    const dp=P([A+AR.day[0],A+AR.day[1]],E.io);day.style.opacity=(1-dp).toFixed(3);
    if(!played&&t>=A+AR.play){played=true;M.hero.play()}
    if(!swappedLogo&&t>=A+AR.logo[1]){swappedLogo=true;releaseReal(targets.brandEl);brand.remove()}
    if(!swappedHero&&t>=A+AR.hero[1]){swappedHero=true;releaseReal(targets.heroEl);heroClone.remove()}
  }else heroClone.style.opacity='0';
}

function frame(now){
  if(over)return;
  if(last===null)last=now;
  const dt=Math.min(now-last,50);last=now;
  // portes : on n'avance pas sans les images nécessaires (attente bornée)
  let hold=false;
  if(t<TL.logo[0]&&t+dt>=TL.logo[0]&&!ready.logo){waitT+=dt;hold=waitT<1600;if(!hold&&!ready.logo){return finish(true)}}
  else if(t<TL.cards[0]&&t+dt>=TL.cards[0]&&!ready.cards){waitT+=dt;hold=waitT<700;if(!hold)skipUniverse=true}
  else if(t<A&&t+dt>=A&&!ready.hero){waitT+=dt;hold=waitT<1500}
  else waitT=0;
  if(!hold)t+=dt;
  if(skipUniverse&&t>TL.cards[0]&&t<A-300)t=A-300;
  if(!arrived&&t>=A){arrived=true;prepareArrival()}
  render();
  if(t>=TL.end)return finish(false);
  raf=requestAnimationFrame(frame);
}

/* ------------------------------------------------------ fin & passer */
function cleanup(){
  over=true;cancelAnimationFrame(raf);
  removeEventListener('keydown',onKey,true);removeEventListener('wheel',onWheel,{capture:true});removeEventListener('touchmove',onWheel,{capture:true});removeEventListener('resize',onResize);
  heldReal.forEach(h=>h.a.cancel());heldReal=[];
  gl?.dispose();gl=null;
  bitmaps.forEach(b=>{try{b.close()}catch(e){}});bitmaps.length=0;
}
function finish(fast){
  if(over)return;
  cleanup();
  if(!fast){ov.remove();skip.remove();return}
  // passage rapide : la scène s'efface, le hero se pose.
  if(!arrived)M.hero.hold();
  M.hero.play();
  const a=ov.animate([{opacity:1},{opacity:0}],{duration:420,easing:'cubic-bezier(.25,1,.5,1)',fill:'forwards'});
  skip.classList.add('is-gone');
  const end=()=>{ov.remove();skip.remove()};
  a.finished.then(end,end);
}
const doSkip=()=>finish(true);
function onKey(e){if(['Tab','Shift','Control','Alt','Meta','CapsLock'].includes(e.key))return;if(e.target===skip&&(e.key==='Enter'||e.key===' '))return;e.preventDefault();doSkip()}
function onWheel(e){e.preventDefault();doSkip()}
function onResize(){if(Math.abs(innerWidth-vw)>40||Math.abs(innerHeight-vh)>120)doSkip()}
skip.addEventListener('click',doSkip);
ov.addEventListener('pointerdown',doSkip);
addEventListener('keydown',onKey,true);
addEventListener('wheel',onWheel,{passive:false,capture:true});
addEventListener('touchmove',onWheel,{passive:false,capture:true});
addEventListener('resize',onResize);

render();
raf=requestAnimationFrame(frame);

/* ============================================ lumière WebGL (desktop)
   Un seul quad plein écran : pénombre chaude, rayons volumétriques,
   halo, grain. Résolution réduite (la lumière est douce), contexte
   libéré dès que l'aube a recouvert l'écran. */
function initGL(host){
  try{
    const cv=d.createElement('canvas');cv.className='sm-i-gl';
    const g=cv.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!g)return null;
    const k=Math.min(1,w.devicePixelRatio||1)*.7;
    cv.width=Math.round(vw*k);cv.height=Math.round(vh*k);
    const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs=`precision mediump float;
uniform vec2 uR;uniform vec2 uS;uniform float uT,uG,uY,uD,uK,uF;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 fc=gl_FragCoord.xy,uv=fc/uR;
  vec2 q=(fc-uS)/uR.y;float r=length(q);float a=atan(q.y,q.x)+uT*.045;
  vec3 ink=vec3(.129,.110,.102),emb=vec3(.40,.12,.07),fla=vec3(.929,.271,.180),ora=vec3(.988,.616,.161),sun=vec3(1.,.875,.161);
  float hz=uS.y/uR.y;
  vec3 c=ink;
  c=mix(c,emb,smoothstep(hz+.45,hz-.35,uv.y)*uD*.9);
  c=mix(c,fla*.62,exp(-r*3.2)*uD*.55);
  vec2 cs=vec2(cos(a),sin(a));
  float ry=n(cs*3.2+vec2(uT*.22,0.))*.62+n(cs*8.5-vec2(0.,uT*.17))*.38;
  ry=smoothstep(.42,1.,ry);
  float fo=exp(-r*2.4);
  c+=mix(ora,sun,fo)*ry*fo*uY*.95;
  float g=max(uG,.001);
  c+=sun*exp(-r*r/(.0011*g*g))*1.25;
  c+=ora*exp(-r*r/(.016*g*g))*.62;
  c+=fla*exp(-r/(.42*g))*.22;
  c+=mix(ora,sun,.65)*exp(-abs(q.y)*150.)*exp(-abs(q.x)*1.5)*uK*.75;
  vec2 v=uv-.5;c*=1.-dot(v,v)*.85;
  c+=(h(fc+fract(uT*7.)*vec2(91.,57.))-.5)*.035;
  gl_FragColor=vec4(c*uF,1.);
}`;
    const sh=(t,s)=>{const o=g.createShader(t);g.shaderSource(o,s);g.compileShader(o);if(!g.getShaderParameter(o,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(o));return o};
    const pr=g.createProgram();g.attachShader(pr,sh(g.VERTEX_SHADER,vs));g.attachShader(pr,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(pr);
    if(!g.getProgramParameter(pr,g.LINK_STATUS))throw new Error('link');
    g.useProgram(pr);
    const buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);
    const loc=g.getAttribLocation(pr,'p');g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,2,g.FLOAT,false,0,0);
    const U={};['uR','uS','uT','uG','uY','uD','uK','uF'].forEach(n=>U[n]=g.getUniformLocation(pr,n));
    g.viewport(0,0,cv.width,cv.height);g.uniform2f(U.uR,cv.width,cv.height);
    host.append(cv);
    let lost=false;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});
    return {
      draw(time,x,y,f,glow,ray,dawn,stk){if(lost)return;g.uniform2f(U.uS,x*k,(vh-y)*k);g.uniform1f(U.uT,time);g.uniform1f(U.uG,glow);g.uniform1f(U.uY,ray);g.uniform1f(U.uD,dawn);g.uniform1f(U.uK,stk);g.uniform1f(U.uF,f);g.drawArrays(g.TRIANGLES,0,3)},
      dispose(){if(lost)return;lost=true;try{g.deleteBuffer(buf);g.deleteProgram(pr);g.getExtension('WEBGL_lose_context')?.loseContext()}catch(e){}cv.remove()}
    };
  }catch(e){return null}
}
})();
