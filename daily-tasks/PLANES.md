# PLANES

Planes de trabajo derivados de las preguntas ya respondidas en [QUESTIONS.md](/home/saggassa/workspaces/projects/dailyTasks/daily-tasks/QUESTIONS.md).

Objetivo: resolver los pendientes por tandas, en orden, minimizando riesgo y dejando claro que partes del sistema toca cada bloque.

## Resumen

- Fuente principal: `QUESTIONS.md`
- Complemento operativo: `QUESTIONS_RESUME.md`
- Enfoque: resolver primero permisos y seguridad, despues dominio y automatismos, luego UX/usuarios/i18n, y al final sincronizar documentacion
- Restriccion actual: evitar migraciones Prisma en la primera etapa salvo que aparezca algo imprescindible

## Orden recomendado

1. Plan A: Seguridad, permisos e integraciones
2. Plan B: Dominio, estados y automatismos
3. Plan C: Usuarios, filtros, paginas e i18n
4. Plan D: Documentacion y cierre de preguntas

## Complejidad estimada

- Plan A: media/alta
- Plan B: alta
- Plan C: media
- Plan D: baja

## Plan A: Seguridad, permisos e integraciones

### Preguntas cubiertas

`17, 21, 57, 59, 61, 62, 66, 68, 70, 78, 79, 80, 81, 83, 84, 91`

### Objetivo

Cerrar los huecos de autorizacion y de integraciones externas sin cambiar el modelo de datos. Este bloque reduce riesgo funcional y deja la base segura para tocar reglas de negocio despues.

### Cambios previstos

- Desactivar `app/api/external/*` por defecto usando una bandera `ENABLE_EXTERNAL_API`.
- Cuando la API externa este desactivada, responder `404` y no exponer operaciones sensibles.
- Consolidar la estrategia de secreto en `EXTERNAL_API_SECRET` y dejar de depender de `INGEST_SECRET` en el flujo activo.
- Relevar y cerrar las Server Actions administrativas que todavia queden abiertas a usuarios autenticados sin permiso suficiente.
- Proteger `clearTicketUnreadUpdates` con sesion y acceso real al ticket.
- Bloquear en backend la eliminacion de incidencias con tickets QA relacionados.
- Unificar la validacion de adjuntos y enlaces:
  usar `session.user.id`,
  excluir `svg`,
  permitir `http` y `https`,
  centralizar reglas compartidas,
  endurecer el borrado de archivos fisicos.
- Mover la definicion de la raiz de adjuntos a `ATTACHMENTS_ROOT_DIR` con fallback controlado.
- Separar acceso a datos minimos de usuario de acceso a detalle administrativo.
- Consolidar la matriz de permisos de paginas para que no entre en conflicto con decisiones nuevas de `QUESTIONS.md`.

### Archivos o zonas probables

- `app/api/external/*`
- `app/actions/attachment-actions.ts`
- `app/actions/pages.ts`
- `app/actions/tracklists.ts`
- `app/actions/user-actions.ts`
- `lib/authorization.ts`

### Criterio de terminado

- Ninguna mutacion sensible queda abierta solo por tener sesion.
- Las APIs externas quedan ocultas salvo activacion explicita.
- Adjuntos y links comparten una sola politica de validacion.
- El detalle administrativo de usuarios no queda visible fuera de `ADMIN`.

### Tests a agregar o ajustar

- Integracion para API externa desactivada.
- Integracion para `clearTicketUnreadUpdates`.
- Integracion para borrado de incidencia con tickets relacionados.
- Integracion para validacion de adjuntos y links.

## Plan B: Dominio, estados y automatismos

### Preguntas cubiertas

`1, 2, 3, 4, 5, 8, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 69`

### Objetivo

Formalizar el comportamiento actual del dominio y concentrar las reglas de estados y sincronizaciones para que dejen de depender de acciones dispersas.

### Cambios previstos

- Documentar y asumir como modelo actual la convivencia entre incidencias, tickets, tracklists, tareas y tramites externos.
- Dejar `WorkItemType` como clasificacion canonica y retirar dependencias activas de `TaskType` donde siga apareciendo.
- Extraer la logica de transiciones de incidencia y ticket a helpers de dominio reutilizables.
- Mantener la regla de una incidencia manual por `ExternalWorkItem` y multiples incidencias derivadas desde tickets, resuelto por validacion de aplicacion.
- Formalizar `Assignment.isAssigned` como asignacion activa:
  las desactivadas se conservan, pero no cuentan ni se muestran como trabajo actual.
- Mantener una sola pagina principal por incidencia con enforcement transaccional en aplicacion.
- Mantener unicidad de color y limite de `WorkItemType` como regla actual.
- Bajar a reglas explicitas:
  salida de `BACKLOG`,
  vuelta a `BACKLOG`,
  `completeIncidence` solo para `ADMIN`,
  bloqueo de completar manualmente incidencias nacidas de ticket,
  sincronizacion de tickets ligados,
  efecto de `dismissTicket`.
