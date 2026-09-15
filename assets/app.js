const SECTOR={finance:"مصرفي ومالي",gov:"حكومي",erp:"منظومة ERP",auctions:"مزادات",commerce:"تجارة",logistics:"لوجستيات",apps:"تطبيق جوال",ai:"ذكاء اصطناعي"};
let projects=[],filter="all";
document.getElementById("year").textContent=new Date().getFullYear();
// hero mock screens
for(const id of["hero-screen-1","hero-screen-2"]){const s=document.getElementById(id);s.innerHTML='<div class="bar or"></div><div class="bar" style="width:70%"></div><div class="box"></div><div class="box"></div><div class="bar" style="width:50%"></div>';}
// counters
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target,t=+el.dataset.count;let n=0;const st=setInterval(()=>{n=Math.min(t,n+Math.ceil(t/30));el.textContent=n+"+";if(n>=t)clearInterval(st)},40);io.unobserve(el)}));
document.querySelectorAll("[data-count]").forEach(el=>io.observe(el));
fetch("data/projects.json").then(r=>r.json()).then(d=>{projects=d;render()});
function render(){const g=document.getElementById("projects");const list=projects.filter(p=>filter==="all"||p.sector===filter);
g.innerHTML=list.map(p=>`<article class="proj" data-id="${p.id}"><div class="shot">${p.icon}${p.demo?'<span class="live">● LIVE DEMO</span>':''}</div><div class="body"><div class="tag">${SECTOR[p.sector]||""} · ${p.tag}</div><h3>${p.name}</h3><p>${p.desc}</p><div class="tech">${p.tech.map(t=>`<span>${t}</span>`).join("")}</div><div class="acts"><button class="btn btn-primary" onclick="openDemo('${p.id}')">▶ جرّب الديمو</button><a class="btn btn-ghost" href="#quote">اطلب نسختك</a></div></div></article>`).join("")||'<p class="sub">لا توجد منظومات في هذا التصنيف بعد.</p>';}
document.getElementById("filters").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;filter=b.dataset.f;document.querySelectorAll("#filters button").forEach(x=>x.classList.toggle("on",x===b));render()});
document.querySelectorAll("[data-goto]").forEach(a=>a.addEventListener("click",()=>{const b=document.querySelector(`#filters [data-f="${a.dataset.goto}"]`);b&&b.click()}));
const modal=document.getElementById("modal"),frame=document.getElementById("m-frame"),body=document.getElementById("m-body");
function openDemo(id){const p=projects.find(x=>x.id===id);if(!p)return;document.getElementById("m-title").textContent=p.name;document.getElementById("m-tag").textContent=p.tag;
document.getElementById("m-nodemo").hidden=!!p.demo;const o=document.getElementById("m-open");o.hidden=!p.demo;o.href=p.demo||"#";frame.src=p.demo||"about:blank";modal.hidden=false;document.body.style.overflow="hidden"}
function closeModal(){modal.hidden=true;frame.src="about:blank";document.body.style.overflow=""}
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
document.querySelectorAll("[data-dev]").forEach(b=>b.addEventListener("click",()=>{body.className="modal-body dev-"+b.dataset.dev;document.querySelectorAll("[data-dev]").forEach(x=>x.classList.toggle("on",x===b))}));
document.getElementById("quote-form").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target);const msg=[...f.entries()].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join("\n");
window.open("https://wa.me/218910000000?text="+encodeURIComponent("طلب عرض سعر جديد:\n"+msg),"_blank");e.target.reset();alert("تم تجهيز طلبك وفتح واتساب لإرساله. سنتواصل معك خلال 24 ساعة.")});
