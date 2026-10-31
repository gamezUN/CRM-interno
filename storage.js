/* Adaptador de almacenamiento en Supabase.
   Los datos ya no se guardan en IndexedDB ni se sincronizan desde el navegador.
   Cada consulta queda limitada al usuario autenticado mediante RLS. */
const Storage=(()=>{
  let client=null;
  const config=window.GAMEZ_SUPABASE_CONFIG||{};
  const configured=()=>Boolean(
    config.url && config.publishableKey &&
    !config.url.includes('TU-PROYECTO') &&
    !config.publishableKey.includes('PEGA_TU')
  );
  const ready=()=>{if(!client)throw new Error('Supabase no está inicializado');return client};
  const uid=async()=>{const {data,error}=await ready().auth.getUser();if(error)throw error;if(!data.user)throw new Error('Sesión no iniciada');return data.user.id};
  return {
    isConfigured:configured,
    async init(){
      if(!configured())throw new Error('Configura el Project URL y la Publishable Key en config.js');
      if(!window.supabase?.createClient)throw new Error('No se pudo cargar la biblioteca de Supabase');
      client=window.supabase.createClient(config.url,config.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
      return client;
    },
    getSession:async()=>{const {data,error}=await ready().auth.getSession();if(error)throw error;return data.session},
    signIn:async(email,password)=>{const {data,error}=await ready().auth.signInWithPassword({email,password});if(error)throw error;return data},
    signOut:async()=>{const {error}=await ready().auth.signOut();if(error)throw error},
    onAuthStateChange:callback=>ready().auth.onAuthStateChange((_event,session)=>callback(session)),
    getProjects:async()=>{
      const user_id=await uid();
      const {data,error}=await ready().from('crm_projects').select('data').eq('user_id',user_id).order('num',{ascending:true});
      if(error)throw error;
      return (data||[]).map(row=>row.data);
    },
    saveProject:async p=>{
      const user_id=await uid();
      const {error}=await ready().from('crm_projects').upsert({
        user_id,id:String(p.id),num:Number(p.num),data:p,updated_at:new Date().toISOString()
      },{onConflict:'user_id,id'});
      if(error)throw error;
    },
    deleteProject:async id=>{
      const user_id=await uid();
      const {error}=await ready().from('crm_projects').delete().eq('user_id',user_id).eq('id',String(id));
      if(error)throw error;
    },
    getMeta:async key=>{
      const user_id=await uid();
      const {data,error}=await ready().from('crm_meta').select('value').eq('user_id',user_id).eq('key',key).maybeSingle();
      if(error)throw error;return data?data.value:undefined;
    },
    setMeta:async(key,value)=>{
      const user_id=await uid();
      const {error}=await ready().from('crm_meta').upsert({user_id,key,value,updated_at:new Date().toISOString()},{onConflict:'user_id,key'});
      if(error)throw error;
    },
    nextNumber:async()=>{
      const {data,error}=await ready().rpc('allocate_crm_project_number');
      if(error)throw error;return Number(data);
    },
    replaceAll:async(projects,meta)=>{
      const {error}=await ready().rpc('replace_crm_data',{
        p_projects:projects,
        p_meta:meta
      });
      if(error)throw error;
    }
  };
})();