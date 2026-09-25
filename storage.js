const DB_NAME="money_tracker_data";
const DB_VERSION=1;
const STORE="app";
const KEY="state";

function openMoneyDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function loadPersistedState(){
  const fallback=()=>{
    try{
      const raw=localStorage.getItem("money_tracker_v1");
      const parsed=raw?JSON.parse(raw):null;
      return parsed&&Array.isArray(parsed.transactions)?parsed:null;
    }catch(e){return null}
  };

  try{
    const db=await openMoneyDB();
    const stored=await new Promise((resolve,reject)=>{
      const req=db.transaction(STORE,"readonly").objectStore(STORE).get(KEY);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
    db.close();

    if(stored&&Array.isArray(stored.transactions)) return stored;

    const old=fallback();
    if(old){
      await savePersistedState(old);
      return old;
    }
  }catch(e){
    const old=fallback();
    if(old) return old;
  }

  return {transactions:[]};
}

async function savePersistedState(state){
  const clean={transactions:Array.isArray(state.transactions)?state.transactions:[]};
  localStorage.setItem("money_tracker_v1",JSON.stringify(clean));

  try{
    const db=await openMoneyDB();
    await new Promise((resolve,reject)=>{
      const req=db.transaction(STORE,"readwrite").objectStore(STORE).put(clean,KEY);
      req.onsuccess=()=>resolve();
      req.onerror=()=>reject(req.error);
    });
    db.close();
  }catch(e){}
}

function exportMoneyBackup(state){
  const payload={
    app:"Money",
    formatVersion:1,
    exportedAt:new Date().toISOString(),
    transactions:state.transactions
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="money-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function importMoneyBackup(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const parsed=JSON.parse(reader.result);
        const transactions=Array.isArray(parsed)?parsed:parsed.transactions;
        if(!Array.isArray(transactions)) throw new Error("Backup non valido");
        resolve({transactions});
      }catch(e){reject(e)}
    };
    reader.onerror=()=>reject(reader.error);
    reader.readAsText(file);
  });
}
