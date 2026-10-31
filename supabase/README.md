# Supabase · CRM Gámez Desarrollo Web

## Estado de esta integración

El repositorio ya contiene el adaptador de almacenamiento en Supabase, el acceso por correo/contraseña y el SQL de base de datos. **La conexión no se activará hasta completar la configuración del proyecto y las credenciales públicas.**

No se importarán los datos locales de prueba. Al iniciar sesión, la aplicación sembrará los dos prospectos revisados (Corazón Contento y Boutique de Patricia Hernández) si todavía no existen.

## 1. Crear el proyecto Supabase

1. Inicia sesión en https://supabase.com/.
2. Crea un proyecto llamado `gamez-crm`.
3. Elige una región cercana y guarda la contraseña de base de datos en un gestor seguro.
4. Abre **SQL Editor → New query**.
5. Copia y ejecuta el contenido completo de `supabase/schema.sql`.

El SQL crea:
- `crm_projects`: proyectos y sus datos completos en JSONB, incluidos pagos y observaciones.
- `crm_meta`: metadatos por usuario.
- `crm_counters`: consecutivos por usuario.
- La función RPC `allocate_crm_project_number()` para asignar números sin colisiones.
- Políticas RLS para que cada usuario solo vea sus propios datos.

## 2. Crear la cuenta de acceso

En **Authentication → Users**, crea un usuario con tu correo y una contraseña segura. Desactiva el registro público de usuarios en Authentication si aparece habilitado. El CRM utiliza inicio de sesión por correo y contraseña.

## 3. Configurar la aplicación

En **Project Settings → API**, copia:
- Project URL.
- Publishable key (o anon key pública heredada, si es la que muestra el proyecto).

Edita `config.js` en la raíz del repositorio y reemplaza:
- `https://TU-PROYECTO.supabase.co`
- `PEGA_TU_PUBLISHABLE_KEY`

La clave debe ser la publicable/anon. **Nunca uses la service_role o una secret key en el navegador ni en GitHub.** RLS es obligatoria y ya está activada por el SQL.

## 4. Publicar y probar

1. Guarda `config.js` en `main`.
2. Espera a que GitHub Pages termine de publicar.
3. Abre el CRM, inicia sesión y comprueba que aparezcan los dos prospectos.
4. Crea un registro de prueba y verifica que aparece en Supabase → Table Editor → `crm_projects`.
5. Inicia sesión desde otro dispositivo y comprueba la sincronización.

## Seguridad y límites

- El cliente web usa solo Project URL + Publishable key; RLS protege los registros.
- No hay clave secreta en el frontend.
- Cada usuario ve sus propios proyectos. Si después se requiere equipo multiusuario y roles compartidos, habrá que diseñar un modelo de organizaciones/miembros; no se debe compartir la contraseña de una cuenta.
- La aplicación requiere conexión a internet para consultar y guardar datos.
- Los respaldos JSON se mantienen; importar un respaldo reemplaza los registros del usuario actual, con confirmación.
- No se migra IndexedDB: los datos anteriores eran pruebas locales y los dos prospectos se crean de nuevo en la nube.

## Archivos

- `config.js`: URL y clave pública del proyecto (pendiente de completar).
- `storage.js`: adaptador Supabase.
- `app.js`: interfaz, autenticación y lógica del CRM.
- `supabase/schema.sql`: esquema, políticas RLS y función de consecutivos.
