const KEY="money_tracker_v1";
const CATEGORIES=[
  {name:"Svago",icon:"🎮"},{name:"Spesa",icon:"🛒"},{name:"Shopping",icon:"🛍️"},
  {name:"Stipendio",icon:"💰"},{name:"Viaggi",icon:"✈️"}
];
let state={transactions:[]};
try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");if(x&&Array.isArray(x.transactions))state=x}catch(e){}
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);

function render(){
  const income=state.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense=state.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  $("income").textContent=euro(income);$("expense").textContent=euro(expense);$("balance").textContent=euro(income-expense);
  const list=[...state.transactions].sort((a,b)=>b.id-a.id).slice(0,12);
  $("transactions").innerHTML=list.length?list.map(t=>`<div class="tx"><div class="tx-icon">${t.icon}</div><div class="tx-main"><b>${esc(t.description||t.category)}</b><small>${esc(t.category)}</small></div><div class="tx-amount ${t.type}">${t.type==="income"?"+":"−"} ${euro(t.amount)}</div></div>`).join(""):'<div class="empty">Nessun movimento ancora.<br>Aggiungi il primo con il pulsante +</div>';
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openModal(){ $("modal").classList.remove("hidden");$("amount").value="";$("description").value="";$("typeSlider").value="0";$("categorySlider").value="0";updateType();updateCategory();setTimeout(()=>$("amount").focus(),80)}
function closeModal(){ $("modal").classList.add("hidden") }
function updateType(){const income=$("typeSlider").value==="1";$("typeValue").textContent=income?"Entrata":"Uscita";$("typeValue").classList.toggle("expense",!income)}
function updateCategory(){const c=CATEGORIES[Number($("categorySlider").value)];$("categoryValue").textContent=c.icon+" "+c.name;document.querySelectorAll(".category-dots i").forEach((d,i)=>d.classList.toggle("active",i===Number($("categorySlider").value)))}
function save(){const amount=Number(String($("amount").value).replace(",","."));if(!amount||amount<=0){$("amount").focus();return}const type=$("typeSlider").value==="1"?"income":"expense";const c=CATEGORIES[Number($("categorySlider").value)];state.transactions.push({id:Date.now(),amount,type,category:c.name,icon:c.icon,description:$("description").value.trim()||c.name,date:new Date().toISOString().slice(0,10)});localStorage.setItem(KEY,JSON.stringify(state));closeModal();render()}
document.addEventListener("DOMContentLoaded",()=>{
  $("openAdd").onclick=openModal;$("close").onclick=closeModal;
  $("modal").onclick=e=>{if(e.target===$("modal"))closeModal()};
  $("typeSlider").oninput=updateType;$("categorySlider").oninput=updateCategory;$("save").onclick=save;
  $("clearAll").onclick=()=>{if(confirm("Vuoi cancellare tutti i movimenti?")){state={transactions:[]};localStorage.setItem(KEY,JSON.stringify(state));render()}};
  $("categoryDots").innerHTML=CATEGORIES.map(()=>"<i></i>").join("");
  render();updateType();updateCategory();
});