const CATEGORIES = [
  ["🍝","Cibo"],["🛒","Spesa alimentare"],["🍹","Bar / Aperitivi"],["🍕","Ristoranti"],
  ["🏠","Casa"],["🚇","Trasporti"],["⛽","Auto"],["✈️","Viaggi"],["🛍️","Shopping"],
  ["🎬","Intrattenimento"],["📺","Abbonamenti"],["🏋️","Sport"],["💊","Salute"],["💼","Lavoro"],
  ["💰","Stipendio"],["↗️","Altre entrate"],["📦","Altro"]
];
const CAT = Object.fromEntries(CATEGORIES.map(x=>[x[1],x[0]]));
const KEY="money_tracker_v1";
let state = {transactions:[],name:""};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.transactions)) state = parsed;
  }
} catch (e) {
  localStorage.removeItem(KEY);
}
let currentType="expense", editingId=null, currentFilter="all";

const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const dateISO=()=>new Date().toISOString().slice(0,10);
const fmtDate=d=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short"}).format(new Date(d+"T12:00:00"));
function saveState(){localStorage.setItem(KEY,JSON.stringify(state)); renderAll();}
function monthName(){return new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date()).toUpperCase()}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function suggestCategory(text,type){
  if(type==="income"){
    if(/stipend|salary|paga|ral|busta|lavoro|bonifico.*lavor/i.test(text)) return ["Stipendio",96];
    return ["Altre entrate",86];
  }
  const rules=[
    [/esselunga|carrefour|conad|coop|lidl|aldi|penny|ipercoop|supermercat|grocery|spesa/i,"Spesa alimentare",98],
    [/pizz|sushi|ristorant|mcdonald|burger|osteria|trattoria|deliveroo|just ?eat|glovo|cena|pranzo/i,"Ristoranti",96],
    [/aperitiv|bar |cocktail|pub |birr|spritz/i,"Bar / Aperitivi",94],
    [/uber|taxi|bolt|atm |metro|trenitalia|italo|autobus|bus |tram |tren|bigliett/i,"Trasporti",96],
    [/benzina|diesel|carburante|stazione di servizio|eni |q8|tamoil/i,"Auto",97],
    [/netflix|spotify|prime video|disney|now tv|youtube premium|abbonament/i,"Abbonamenti",99],
    [/amazon|zalando|zara|h&m|uniqlo|ikea|shopping|acquisto/i,"Shopping",88],
    [/cinema|teatro|concerto|playstation|xbox|steam|discoteca|locale/i,"Intrattenimento",92],
    [/hotel|airbnb|booking|ryanair|easyjet|volo|aereo|vacanza/i,"Viaggi",96],
    [/farmacia|medico|dentista|visita|salute/i,"Salute",96],
    [/palestra|gym|fitness|sport|decathlon/i,"Sport",94],
    [/affitto|mutuo|enel|a2a|bolletta|condominio|casa/i,"Casa",93],
    [/lavoro|ufficio|coworking/i,"Lavoro",86]
  ];
  for(const [re,cat] of rules) if(re.test(text)) return [cat,Math.min(99,90+Math.floor(Math.random()*9))];
  return ["Altro",62];
}

