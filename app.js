const KEY="money_tracker_v1";
const CATEGORIES=[
  {name:"Svago",icon:"🎮",color:"#d968e7"},
  {name:"Spesa",icon:"🛒",color:"#f08a42"},
  {name:"Shopping",icon:"🛍️",color:"#5578e8"},
  {name:"Stipendio",icon:"💰",color:"#37b56b"},
  {name:"Viaggi",icon:"✈️",color:"#6d63f6"},
  {name:"Abbonamenti / Bollette",icon:"📄",color:"#7b8794"}
];
let state={transactions:[]};
let currentType="expense";
let currentCategory=0;
let editingId=null;

try{
  const x=JSON.parse(localStorage.getItem(KEY)||"{}");
  if(x&&Array.isArray(x.transactions))state=x;
}catch(e){}

const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const formatDate=d=>{if(!d)return "";const [y,m,day]=d.split("-");return day+"/"+m+"/"+y};

function esc(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function render(){
  const income=state.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense=state.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  $("income").textContent=euro(income);
  $("expense").textContent=euro(expense);
  $("balance").textContent=euro(income-expense);

  const categoryTotals=CATEGORIES.map(c=>({
    ...c,total:state.transactions.filter(t=>t.type==="expense"&&t.category===c.name).reduce((s,t)=>s+t.amount,0)
  }));
  const totalExpense=categoryTotals.reduce((s,c)=>s+c.total,0);
  $("categoryTotal").textContent=euro(totalExpense);
  const max=Math.max(...categoryTotals.map(c=>c.total),1);
  $("categoryList").innerHTML=categoryTotals.map(c=>`
    <div class="category-row">
      <div class="cat-icon" style="background:${c.color}18">${c.icon}</div>
      <div>
        <div class="cat-name">${esc(c.name)}</div>
        <div class="cat-bar"><i style="width:${Math.round(c.total/max*100)}%;background:${c.color}"></i></div>
      </div>
      <div class="cat-amount">${euro(c.total)}<small>${totalExpense?Math.round(c.total/totalExpense*100):0}%</small></div>
    </div>`).join("");

  const list=[...state.transactions].sort((a,b)=>b.id-a.id).slice(0,8);
  $("transactions").innerHTML=list.length?list.map(t=>`
    <button type="button" class="tx" data-id="${t.id}">
      <div class="tx-icon">${t.icon}</div>
      <div class="tx-main"><b>${esc(t.description||t.category)}</b><small>${esc(t.category)} · ${formatDate(t.date)}</small></div>
      <div class="tx-amount ${t.type}">${t.type==="income"?"+":"−"} ${euro(t.amount)}</div>
    </button>`).join(""):'<div class="empty">Nessun movimento ancora.<br>Aggiungi il primo con il pulsante +</div>';
  document.querySelectorAll(".tx[data-id]").forEach(row=>row.onclick=()=>editTransaction(Number(row.dataset.id)));
}

function renderCategoryChoices(){
  $("categoryChoices").innerHTML=CATEGORIES.map((c,i)=>`
    <button type="button" class="cat-choice ${i===currentCategory?"selected":""}" data-index="${i}">
      <span class="choice-icon">${c.icon}</span><span>${c.name}</span>
    </button>`).join("");
  document.querySelectorAll(".cat-choice").forEach(btn=>{
    btn.onclick=()=>{currentCategory=Number(btn.dataset.index);renderCategoryChoices()};
  });
}

function setType(type){
  currentType=type;
  $("expenseBtn").classList.toggle("selected",type==="expense");
  $("incomeBtn").classList.toggle("selected",type==="income");
}

function openModal(transaction=null){
  $("modal").classList.remove("hidden");
  $("amount").value="";
  $("description").value="";
  currentType="expense";
  currentCategory=0;
  setType(currentType);
  renderCategoryChoices();
  $("modalTitle").textContent=transaction?"Modifica movimento":"Aggiungi importo";
  $("save").textContent=transaction?"Salva modifiche":"Salva movimento";
  setTimeout(()=>$("amount").focus(),80);
}
function editTransaction(id){const t=state.transactions.find(x=>x.id===id);if(t)openModal(t)}

function closeModal(){ $("modal").classList.add("hidden"); }

function save(){
  const raw=String($("amount").value).trim().replace(/\s/g,"").replace(/\./g,"").replace(",",".");
  const amount=Number(raw);
  if(!amount||amount<=0){$("amount").focus();return}
  const c=CATEGORIES[currentCategory];
  state.transactions.push({
    id:Date.now(),amount,type:currentType,category:c.name,icon:c.icon,
    description:$("description").value.trim()||c.name,
    date:new Date().toISOString().slice(0,10)
  });
  localStorage.setItem(KEY,JSON.stringify(state));
  closeModal();
  render();
}

document.addEventListener("DOMContentLoaded",()=>{
  $("openAdd").onclick=()=>openModal();
  $("close").onclick=()=>{editingId=null;closeModal()};
  $("modal").onclick=e=>{if(e.target===$("modal"))closeModal()};
  $("expenseBtn").onclick=()=>setType("expense");
  $("incomeBtn").onclick=()=>setType("income");
  $("save").onclick=save;\n  $("date").addEventListener("change",()=>{});
  $("amount").addEventListener("input",e=>{e.target.value=e.target.value.replace(/[^0-9,\.]/g,"")});
  $("clearAll").onclick=()=>{
    if(confirm("Vuoi cancellare tutti i movimenti?")){
      state={transactions:[]};
      localStorage.setItem(KEY,JSON.stringify(state));
      render();
    }
  };
  render();
  setType(currentType);
  renderCategoryChoices();
});
