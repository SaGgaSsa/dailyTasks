# QUESTIONS RESUME

Compilacion de pendientes reales detectados en [QUESTIONS.md](/home/saggassa/workspaces/projects/dailyTasks/daily-tasks/QUESTIONS.md) durante la revision del 2026-03-18.

Objetivo: dejar solo lo que todavia necesita decision, formalizacion tecnica o resolucion por implementacion.

## Resumen

- `QUESTIONS.md` tiene `135` preguntas totales.
- `20` estan marcadas como `resuelta`.
- `115` siguen con `Estado: pendiente`.
- De esas `115`, muchas ya tienen criterio funcional escrito pero no tienen una `Resolucion` formal.
- Este archivo conserva solo pendientes reales o pendientes que conviene resolver por tandas.

## Tanda 1: Seguridad, permisos e integraciones

### Criterio parcial ya definido, falta cerrar o implementar

- `17` APIs externas: la decision de producto es dejarlas ocultas por ahora, pero falta formalizar como quedan deshabilitadas y que superficie se conserva lista para reactivar.
- `21` Server Actions administrativas: hay que inventariar las que todavia quedaron abiertas sin chequeo de `ADMIN` y consolidar la politica final por accion.
- `57` `clearTicketUnreadUpdates`: falta definir si se mantiene sin validacion o si se protege por sesion y ownership del ticket.
- `59` Eliminar incidencias con tickets relacionados: ya hay criterio de que no deberia permitirse, pero falta cerrar el bloqueo real en backend.
- `61` Uploads por API externa: debe reutilizar las mismas validaciones que el flujo interno.
- `62` Archivos y transacciones: falta una estrategia concreta para rollback o limpieza compensatoria.
- `66` Secretos de integracion: unificar `INGEST_SECRET` y `EXTERNAL_API_SECRET`.
- `68` API externa de incidencias: debe impedir duplicados por `ExternalWorkItem`.
- `70` Permisos de paginas: el criterio de `ADMIN`, `DEV` y `QA` cambio respecto de una resolucion anterior; hay que consolidarlo en una sola matriz valida.
- `78-80` Adjuntos: tomar siempre `session.user.id`, excluir `svg` y centralizar validaciones en todos los flujos.
- `81` Ruta de uploads: `public/uploads` fue temporal; falta cerrar la ubicacion definitiva y el contrato via env.
- `82` Adjuntos avanzados: decidir si se implementa antivirus, hashing o deduplicacion, o si se explicita que queda fuera de alcance.
- `83` Links adjuntos: permitir `http` ademas de `https`.
- `84` Borrado de archivos fisicos: falta definir una estrategia segura de path ownership y consistencia de URL.
- `91` Acceso a detalle de usuarios: falta separar visibilidad minima general de detalle administrativo.
- `128` Auditoria/logging sensible: falta decidir si se incorpora logging estructurado.
- `129` Rotacion de secretos e invalidacion de sesiones: no hay criterio definido.
- `133` Politica uniforme de permisos: falta decidir si se toma como prerequisito antes de refactors grandes.

### Preguntas relacionadas o a absorber por otras

- `60` API externa de incidencias: si las APIs externas quedan ocultas, esta decision queda subordinada a `17`.
- `63` Endpoint legacy de ingest: depende de la misma decision de ocultar/desactivar integraciones externas.
- `80` Centralizacion de validaciones de archivos: queda absorbida por `61` y `78-79`.

## Tanda 2: Dominio, modelo y automatismos

### Producto y limites del dominio

- `1` Modelo conceptual principal: convivirian incidencias, tracklists, tickets y tareas; falta bajar eso a una descripcion formal del dominio.
- `2` Relacion `ExternalWorkItem` / `Incidence` / `TicketQA`: hay criterio funcional parcial, pero falta formalizar cardinalidades y referencias canonicas.
- `3` Multiples incidencias por `ExternalWorkItem`: se admite una manual y multiples creadas desde tickets; falta traducirlo a invariantes tecnicos.
- `4` Estados de `Incidence` y `TicketQA`: los tests marcan el comportamiento esperado, pero falta una maquina de estados centralizada.
- `5` Revision QA: hay doble dependencia entre incidencia y ticket; falta decidir la autoridad formal del flujo.
- `6-7` Alcance organizacional: el sistema esta pensado para un equipo chico y una sola instalacion; conviene dejarlo asentado como restriccion de producto.
- `8` `TaskType` vs `WorkItemType`: el criterio es quedarse con `WorkItemType`, pero falta limpiar referencias residuales y formalizarlo.