function renderAll(){renderHome();renderTransactions();renderAnalysis();$("monthLabel").textContent=monthName();$("userName").textContent=state.name?`, ${escapeHTML(state.name)}`:"!";$("nameInput").value=state.name||""}
function monthTx(){
  const ym=dateISO().slice(0,7);
  return state.transactions.filter(t=>t && typeof t.date==="string" && t.date.startsWith(ym));
}
function renderHome(){
  const tx=monthTx(), income=tx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0), expense=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  $("incomeTotal").textContent=euro(income);$("expenseTotal").textContent=euro(expense);$("balance").textContent=euro(income-expense);
  $("balanceDelta").textContent=income-expense>=0?`+${euro(income-expense)}`:euro(income-expense);
  const cats={};tx.filter(t=>t.type==="expense").forEach(t=>cats[t.category]=(cats[t.category]||0)+t.amount);
  const rows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5), total=expense||1;
  $("categoryList").innerHTML=rows.length?rows.map(([c,v])=>`<div class="cat-row"><div class="cat-icon">${CAT[c]||"📦"}</div><div class="cat-main"><strong>${escapeHTML(c)}</strong><small>${Math.round(v/total*100)}% del totale</small></div><div class="cat-value">${euro(v)}<small>${Math.round(v/total*100)}%</small></div></div>`).join(""):`<div class="empty"><b>Nessuna spesa questo mese</b>Aggiungi la prima transazione.</div>`;
  drawBalanceChart(tx);
}
function drawBalanceChart(tx){
  const c=$("balanceChart"),ctx=c.getContext("2d"),w=c.width=c.clientWidth*2,h=c.height=c.clientHeight*2;ctx.scale(2,2);
  const W=c.clientWidth,H=c.clientHeight,pad=14;ctx.clearRect(0,0,W,H);
  const days=Array.from({length:new Date().getDate()},(_,i)=>i+1), points=[];let running=0;
  for(const d of days){tx.filter(t=>Number(t.date.slice(8))===d).forEach(t=>running+=t.type==="income"?t.amount:-t.amount);points.push(running)}
  if(!points.length)return;
  const min=Math.min(0,...points),max=Math.max(1,...points),range=max-min||1;
  ctx.strokeStyle="rgba(255,255,255,.07)";ctx.lineWidth=1;
  for(let i=1;i<4;i++){const y=pad+(H-pad*2)*i/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke()}
  const grad=ctx.createLinearGradient(0,0,W,0);grad.addColorStop(0,"#61e4c0");grad.addColorStop(1,"#55cfff");
  ctx.strokeStyle=grad;ctx.lineWidth=3;ctx.lineJoin="round";ctx.beginPath();
  points.forEach((v,i)=>{const x=pad+(W-pad*2)*(i/Math.max(1,points.length-1)),y=H-pad-(v-min)/range*(H-pad*2);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  const x=W-pad,y=H-pad-(points.at(-1)-min)/range*(H-pad*2);ctx.fillStyle="#61e4c0";ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
}
function renderTransactions(){
  let list=state.transactions.filter(t=>t && typeof t.date==="string").sort((a,b)=>b.date.localeCompare(a.date)||(Number(b.id)||0)-(Number(a.id)||0));
  if(currentFilter!=="all")list=list.filter(t=>t.type===currentFilter);
  const q=($("searchInput")?.value||"").toLowerCase();if(q)list=list.filter(t=>`${t.description} ${t.category} ${t.note||""}`.toLowerCase().includes(q));
  const el=$("transactionList");if(!list.length){el.innerHTML=`<div class="empty"><b>Nessuna transazione</b>Prova ad aggiungerne una con il pulsante +.</div>`;return}
  let last="";el.innerHTML=list.map(t=>{let head="";if(t.date!==last){last=t.date;head=`<div class="tx-group">${fmtDate(t.date).toUpperCase()}</div>`}return head+`<div class="tx-row" data-id="${t.id}"><div class="tx-icon">${CAT[t.category]||"📦"}</div><div class="tx-main"><strong>${escapeHTML(t.description||t.category)}</strong><small>${escapeHTML(t.category)}${t.note?" · "+escapeHTML(t.note):""}</small></div><div class="tx-amount ${t.type}">${t.type==="income"?"+":"-"}${euro(t.amount)}</div></div>`}).join("");
  el.querySelectorAll(".tx-row").forEach(r=>r.onclick=()=>openModal(Number(r.dataset.id)));
}
function renderAnalysis(){
  const tx=monthTx(), ex=tx.filter(t=>t.type==="expense"), total=ex.reduce((s,t)=>s+t.amount,0),inc=tx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  $("avgExpense").textContent=euro(ex.length?total/ex.length:0);$("savingRate").textContent=inc?Math.round((inc-total)/inc*100)+"%":"0%";
  const cats={};ex.forEach(t=>cats[t.category]=(cats[t.category]||0)+t.amount);drawDonut(cats,total);
  const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0], insights=[];
  if(top)insights.push(`La categoria più rilevante è <b>${escapeHTML(top[0])}</b>, con ${euro(top[1])} questo mese.`);
  if(inc&&total>inc)insights.push(`Questo mese le spese superano le entrate di <b>${euro(total-inc)}</b>.`);
  else if(inc)insights.push(`Il rapporto tra entrate e spese è attualmente <b>${Math.round(total/inc*100)}%</b>.`);
  insights.push(`La categorizzazione automatica funziona <b>localmente</b>: le tue descrizioni non vengono inviate a servizi esterni.`);
  $("insights").innerHTML=insights.map(x=>`<div class="insight">${x}</div>`).join("");
}
function drawDonut(cats,total){
  const c=$("donutChart"),ctx=c.getContext("2d"),W=c.clientWidth,H=220;c.width=W*2;c.height=H*2;ctx.scale(2,2);ctx.clearRect(0,0,W,H);
  const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,7),colors=["#61e4c0","#55cfff","#ff8c8f","#f8c55e","#ae91ff","#7fd3a8","#8ca7ff"];
  let a=-Math.PI/2,cx=W*.31,cy=H/2,r=68;
  entries.forEach(([cat,val],i)=>{const end=a+val/total*Math.PI*2;ctx.beginPath();ctx.strokeStyle=colors[i%colors.length];ctx.lineWidth=20;ctx.arc(cx,cy,r,a,end);ctx.stroke();a=end});
  ctx.fillStyle="#fff";ctx.font="800 16px -apple-system";ctx.textAlign="center";ctx.fillText(euro(total),cx,cy+3);ctx.fillStyle="#7e979d";ctx.font="10px -apple-system";ctx.fillText("totale",cx,cy+19);
  $("donutLegend").innerHTML=entries.map(([cat,val],i)=>`<div class="legend-row"><i class="dot" style="background:${colors[i%colors.length]}"></i>${escapeHTML(cat)} · ${Math.round(val/total*100)}%</div>`).join("")||`<div class="empty">Nessun dato.</div>`;
}
function populateCategories(){ $("categoryInput").innerHTML=CATEGORIES.map(([icon,name])=>`<option value="${name}">${icon} ${name}</option>`).join("")}
function openModal(id=null){
  editingId=id;const t=id?state.transactions.find(x=>x.id===id):null;currentType=t?.type||"expense";
  $("modalTitle").textContent=t?"Modifica":"Aggiungi";$("amountInput").value=t?.amount??"";$("descriptionInput").value=t?.description??"";$("noteInput").value=t?.note??"";$("dateInput").value=t?.date||dateISO();setType(currentType);
  if(t)$("categoryInput").value=t.category;else $("categoryInput").value="Altro";
  $("modalBackdrop").classList.remove("hidden");$("descriptionInput").focus();
}
function closeModal(){$("modalBackdrop").classList.add("hidden");editingId=null}
function setType(type){currentType=type;document.querySelectorAll(".type-toggle button").forEach(b=>b.classList.toggle("active",b.dataset.type===type));suggestNow()}
function suggestNow(){const s=suggestCategory($("descriptionInput").value,currentType);$("suggestedCategory").textContent=`${CAT[s[0]]||"📦"} ${s[0]}`;$("suggestedConfidence").textContent=`Confidenza ${s[1]}%`;$("suggestion").classList.toggle("hidden",!$("descriptionInput").value.trim());}
function saveTx(){
  const amount=parseFloat(String($("amountInput").value).replace(",","."));
  if(!amount||amount<=0){alert("Inserisci un importo valido.");return}
  const description=$("descriptionInput").value.trim()||$("categoryInput").value;
  const obj={id:editingId||Date.now(),amount,type:currentType,description,category:$("categoryInput").value,date:$("dateInput").value,note:$("noteInput").value.trim()};
  if(editingId)state.transactions=state.transactions.map(t=>t.id===editingId?obj:t);else state.transactions.push(obj);
  saveState();closeModal();
}
function exportData(){
  const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`money-backup-${dateISO()}.json`;a.click();URL.revokeObjectURL(a.href);
}
function importData(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.transactions))throw Error();state={transactions:d.transactions,name:d.name||""};saveState();alert("Backup importato.");}catch{alert("File non valido.")}};r.readAsText(file)}
function openView(name){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===name));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));window.scrollTo({top:0,behavior:"smooth"})}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>openView(b.dataset.view));
  $("addFromHome").onclick=$("floatingAdd").onclick=()=>openModal();
  $("closeModal").onclick=closeModal;$("modalBackdrop").onclick=e=>{if(e.target.id==="modalBackdrop")closeModal()};
  document.querySelectorAll(".type-toggle button").forEach(b=>b.onclick=()=>setType(b.dataset.type));
  $("descriptionInput").addEventListener("input",suggestNow);
  $("acceptSuggestion").onclick=()=>{$("categoryInput").value=suggestCategory($("descriptionInput").value,currentType)[0]};
  $("saveBtn").onclick=saveTx;
  $("openAnalysis").onclick=()=>openView("analysis");
  $("searchToggle").onclick=()=>{$("searchBar").classList.toggle("hidden");$("searchInput").focus()};
  $("searchInput").oninput=renderTransactions;
  document.querySelectorAll(".segmented button").forEach(b=>b.onclick=()=>{currentFilter=b.dataset.filter;document.querySelectorAll(".segmented button").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderTransactions()});
  $("exportBtn").onclick=$("exportBtn2").onclick=exportData;
  $("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
  $("nameInput").onchange=e=>{state.name=e.target.value.trim();saveState()};
  try { populateCategories(); renderAll(); } catch (e) { console.error("Render error:", e); }
  $("clearBtn").onclick=()=>{if(confirm("Vuoi cancellare tutte le transazioni? Questa azione non può essere annullata.")){state.transactions=[];saveState()}};
  $("resetDemo").onclick=()=>{if(!state.transactions.length){state.transactions=[
    {id:1,type:"income",amount:1960,description:"Stipendio",category:"Stipendio",date:dateISO(),note:""},
    {id:2,type:"expense",amount:43.72,description:"Esselunga",category:"Spesa alimentare",date:dateISO(),note:""},
    {id:3,type:"expense",amount:24.5,description:"Cena da Pizzium",category:"Ristoranti",date:dateISO(),note:""},
    {id:4,type:"expense",amount:18.4,description:"Uber",category:"Trasporti",date:dateISO(),note:""},
    {id:5,type:"expense",amount:19.99,description:"Netflix",category:"Abbonamenti",date:dateISO(),note:""},
    {id:6,type:"expense",amount:17,description:"Aperitivo con Luca",category:"Bar / Aperitivi",date:dateISO(),note:""}
  ];saveState()}});
});
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));