- Normalizar descripcion y observacion de rechazos QA.
- Hacer rollback real cuando falle la parte secundaria de una operacion compuesta.
- Mantener la tarea inicial automatica de tickets y volverla no borrable por regla de negocio.
- Revisar la logica que oculta incidencias `IN_PROGRESS` a DEV y dejarla como regla explicita o reemplazarla.

### Archivos o zonas probables

- `app/actions/incidence-actions.ts`
- `app/actions/tracklists.ts`
- `lib/*` de helpers de dominio/transicion
- `prisma/schema.prisma` solo para lectura y verificacion en esta fase

### Criterio de terminado

- Las transiciones de estado quedan centralizadas.
- Las reglas de incidencia/ticket dejan de estar repartidas e inconsistentes.
- Los tests describen el flujo actual esperado y protegen regresiones.

### Tests a agregar o ajustar

- Matriz de transiciones `Incidence` y `TicketQA`.
- Casos con incidencias manuales y derivadas de ticket.
- Casos con `Assignment.isAssigned = false`.
- Casos de `completeIncidence`, `dismissTicket`, rechazo QA y rollback transaccional.

## Plan C: Usuarios, filtros, paginas e i18n

### Preguntas cubiertas

`6, 7, 15, 71, 72, 73, 74, 75, 76, 77, 86, 87, 88, 90, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104`

### Objetivo

Corregir deudas de UX, contratos inconsistentes y textos/filtros desalineados con el estado actual del sistema, sin refactor estructural fuerte.

### Cambios previstos

- Dejar asentado que el sistema apunta a un solo equipo chico, sin multi-tenant.
- Corregir comportamiento de paginas:
  titulo vacio mostrado como `Nueva Pagina`,
  enlaces internos readonly consistentes,
  `revalidatePath` apuntando a rutas canonicas.
- Mantener paginas vacias y scripts sin versionado como decision actual.
- Hacer que el seed use `SEED_USER_PASSWORD` si existe, con fallback explicito.
- Subir el minimo de password a un valor razonable.
- Unificar contratos de respuestas del modulo de usuarios al formato estandar.
- Corregir `getUserDetails` para contar tareas reales.
- Definir si tecnologias y modulos quedan bajo `ADMIN` solamente y alinear UI/backend.
- Corregir navegacion residual entre `/dashboard`, `/login` y `/auth/login`.
- Volver dinamicos los filtros de tecnologias y eliminar hardcodes viejos.
- Corregir desajuste entre filtros por nombre e IDs.
- Empujar UI a espanol y reducir strings hardcodeadas fuera de i18n.
- Dejar una estrategia unica para persistencia de filtros por pantalla.
- Reemplazar lecturas disparadas desde cliente por un patron mas consistente.
- Rehacer la carga del theme para que no dependa de scripts inline fragiles.
- Mantener la pestana de notificaciones como placeholder.

### Archivos o zonas probables

- `app/dashboard/*`
- `app/actions/user-actions.ts`
- `app/actions/pages.ts`
- `lib/i18n/*`
- componentes de navbar, filtros y theme

### Criterio de terminado

- Los filtros funcionan con datos reales de BD.
- Las respuestas del modulo de usuarios son consistentes.
- La UI principal deja de mezclar rutas y textos viejos.
- El theme carga de forma estable.

### Tests a agregar o ajustar

- Integracion para `getUserDetails`.
- Integracion para contratos de acciones de usuario.
- Integracion para filtros dinamicos.
- Verificacion funcional de rutas canonicas y paginas readonly.

## Plan D: Documentacion y cierre de preguntas

### Preguntas cubiertas

`15` y cierre administrativo del resto cuando se implementen los planes anteriores.

### Objetivo

Sincronizar el estado del conocimiento del proyecto con lo realmente implementado, evitando que `QUESTIONS.md` siga acumulando pendientes ya resueltos.

### Cambios previstos

- Mantener `PLANES.md` como tablero de ejecucion por tandas.
- Al terminar cada plan, volver a `QUESTIONS.md` y completar `Resolucion` y `Estado` de lo efectivamente implementado.
- Ajustar `AGENTS.md` solo si alguna decision cambia reglas activas del repositorio.
- No reescribir `README.md` completo; solo corregir lo que induzca a error operativo.

### Criterio de terminado

- No quedan preguntas implementadas marcadas como pendientes.
- `PLANES.md`, `QUESTIONS.md` y el codigo quedan razonablemente alineados.

## Tanda mas riesgosa

El bloque mas complejo es **Plan B** porque toca la mayor cantidad de reglas de negocio cruzadas y afecta incidencias, tickets, tareas, asignaciones y automatismos.

## Tanda recomendada para empezar

Empezar por **Plan A**. Tiene menor ambiguedad que Plan B y reduce el riesgo de seguir cambiando logica de negocio sobre una base de permisos y adjuntos todavia inconsistente.