### Modelo de datos

- `32` `Incidence.externalWorkItemId`: no debe ser unico globalmente, pero falta una forma segura de distinguir incidencia manual de incidencias creadas desde ticket.
- `33` `TicketQA.incidenceId @unique`: el comportamiento se considera intencional, pero falta validar que soporte el historial deseado.
- `34` `Assignment.isAssigned`: todavia no esta claro si debe existir o si es un resto de un modelo anterior.
- `35` Asignaciones desactivadas: no deben contar ni mostrarse, pero si conservar historial y tareas asociadas.
- `36` `IncidencePage.isMainPage`: debe existir una sola pagina principal por incidencia y conviene decidir si eso se refuerza en DB.
- `37-38` `WorkItemType.color` y limite de 5 tipos: el negocio lo acepta, pero falta formalizar si la unicidad del color es regla de dominio o solo de UI.
- `39` Password obligatoria: el criterio funcional existe, falta bajar la validacion a todos los flujos.
- `40` `Task.isCompleted` vs `Incidence.status = DONE`: pueden divergir en algunos estados, pero `DONE` debe completar todas las tareas vigentes.
- `41` Ownership de adjuntos: se confirma que pertenecen al `ExternalWorkItem`; falta revisar implicancias tecnicas y de UI.
- `42` Scripts en `Incidence`: se decide mantenerlos ahi, pero falta corregir deteccion de `hasScripts` para basarse en datos reales.
- `43` `NonWorkingDay`: dejarlo explicitamente global para toda la instalacion.

### Flujos y automatismos

- `44` Transiciones automaticas: falta documentarlas y centralizarlas en un solo punto.
- `45` Salida de `BACKLOG`: puede ocurrir con asignacion y horas, sin exigir tareas.
- `46` Volver a `BACKLOG`: quitar horas no deberia hacerlo; quitar asignados si.
- `47` Sync de tickets ligados: los tests definen el comportamiento, pero falta documentar exactamente en que eventos corre.
- `48` `completeIncidence()` sobre incidencias nacidas de ticket: falta blindar backend para evitar uso directo indebido.
- `49` Completar incidencia sin completar manualmente todas las tareas: se permite solo a `ADMIN`.
- `50` Rechazo QA: la tarea automatica es intencional, el truncado no.
- `51` `description` / `observation`: falta normalizar nombres y decidir que se persiste en ticket y en tarea inicial.
- `52` Crear incidencia al editar ticket: falta cerrar la condicion exacta en `updateTicket`.
- `53` Fallo de `runAssignmentTransaction`: debe revertir la creacion o actualizacion principal.
- `54` Tarea inicial automatica al crear incidencia desde ticket: se mantiene y ademas debe seguir siendo no borrable.
- `55` Horas completadas por asignacion: el comportamiento actual se acepta por simplicidad, pero falta asentarlo como regla.
- `56` Ocultar incidencias `IN_PROGRESS` a DEV que ya completo lo suyo: parece optimizacion visual; falta decidir si se mantiene o cambia.
- `58` `dismissTicket` debe llevar la incidencia a `DISMISSED` cuando exista.

### Contenido enriquecido

- `69` Nombres de `WorkItemType`: hay que homogeneizar seed y dominio para evitar mezcla entre nombres genericos y legacy.
- `71` Pagina con titulo vacio: debe mostrarse como `Nueva Pagina`.
- `72-73` Enlaces compartidos de paginas: ya quedaron conceptualmente resueltos por la ruta interna readonly, pero conviene absorber cualquier referencia residual a la ruta vieja.
- `74` `revalidatePath` de paginas: revisar si la ruta actual esta mal y unificar criterio de rutas canonicas.
- `75` Paginas vacias: se permite guardarlas.
- `76` Scripts: todos pueden leer; QA puede ver y copiar.
- `77` Historial/versionado de paginas y scripts: fuera de alcance por ahora.

### Usuarios y administracion

