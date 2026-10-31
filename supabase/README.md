# Configuración de Supabase para el CRM

Este directorio prepara el esquema de base de datos en la nube. **La aplicación todavía no está conectada**: no se deben introducir claves ficticias ni retirar IndexedDB hasta completar y probar la autenticación y la migración.

## 1. Crear el proyecto

1. Inicia sesión en https://supabase.com/ y crea un proyecto nuevo.
2. Nombre sugerido: `gamez-crm`.
3. Guarda la contraseña de base de datos en un gestor seguro.
4. En el panel del proyecto, abre **SQL Editor** y ejecuta el contenido de `schema.sql`.

## 2. Obtener los datos públicos de conexión

En **Project Settings → API** copia:
- Project URL.
- Publishable key (o la clave anon heredada si el proyecto todavía la muestra).

Estas claves están diseñadas para el cliente, pero solo son seguras con las políticas RLS activadas. El esquema de este repositorio habilita RLS y limita las filas al usuario autenticado.

**Nunca publiques ni compartas la service_role / secret key.** Esa clave omite RLS y no debe estar en HTML, JavaScript del navegador, GitHub Pages ni mensajes.

## 3. Antes de conectar la aplicación

- Exporta un respaldo JSON desde el CRM actual.
- Confirma que el SQL se ejecutó sin errores.
- Comparte únicamente el Project URL y la publishable/anon key pública para configurar el cliente.
- La conexión final debe incluir inicio de sesión, sincronización, manejo de errores y una migración que importe los registros locales sin borrarlos.

## Estructura

- `crm_projects`: un registro por proyecto; conserva el objeto completo del CRM en `data` para no perder campos actuales ni pagos.
- `crm_meta`: metadatos por usuario, incluido el consecutivo.
- RLS: cada usuario autenticado solo puede consultar y modificar sus propias filas.

## Estado

Preparación de esquema completada. Pendiente: crear el proyecto Supabase, ejecutar el SQL, configurar autenticación y URL/clave pública, implementar el adaptador de almacenamiento, migrar los datos locales y probar en dos dispositivos.
