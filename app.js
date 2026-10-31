const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const days=s=>Math.round((new Date(s+'T00:00')-new Date(today()+'T00:00'))/864e5);
const VENTA=['Prospecto','Contacto realizado','Negociación','Ganado','Perdido'];
const DEV=['Pendiente','En desarrollo','En revisión','Entregado','En pausa'];
const VC={Prospecto:'',      'Contacto realizado':'blue',Negociación:'amber',Ganado:'green',Perdido:'red'};
const DC={Pendiente:'','En desarrollo':'blue','En revisión':'amber',Entregado:'green','En pausa':'red'};
const badge=(t,c)=>`<span class="b ${c}">${esc(t)}</span>`;
const NAV=[['panel','Panel general'],['proyectos','Proyectos'],['clientes','Clientes'],['estadisticas','Estadísticas'],['finanzas','Finanzas'],['respaldos','Respaldos']];
let P=[],view='panel',month=today().slice(0,7);

const paid=p=>(p.pagos||[]).reduce((a,x)=>a+x.monto,0);
const won=p=>p.venta==='Ganado';
const bal=p=>won(p)?p.importe-paid(p):0;
const active=p=>won(p)&&p.desarrollo!=='Entregado';
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const addM=(k,n)=>{const [y,m]=k.split('-').map(Number),d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const mname=k=>{const [y,m]=k.split('-');return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'short',year:'2-digit'})};
const dueTag=p=>{if(!p.limite||p.desarrollo==='Entregado'||p.venta==='Perdido')return '';const d=days(p.limite);return d<0?badge(`Atrasado ${-d} d`,'red'):d<=7?badge(d?`En ${d} d`:'Hoy','amber'):''};
const followTag=p=>{if(!p.seguimiento)return '';const d=days(p.seguimiento);return d<0?badge('Vencida','red'):d===0?badge('Hoy','amber'):''};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2600)}
const table=(heads,rows,empty)=>rows.length?`<div class="tw"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="empty">${empty}</div>`;
const kpi=(l,v,c='')=>`<div class="card"><small>${l}</small><strong class="${c}">${v}</strong></div>`;

/* Métricas mensuales: ventas por fecha de cierre, cobros por fecha de pago, entregas por fecha real de entrega */
function stats(k){
  const sales=P.filter(p=>won(p)&&p.cierre?.startsWith(k));
  const pays=P.flatMap(p=>p.pagos||[]).filter(x=>x.fecha.startsWith(k));
  return{ventas:sales.length,importe:sum(sales,p=>p.importe),cobrado:sum(pays,x=>x.monto),entregados:P.filter(p=>p.entrega?.startsWith(k)).length};
}
function bars(items,color,fmt=String){
  const max=Math.max(...items.map(i=>i.v),1),w=360/items.length;
  return `<svg viewBox="0 0 360 150" width="100%" role="img">${items.map((i,n)=>{const h=i.v/max*100;return `<rect x="${n*w+8}" y="${120-h}" width="${w-16}" height="${h}" rx="4" fill="${color}"/><text x="${n*w+w/2}" y="${114-h}" text-anchor="middle">${i.v?fmt(i.v):''}</text><text x="${n*w+w/2}" y="138" text-anchor="middle">${i.l}</text>`}).join('')}</svg>`;
}
function line(items,color){
  const max=Math.max(...items.map(i=>i.v),1),w=360/items.length;
  const pts=items.map((i,n)=>`${n*w+w/2},${115-i.v/max*95}`);
  return `<svg viewBox="0 0 360 150" width="100%" role="img"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>${items.map((i,n)=>`<circle cx="${n*w+w/2}" cy="${115-i.v/max*95}" r="4" fill="${color}"/><text x="${n*w+w/2}" y="138" text-anchor="middle">${i.l}</text>`).join('')}</svg>`;
}

const rowP=p=>`<tr><td>#${p.num}</td><td>${esc(p.cliente)}</td><td>${esc(p.proyecto)}</td><td>${badge(p.venta,VC[p.venta])}</td><td>${badge(p.desarrollo,DC[p.desarrollo])}</td><td>${money(p.importe)}</td><td class="g">${money(paid(p))}</td><td>${won(p)?money(bal(p)):'—'}</td><td>${p.limite||'—'} ${dueTag(p)}</td><td><button class="btn s g" data-a="pagos" data-id="${p.id}">Pagos</button> <button class="btn s g" data-a="editar" data-id="${p.id}">Editar</button> <button class="btn s r" data-a="borrar" data-id="${p.id}">Eliminar</button></td></tr>`;
const HP=['N.º','Cliente','Proyecto','Venta','Desarrollo','Importe','Pagado','Saldo','Entrega límite','Acciones'];

