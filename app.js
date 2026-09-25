const KEY="money_tracker_v1";
const CATEGORIES=[
  {name:"Svago",icon:"🎮",color:"#d968e7"},
  {name:"Spesa",icon:"🛒",color:"#f08a42"},
  {name:"Shopping",icon:"🛍️",color:"#5578e8"},
  {name:"Stipendio",icon:"💰",color:"#37b56b"},
  {name:"Viaggi",icon:"✈️",color:"#6d63f6"},
  {name:"Abbonamenti / Bollette",icon:"📄",color:"#7b8794"}
];
let state={transactions:[]},currentType="expense",currentCategory=0,editingId=null;
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const formatDate=d=>{if(!d)return "";const [y,m,day]=d.split("-");return day+"/"+m+"/"+y};
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function render(){
 const income=state.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),expense=state.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
 $("income").textContent=euro(income);$("expense").textContent=euro(expense);$("balance").textContent=euro(income-expense);
 const totals=CATEGORIES.map(c=>({...c,total:state.transactions.filter(t=>t.type==="expense"&&t.category===c.name).reduce((s,t)=>s+t.amount,0)})),total=totals.reduce((s,c)=>s+c.total,0),max=Math.max(...totals.map(c=>c.total),1);
 $("categoryTotal").textContent=euro(total);
 $("categoryList").innerHTML=totals.map(c=>`<div class="category-row"><div class="cat-icon" style="background:${c.color}18">${c.icon}</div><div><div class="cat-name">${esc(c.name)}</div><div class="cat-bar"><i style="width:${Math.round(c.total/max*100)}%;background:${c.color}"></i></div></div><div class="cat-amount">${euro(c.total)}<small>${total?Math.round(c.total/total*100):0}%</small></div></div>`).join("");
 const list=[...state.transactions].sort((a,b)=>b.id-a.id).slice(0,8);
 $("transactions").innerHTML=list.length?list.map(t=>`<button type="button" class="tx" data-id="${t.id}"><div class="tx-icon">${t.icon}</div><div class="tx-main"><b>${esc(t.description||t.category)}</b><small>${esc(t.category)} · ${formatDate(t.date)}</small></div><div class="tx-amount ${t.type}">${t.type==="income"?"+":"−"} ${euro(t.amount)}</div></button>`).join(""):'<div class="empty">Nessun movimento ancora.<br>Aggiungi il primo con il pulsante +</div>';
 document.querySelectorAll(".tx[data-id]").forEach(row=>row.onclick=()=>editTransaction(Number(row.dataset.id)));
}
function renderCategoryChoices(){
 $("categoryChoices").innerHTML=CATEGORIES.map((c,i)=>`<button type="button" class="cat-choice ${i===currentCategory?"selected":""}" data-index="${i}"><span class="choice-icon">${c.icon}</span><span>${c.name}</span></button>`).join("");
 document.querySelectorAll(".cat-choice").forEach(btn=>btn.onclick=()=>{currentCategory=Number(btn.dataset.index);renderCategoryChoices()});
}
function setType(type){currentType=type;$("expenseBtn").classList.toggle("selected",type==="expense");$("incomeBtn").classList.toggle("selected",type==="income")}
function openModal(transaction=null){
 $("modal").classList.remove("hidden");editingId=transaction?transaction.id:null;
 $("amount").value=transaction?String(transaction.amount).replace(".",","):"";$("description").value=transaction?transaction.description:"";$("date").value=transaction?.date||new Date().toISOString().slice(0,10);
 currentType=transaction?.type||"expense";currentCategory=Math.max(0,CATEGORIES.findIndex(c=>c.name===transaction?.category));setType(currentType);renderCategoryChoices();
 $("modalTitle").textContent=transaction?"Modifica movimento":"Aggiungi importo";$("save").textContent=transaction?"Salva modifiche":"Salva movimento";setTimeout(()=>$("amount").focus(),80);
}
function editTransaction(id){const t=state.transactions.find(x=>x.id===id);if(t)openModal(t)}
function closeModal(){$("modal").classList.add("hidden")}
async function save(){
 const raw=String($("amount").value).trim().replace(/\s/g,"").replace(/\./g,"").replace(",",".");const amount=Number(raw);if(!amount||amount<=0){$("amount").focus();return}
 const c=CATEGORIES[currentCategory],data={amount,type:currentType,category:c.name,icon:c.icon,description:$("description").value.trim()||c.name,date:$("date").value||new Date().toISOString().slice(0,10)};
 if(editingId){const index=state.transactions.findIndex(t=>t.id===editingId);if(index!==-1)state.transactions[index]={...state.transactions[index],...data}}else state.transactions.push({id:Date.now(),...data});
 await savePersistedState(state);editingId=null;closeModal();render();
}
async function clearAll(){
 if(confirm("Vuoi cancellare tutti i movimenti? Questa azione non può essere annullata.")){
   state={transactions:[]};
   await savePersistedState(state);
   render();
 }
}
document.addEventListener("DOMContentLoaded",async()=>{
 $("openAdd").onclick=()=>openModal();
 $("close").onclick=()=>{editingId=null;closeModal()};
 $("modal").onclick=e=>{if(e.target===$("modal")){editingId=null;closeModal()}};
 $("expenseBtn").onclick=()=>setType("expense");$("incomeBtn").onclick=()=>setType("income");$("save").onclick=save;
 $("amount").addEventListener("input",e=>e.target.value=e.target.value.replace(/[^0-9,.]/g,""));
 $("clearAll").onclick=clearAll;
 $("exportBackup").onclick=()=>exportMoneyBackup(state);
 $("importBackup").onclick=()=>$("backupFile").click();
 $("backupFile").onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;
   try{
     const imported=await importMoneyBackup(file);
     if(confirm("Importare il backup? I movimenti attuali verranno sostituiti.")){
       state=imported;
       await savePersistedState(state);
       render();
       alert("Backup importato correttamente.");
     }
   }catch(err){alert("Il file non è un backup Money valido.")}
   e.target.value="";
 };
 state=await loadPersistedState();
 render();setType(currentType);renderCategoryChoices();
});
