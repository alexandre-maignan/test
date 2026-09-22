const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- cursor ---------- */
function initCursor(){
  if(reduced){ document.querySelector('.cursor').style.display='none'; return; }
  gsap.set('.cursor',{xPercent:-50,yPercent:-50});
  const cx = gsap.quickTo('.cursor','x',{duration:.6,ease:'power3'});
  const cy = gsap.quickTo('.cursor','y',{duration:.6,ease:'power3'});
  window.addEventListener('mousemove', e=>{cx(e.clientX); cy(e.clientY);});
}

/* ---------- loader (first load only) ---------- */
function initLoader(){
  const loader = document.getElementById('loader');
  if(!loader) return;
  if(sessionStorage.getItem('oblique-loaded')){ loader.remove(); return; }
  sessionStorage.setItem('oblique-loaded','1');
  const bar = loader.querySelector('.bar');
  const mark = loader.querySelector('.mark');
  gsap.timeline({defaults:{ease:'power4.inOut'}})
    .to(bar,{scaleX:1,duration:1.1})
    .to(mark,{opacity:1,duration:.5},'<')
    .to(loader,{autoAlpha:0,duration:.6,onComplete:()=>loader.remove()},'+=.2');
}

/* ---------- per-page widgets ---------- */
function numberWork(root=document){
  root.querySelectorAll('[data-worklist]').forEach(list=>{
    list.querySelectorAll('[data-work-item]').forEach((item,i)=>{
      item.querySelector('.work-idx').textContent = '['+String(i+1).padStart(2,'0')+']';
    });
  });
}
function initTabs(root=document){
  const btns = root.querySelectorAll('.tab-btn');
  btns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btns.forEach(b=>b.classList.remove('active'));
      root.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      root.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add('active');
    });
  });
}
let clockTimer;
function initClock(root=document){
  clearInterval(clockTimer);
  const el = root.querySelector('[data-clock]');
  if(!el) return;
  const fmt = new Intl.DateTimeFormat([], {timeZone:'Australia/Sydney', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false});
  const set = ()=> el.textContent = fmt.format(new Date());
  set(); clockTimer = setInterval(set,1000);
}
function initPage(root=document){
  numberWork(root);
  initTabs(root);
  initClock(root);
}

/* ---------- nav active state ---------- */
function setActiveLink(){
  const path = location.pathname.replace(/\/index\.html$/,'/').replace(/\/$/,'/index.html');
  document.querySelectorAll('.links a').forEach(a=>{
    const href = a.getAttribute('href');
    a.classList.toggle('is-current', href === path || (href === 'index.html' && (path.endsWith('/index.html'))));
  });
}

/* ---------- transition router (fetches real, separate .html pages) ---------- */
function initRouter(){
  const main = document.querySelector('main[data-barba]');
  if(!main) return;

  document.body.addEventListener('click', async (e)=>{
    const a = e.target.closest('a[data-link]');
    if(!a) return;
    const url = a.getAttribute('href');
    if(!url || url.startsWith('#') || a.target === '_blank') return;
    e.preventDefault();
    if(location.pathname.endsWith('/'+url) || (url==='index.html' && location.pathname.endsWith('/'))) return;

    let html;
    try{
      const res = await fetch(url);
      html = await res.text();
    }catch(err){
      location.href = url; // fallback: plain navigation (e.g. running from file://)
      return;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nextMain = doc.querySelector('main[data-barba]');
    if(!nextMain){ location.href = url; return; }

    history.pushState({}, '', url);
    document.title = doc.title;

    if(reduced){
      main.replaceWith(nextMain);
      afterSwap(nextMain, url);
      return;
    }

    const tl = gsap.timeline({defaults:{duration:1.1, ease:'power4.inOut'}});
    gsap.set(nextMain, {clipPath:'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'});

    tl.to(main, {yPercent:-100, overwrite:'auto'}, 0)
      .call(()=>{ main.replaceWith(nextMain); afterSwap(nextMain, url); }, [], 0.05)
      .fromTo(nextMain, {clipPath:'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'},
                          {clipPath:'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', overwrite:'auto'}, 0);
  });

  window.addEventListener('popstate', ()=> location.reload());
}
function afterSwap(nextMain, url){
  setActiveLink();
  initPage(nextMain);
  window.scrollTo(0,0);
}

/* ---------- init ---------- */
initCursor();
initLoader();
setActiveLink();
initPage();
initRouter();