const views={
panel(){
  const g=P.filter(won),act=P.filter(active);
  const soon=act.filter(p=>p.limite&&days(p.limite)<=7).length;
  const seg=P.filter(p=>(p.accion||p.seguimiento)&&p.venta!=='Perdido'&&p.desarrollo!=='Entregado').sort((a,b)=>(a.seguimiento||'9').localeCompare(b.seguimiento||'9'));
  const ent=P.filter(p=>p.limite&&p.desarrollo!=='Entregado'&&p.venta==='Ganado').sort((a,b)=>a.limite.localeCompare(b.limite));
  return `<div class="kpis">${kpi('Proyectos registrados',P.length)}${kpi('Proyectos activos',act.length,'')}${kpi('Entregados',P.filter(p=>p.desarrollo==='Entregado').length,'g')}${kpi('Importe contratado',money(sum(g,p=>p.importe)))}${kpi('Total cobrado',money(sum(P,paid)),'g')}${kpi('Pendiente de cobrar',money(sum(g,bal)),'a')}${kpi('Próximos a vencer (7 días)',soon,soon?'r':'')}</div>
  <div class="card"><h2>Proyectos activos</h2>${table(HP,act.map(rowP),'No hay proyectos activos. Un proyecto es activo cuando la venta está en Ganado y aún no se entrega.')}</div>
  <div class="grid2"><div class="card"><h2>Seguimiento comercial</h2>${table(['Cliente','Próxima acción','Fecha',''],seg.map(p=>`<tr><td>${esc(p.cliente)}</td><td>${esc(p.accion||'—')}</td><td>${p.seguimiento||'—'}</td><td>${followTag(p)}</td></tr>`),'Sin acciones pendientes.')}</div>
  <div class="card"><h2>Calendario de entregas</h2>${table(['Cliente','Proyecto','Límite','Estado',''],ent.map(p=>`<tr><td>${esc(p.cliente)}</td><td>${esc(p.proyecto)}</td><td>${p.limite}</td><td>${badge(p.desarrollo,DC[p.desarrollo])}</td><td>${dueTag(p)}</td></tr>`),'Sin entregas programadas.')}</div></div>`;
},
proyectos(){return `<div class="card">${table(HP,[...P].sort((a,b)=>b.num-a.num).map(rowP),'Aún no hay proyectos. Usa «Nuevo proyecto» para registrar el primero.')}</div>`},
clientes(){
  const m={};P.forEach(p=>(m[p.cliente]??=[]).push(p));
  return `<div class="card">${table(['Cliente','Contacto','Teléfono / correo','Origen','Proyectos','Contratado','Seguimiento'],Object.entries(m).map(([c,a])=>{const l=a[a.length-1],s=a.filter(x=>x.seguimiento).sort((x,y)=>x.seguimiento.localeCompare(y.seguimiento))[0];return `<tr><td>${esc(c)}</td><td>${esc(l.contacto)}</td><td>${esc(l.tel)}</td><td>${esc(l.origen)}</td><td>${a.length}</td><td>${money(sum(a.filter(won),x=>x.importe))}</td><td>${s?s.seguimiento+' '+followTag(s):'—'}</td></tr>`}),'Los clientes aparecen aquí cuando registras proyectos.')}</div>`;
},
estadisticas(){
  const ms=[...Array(6)].map((_,i)=>addM(month,i-5)),S=ms.map(stats),cur=S[5],prev=S[4];
  const d=(a,b,f=money)=>{const x=a-b;return `<small class="${x>=0?'g':'r'}">${x>=0?'▲':'▼'} ${f(Math.abs(x))} vs mes anterior</small>`};
  let acc=sum(P.flatMap(p=>p.pagos||[]).filter(x=>x.fecha.slice(0,7)<ms[0]),x=>x.monto);
  const ev=S.map((s,i)=>({l:mname(ms[i]),v:(acc+=s.cobrado)}));
  const st=DEV.map(e=>({l:e.split(' ').pop(),v:P.filter(p=>p.desarrollo===e).length}));
  return `<div class="card"><label>Mes <input type="month" id="mes" value="${month}" style="max-width:200px"></label></div>
  <div class="kpis"><div class="card"><small>Ventas cerradas</small><strong>${cur.ventas}</strong>${d(cur.ventas,prev.ventas,String)}</div><div class="card"><small>Importe vendido</small><strong>${money(cur.importe)}</strong>${d(cur.importe,prev.importe)}</div><div class="card"><small>Dinero recibido</small><strong class="g">${money(cur.cobrado)}</strong>${d(cur.cobrado,prev.cobrado)}</div><div class="card"><small>Proyectos entregados</small><strong>${cur.entregados}</strong>${d(cur.entregados,prev.entregados,String)}</div>${kpi('Proyectos ganados (total)',P.filter(won).length)}${kpi('Saldo pendiente de contratos',money(sum(P.filter(won),bal)),'a')}</div>
  <div class="grid2"><div class="card"><h2>Ventas cerradas por mes (importe)</h2>${bars(ms.map((k,i)=>({l:mname(k),v:S[i].importe})),'#2563eb',v=>Math.round(v/1000)+'k')}</div>
  <div class="card"><h2>Cobros recibidos por mes</h2>${bars(ms.map((k,i)=>({l:mname(k),v:S[i].cobrado})),'#16a34a',v=>Math.round(v/1000)+'k')}</div>
  <div class="card"><h2>Evolución de ingresos (acumulado)</h2>${line(ev,'#16a34a')}</div>
  <div class="card"><h2>Proyectos por estado de desarrollo</h2>${bars(st,'#0f2347')}</div></div>
  <p class="muted">Ventas por fecha de cierre · cobros por fecha de recepción del pago · entregas por fecha real de entrega.</p>`;
},
finanzas(){
  const g=P.filter(won),by={};P.flatMap(p=>p.pagos||[]).forEach(x=>by[x.fecha.slice(0,7)]=(by[x.fecha.slice(0,7)]||0)+x.monto);
  const pend=g.filter(p=>bal(p)>0);
  return `<div class="kpis">${kpi('Total contratado (solo ganados)',money(sum(g,p=>p.importe)))}${kpi('Total cobrado',money(sum(P,paid)),'g')}${kpi('Total pendiente',money(sum(g,bal)),'a')}</div>
  <div class="grid2"><div class="card"><h2>Pagos recibidos por mes</h2>${table(['Mes','Importe'],Object.keys(by).sort().reverse().map(k=>`<tr><td>${k}</td><td class="g">${money(by[k])}</td></tr>`),'Sin pagos registrados.')}</div>
  <div class="card"><h2>Proyectos con pagos pendientes</h2>${table(['Proyecto','Saldo',''],pend.map(p=>`<tr><td>#${p.num} ${esc(p.cliente)} · ${esc(p.proyecto)}</td><td class="a">${money(bal(p))}</td><td><button class="btn s g" data-a="pagos" data-id="${p.id}">Pagos</button></td></tr>`),'No hay saldos pendientes.')}</div></div>`;
},
respaldos:()=>`<div class="note">Tus datos se guardan en <b>IndexedDB</b>, dentro de este navegador, este perfil y este origen (dirección + puerto). No se sincronizan con otros dispositivos ni están en la nube. Si borras los datos del sitio o cambias de navegador/puerto, no estarán. Exporta respaldos con frecuencia.</div>
  <div class="card"><h2>Respaldo</h2><p id="lb" class="muted">Cargando…</p><p><button class="btn" data-a="export">Exportar respaldo JSON</button> <label style="display:inline-flex"><input type="file" id="imp" accept=".json,application/json"></label></p>
  <p><button class="btn g" data-a="verificar">Verificar datos guardados</button></p><p id="ver"></p></div>`
};