- `86` Seed y `SEED_USER_PASSWORD`: decidir si el seed sigue con password fija o si pasa a obedecer env.
- `87` Longitud minima de password: subirla a un minimo razonable.
- `88` Contrato de `upsertUser` y `createUser`: unificar al contrato estandar.
- `89` `getUsers()` y password: esta practicamente resuelto por una respuesta anterior; si reaparece, absorberlo en el cierre del modulo de usuarios.
- `90` `getUserDetails`: debe contar tareas reales y no solo asignaciones.
- `92` Tecnologias y modulos: falta decidir si QA puede administrarlos o si quedan solo para `ADMIN`.

### UI, navegacion e i18n

- `93` Rutas `/dashboard` y `/auth/login`: parece deuda vieja de navegacion; falta cerrar el destino canonico.
- `94-95` Filtros de tecnologias: deben ser dinamicos y dejar de depender de valores hardcodeados.
- `96-97` UI e i18n: el objetivo sigue siendo texto en espanol y uso real de `next-intl`.
- `98` Persistencia de filtros: decidir entre URL y `localStorage`, manteniendo configuraciones separadas por pantalla.
- `99` Analytics: cualquier usuario autenticado puede verla.
- `100` Sidebar blocker: se mantiene mostrar descripcion corta sin tramite.
- `101` Lecturas via Server Actions desde cliente: hay que reemplazar el patron actual por una estrategia mas consistente.
- `102` Notificaciones: placeholder hasta tener backend real.
- `103` Script inline de theme/performance: falta redefinirlo para que el theme cargue de forma estable.
- `104` Copiado de links de paginas: falta decidir si el origen debe ser configurable o si se usa el origen actual del navegador.

## Tanda 3: Rendimiento, testing y despliegue

### Sin respuesta en `QUESTIONS.md`

- `105` N+1 en zonas criticas.
- `106` `setTimeout(50)` en `getIncidence()`.
- `107` Estrategia global de cache con `unstable_cache` y `revalidateTag`.
- `108` Indices adicionales en Prisma.
- `109` Carga excesiva de datos en listados de incidencias.
- `110` Analytics en memoria vs agregados en SQL/Prisma.
- `111` Alcance de la carga del Gantt.
- `112` `fetch` a `NEXT_PUBLIC_APP_URL` desde servidor.
- `113` Existencia real de `/api/issues`.
- `114` Invalidez de cache de usuarios asignables.
- `115` Cobertura de permisos en tests.
- `116` Tests para endpoints externos, uploads, pages y scripts.
- `117` Suficiencia de integration tests con DB real y mocks.
- `118` Uso de `TRUNCATE` global con `executeRawUnsafe` en tests.
- `119` Ausencia de tests de seed y migraciones.
- `120` Criterio final de CI: `lint` + `tsc --noEmit` + tests.
- `121` `prisma db push` en produccion vs migraciones controladas.
- `122` Confiabilidad real de `prisma/migrations`.
- `123` Homogeneizar historia de migraciones antes de tocar mas schema.
- `124` Necesidad real de `node_modules` completos en el runner.
- `125` Backups de DB y uploads como unidad consistente.
- `126` Estrategia de deploy principal: Docker con Nginx vs otros hostings.
- `127` Compatibilidad de `DATABASE_URL` entre local y Docker.
- `130` Mantener `output: 'standalone'` como estandar.
- `131` Extraer capa de dominio antes de seguir sumando reglas.
- `132` Unificar todos los contratos de Server Actions al formato normado.
- `134` Nivel de refactor permitido antes de seguir agregando features.
- `135` Orden de prioridad sugerido: seguridad/autorizacion, luego dominio/consistencia, luego rendimiento/UI.

## Orden recomendado de resolucion

1. Seguridad, permisos, adjuntos e integraciones.
2. Dominio, cardinalidades e invariantes de estados.
3. Flujos automáticos de incidencias y tickets.
4. Usuarios, filtros, i18n y navegacion.
5. Rendimiento, testing y despliegue.

## Notas de limpieza futura

- `QUESTIONS.md` mezcla preguntas abiertas, respuestas parciales y resoluciones ya implementadas.
- Conviene, en un pase posterior, actualizar `Estado` y `Resolucion` en origen para que este archivo no tenga que actuar como fuente secundaria permanente.
