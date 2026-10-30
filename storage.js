/* Capa de almacenamiento. Para migrar a Supabase, reimplementa SOLO estas funciones
   (mismos nombres y valores devueltos) usando supabase-js; app.js no cambia. */
const DB_NAME='gamez_crm', DB_VERSION=1, SCHEMA_VERSION=1;
const Storage=(()=>{
  let db;
  const open=()=>db?Promise.resolve(db):new Promise((ok,no)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=e=>{const d=e.target.result;
      if(!d.objectStoreNames.contains('projects'))d.createObjectStore('projects',{keyPath:'id'});
      if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'key'});};
    r.onsuccess=()=>{db=r.result;ok(db)};r.onerror=()=>no(r.error);r.onblocked=()=>no(new Error('Base bloqueada por otra pestaña'));
  });
  const tx=(stores,mode,fn)=>open().then(d=>new Promise((ok,no)=>{
    const t=d.transaction(stores,mode);let out;
    try{out=fn(t)}catch(e){t.abort();return no(e)}
    t.oncomplete=()=>ok(out&&'result' in out?out.result:undefined);
    t.onerror=t.onabort=()=>no(t.error||new Error('Transacción cancelada'));
  }));
  return{
    getProjects:()=>tx('projects','readonly',t=>t.objectStore('projects').getAll()),
    saveProject:p=>tx('projects','readwrite',t=>t.objectStore('projects').put(p)),
    deleteProject:id=>tx('projects','readwrite',t=>t.objectStore('projects').delete(id)),
    getMeta:k=>tx('meta','readonly',t=>t.objectStore('meta').get(k)).then(r=>r?r.value:undefined),
    setMeta:(k,v)=>tx('meta','readwrite',t=>t.objectStore('meta').put({key:k,value:v})),
    /* Número consecutivo que nunca se reutiliza, aunque se borren proyectos */
    async nextNumber(){const n=(await this.getMeta('nextNum'))||1;await this.setMeta('nextNum',n+1);return n},
    replaceAll:(projects,meta)=>tx(['projects','meta'],'readwrite',t=>{
      const p=t.objectStore('projects'),m=t.objectStore('meta');p.clear();m.clear();
      projects.forEach(x=>p.put(x));Object.entries(meta).forEach(([key,value])=>m.put({key,value}));return {};})
  };
})();