/* Registros iniciales de prospectos revisados el 30/10/2026.
   La migración es idempotente: no reemplaza ni modifica registros existentes. */
async function seedReviewedProspects(){
  const reviewed=[
    {
      id:'lead-corazon-contento-20261030',
      cliente:'Corazón Contento',
      proyecto:'Sitio web integral para pastelería',
      contacto:'',
      tel:'',
      origen:'Prospección',
      obs:'Prospecto revisado el 30/10/2026. Alcance solicitado: catálogo de pasteles, búsqueda y filtros, pagos en línea y calendario por cliente para consultar fechas de entrega. Pendiente: solicitar catálogo, variantes/precios, zonas y reglas de entrega, anticipación mínima, disponibilidad por fecha, políticas de cancelación y datos fiscales. Definir proveedor de pago y validar el flujo completo antes de prometer cobros automáticos. Mensaje inicial y levantamiento de requisitos pendientes de confirmar.',
      registro:'2026-10-30',
      importe:0,
      venta:'Prospecto',
      desarrollo:'Pendiente',
      pagos:[]
    },
    {
      id:'lead-patricia-hernandez-20261030',
      cliente:'Boutique de Patricia Hernández',
      proyecto:'Catálogo digital de temporada',
      contacto:'Patricia Hernández',
      tel:'',
      origen:'Prospección',
      obs:'Dueña de boutique; interesada en catálogo web de temporada y selección de productos. Reunión propuesta de 20–30 minutos para revisar catálogo, alcance, funciones principales y siguientes pasos. Pendiente confirmar envío del mensaje y fecha/hora de reunión. Solicitar logotipo, fotos, nombres, descripciones, precios, tallas/variantes, disponibilidad y forma de contacto o pedido.',
      registro:'2026-10-30',
      importe:0,
      venta:'Prospecto',
      desarrollo:'Pendiente',
      pagos:[]
    }
  ];
  const current=await Storage.getProjects();
  for(const item of reviewed){
    const exists=current.some(p=>p.id===item.id || (
      String(p.cliente||'').trim().toLowerCase()===item.cliente.toLowerCase() &&
      String(p.proyecto||'').trim().toLowerCase()===item.proyecto.toLowerCase()
    ));
    if(!exists){
      item.num=await Storage.nextNumber();
      await Storage.saveProject(item);
      current.push(item);
    }
  }
}

async function render(){
  P=await Storage.getProjects();
  $('#title').textContent=NAV.find(n=>n[0]===view)[1];
  $('#nav').innerHTML=NAV.map(([k,t])=>`<button data-v="${k}" class="${k===view?'on':''}">${t}</button>`).join('');
  $('#app').innerHTML=views[view]();
  if(view==='respaldos'){const l=await Storage.getMeta('lastBackup');$('#lb').textContent=l?'Último respaldo: '+new Date(l).toLocaleString('es-MX'):'Aún no has exportado ningún respaldo.'}
}

const F=[['cliente','Cliente o negocio *','text'],['proyecto','Nombre del proyecto *','text'],['contacto','Contacto','text'],['tel','Teléfono o correo','text'],['origen','Origen del cliente','text'],['registro','Fecha de registro','date'],['importe','Importe acordado (MXN)','number'],['inicio','Fecha de inicio','date'],['cierre','Cierre de venta','date'],['limite','Fecha límite de entrega','date'],['entrega','Fecha real de entrega','date'],['accion','Próxima acción','text'],['seguimiento','Fecha de seguimiento','date']];
function openForm(id){
  const p=P.find(x=>x.id===id)||{registro:today(),venta:'Prospecto',desarrollo:'Pendiente',importe:0};
  const sel=(n,l,o)=>`<label>${l}<select name="${n}">${o.map(v=>`<option ${p[n]===v?'selected':''}>${v}</option>`).join('')}</select></label>`;
  $('#dlg').innerHTML=`<h2>${id?'Editar proyecto #'+p.num:'Nuevo proyecto'}</h2><form id="f" novalidate>${F.map(([n,l,t])=>`<label>${l}<input name="${n}" type="${t}" ${t==='number'?'min="0" step="0.01"':''} value="${esc(p[n]??'')}"></label>`).join('')}${sel('venta','Estado de venta',VENTA)}${sel('desarrollo','Estado de desarrollo',DEV)}<label class="w">Observaciones<textarea name="obs" rows="3">${esc(p.obs||'')}</textarea></label><div class="err" id="e"></div><div class="acts"><button type="button" class="btn g" data-a="cerrar">Cancelar</button><button class="btn">Guardar</button></div></form>`;
  $('#dlg').showModal();
  $('#f').onsubmit=async e=>{e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target)),er=[];
    if(!d.cliente.trim())er.push('El cliente es obligatorio.');if(!d.proyecto.trim())er.push('El nombre del proyecto es obligatorio.');
    d.importe=d.importe===''?0:Number(d.importe);if(!(d.importe>=0))er.push('El importe debe ser un número mayor o igual a 0.');
    if(d.venta==='Ganado'&&!d.cierre)er.push('Una venta Ganada necesita fecha de cierre.');
    if(d.desarrollo==='Entregado'&&!d.entrega)er.push('Un proyecto Entregado necesita fecha real de entrega.');
    if(d.inicio&&d.limite&&d.limite<d.inicio)er.push('La fecha límite no puede ser anterior al inicio.');
    if(er.length){$('#e').innerHTML=er.join('<br>');return}
    try{const r={...p,...d,cliente:d.cliente.trim(),proyecto:d.proyecto.trim(),id:p.id||crypto.randomUUID(),num:p.num||await Storage.nextNumber(),pagos:p.pagos||[]};
      await Storage.saveProject(r);$('#dlg').close();toast(id?'Proyecto actualizado':'Proyecto creado');render()}catch(x){$('#e').textContent='No se pudo guardar: '+x.message}};
}
function openPagos(id){
  const p=P.find(x=>x.id===id);
  const rows=(p.pagos||[]).sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(x=>`<tr><td>${x.fecha}</td><td class="g">${money(x.monto)}</td><td>${esc(x.metodo)}</td><td>${esc(x.ref)}</td><td><button class="btn s g" data-a="editpago" data-id="${p.id}" data-pid="${x.id}">Editar</button> <button class="btn s r" data-a="delpago" data-id="${p.id}" data-pid="${x.id}">Eliminar</button></td></tr>`);
  $('#dlg').innerHTML=`<h2>Pagos · #${p.num} ${esc(p.proyecto)}</h2><p>Contratado ${money(p.importe)} · Cobrado <b class="g">${money(paid(p))}</b> · Saldo <b class="a">${money(bal(p))}</b></p>${table(['Fecha','Importe','Método','Referencia',''],rows,'Sin pagos registrados.')}
  ${won(p)?`<form id="pf" novalidate style="margin-top:14px"><label>Importe<input name="monto" type="number" min="0.01" step="0.01"></label><label>Fecha de recepción<input name="fecha" type="date" value="${today()}"></label><label>Método (opcional)<input name="metodo"></label><label>Referencia (opcional)<input name="ref"></label><div class="err" id="e"></div><div class="acts"><button type="button" class="btn g" data-a="cerrar">Cerrar</button><button class="btn">Agregar pago</button></div></form>`:`<div class="note">Los pagos se registran cuando la venta está en <b>Ganado</b>.</div><div class="acts"><button class="btn g" data-a="cerrar">Cerrar</button></div>`}`;
  if(!$('#dlg').open)$('#dlg').showModal();
  const f=$('#pf');if(f)f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f)),m=Number(d.monto);
    if(!(m>0))return $('#e').textContent='Escribe un importe mayor a 0.';if(!d.fecha)return $('#e').textContent='Indica la fecha de recepción.';
    const edit=f.dataset.pid;const pay={id:edit||crypto.randomUUID(),monto:m,fecha:d.fecha,metodo:d.metodo,ref:d.ref};
    p.pagos=edit?p.pagos.map(x=>x.id===edit?pay:x):[...(p.pagos||[]),pay];
    await Storage.saveProject(p);toast(edit?'Pago actualizado':'Pago registrado');await render();openPagos(id)};
}
async function exportar(){
  const meta={nextNum:await Storage.getMeta('nextNum')||1,lastBackup:new Date().toISOString()};
  const data={app:'gamez-crm',schema:SCHEMA_VERSION,exportado:meta.lastBackup,meta,projects:await Storage.getProjects()};
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),download:`gamez-crm-respaldo-${today()}.json`});
  a.click();URL.revokeObjectURL(a.href);await Storage.setMeta('lastBackup',meta.lastBackup);toast('Respaldo exportado');render();
}
async function importar(file){
  try{const d=JSON.parse(await file.text());
    if(d.app!=='gamez-crm'||!Array.isArray(d.projects))throw Error('El archivo no es un respaldo de este CRM.');
    if(d.schema>SCHEMA_VERSION)throw Error('El respaldo es de una versión más nueva de la aplicación.');
    d.projects.forEach((p,i)=>{if(!p.id||!Number.isInteger(p.num)||!p.cliente||!p.proyecto||typeof p.importe!=='number'||!Array.isArray(p.pagos))throw Error('Registro inválido en la posición '+(i+1));
      p.pagos.forEach(x=>{if(typeof x.monto!=='number'||!x.fecha)throw Error('Pago inválido en el proyecto #'+p.num)})});
    if(!confirm(`Esto REEMPLAZARÁ todos los datos actuales (${P.length} proyectos) por los del respaldo (${d.projects.length} proyectos). ¿Continuar?`))return;
    const next=Math.max(d.meta?.nextNum||1,...d.projects.map(p=>p.num+1),1);
    await Storage.replaceAll(d.projects,{nextNum:next,lastBackup:d.meta?.lastBackup||''});toast('Respaldo importado');render();
  }catch(e){alert('No se importó nada. '+e.message)}
  $('#imp').value='';
}
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-a],[data-v]');if(!t)return;const {a,v,id,pid}=t.dataset;
  if(v){view=v;$('#side').classList.remove('open');return render()}
  if(a==='logout'){await Storage.signOut();renderLogin();return}
  if(a==='nuevo')openForm();else if(a==='editar')openForm(id);else if(a==='pagos')openPagos(id);else if(a==='cerrar')$('#dlg').close();
  else if(a==='borrar'){const p=P.find(x=>x.id===id);if(confirm(`¿Eliminar el proyecto #${p.num} «${p.proyecto}» y sus ${(p.pagos||[]).length} pagos? No se puede deshacer.`)){await Storage.deleteProject(id);toast('Proyecto eliminado');render()}}
  else if(a==='delpago'){const p=P.find(x=>x.id===id);if(confirm('¿Eliminar este pago?')){p.pagos=p.pagos.filter(x=>x.id!==pid);await Storage.saveProject(p);toast('Pago eliminado');await render();openPagos(id)}}
  else if(a==='editpago'){const p=P.find(x=>x.id===id),x=p.pagos.find(y=>y.id===pid),f=$('#pf');if(f){f.dataset.pid=pid;f.monto.value=x.monto;f.fecha.value=x.fecha;f.metodo.value=x.metodo||'';f.ref.value=x.ref||'';f.monto.focus()}}
  else if(a==='export')exportar();
  else if(a==='verificar'){const r=await Storage.getProjects();$('#ver').innerHTML=`✔ IndexedDB responde. Registros leídos: <b>${r.length}</b> proyectos y <b>${sum(r,p=>p.pagos.length)}</b> pagos.`}
});
document.addEventListener('change',e=>{if(e.target.id==='mes'&&e.target.value){month=e.target.value;render()}if(e.target.id==='imp'&&e.target.files[0])importar(e.target.files[0])});
$('#burger').onclick=()=>$('#side').classList.toggle('open');
function renderLogin(message=''){
  $('#title').textContent='Acceso al CRM';
  $('#nav').innerHTML='';
  const out=$('#logout');if(out)out.hidden=true;
  $('#app').innerHTML=`<div class="card auth-card"><h2>Gámez Desarrollo Web</h2><p class="muted">Inicia sesión para acceder a tus clientes y proyectos.</p>
  <form id="loginForm"><label>Correo electrónico<input name="email" type="email" autocomplete="username" required></label>
  <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
  <div class="err" id="loginError">${esc(message)}</div><button class="btn" type="submit">Iniciar sesión</button></form>
  <p class="muted">La cuenta se administra desde Supabase Authentication. El acceso público no está habilitado.</p></div>`;
  $('#loginForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button');b.disabled=true;
    try{const d=Object.fromEntries(new FormData(f));await Storage.signIn(d.email,d.password);await startApp()}
    catch(err){$('#loginError').textContent='No se pudo iniciar sesión. Revisa tus datos o la configuración de Supabase.';console.error(err)}
    finally{b.disabled=false}
  };
}
async function startApp(){
  const session=await Storage.getSession();
  if(!session){renderLogin();return}
  const out=$('#logout');if(out)out.hidden=false;
  await seedReviewedProspects();
  await render();
  if(navigator.storage?.persist)navigator.storage.persist();
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js');
}
(async()=>{
  try{
    if(!Storage.isConfigured()){renderLogin('Falta configurar Supabase. Revisa config.js y el archivo de instalación.');return}
    await Storage.init();
    Storage.onAuthStateChange(async session=>{
      if(session){try{await startApp()}catch(e){console.error(e);$('#app').innerHTML='<div class="note">No se pudo cargar el CRM. Revisa tu conexión e inténtalo de nuevo.</div>'}}
      else renderLogin();
    });
    await startApp();
  }catch(e){console.error(e);renderLogin('No se pudo conectar con Supabase. Revisa la configuración y tu conexión.')}
})();
