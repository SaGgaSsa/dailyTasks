# DailyTasks

Herramienta interna para el seguimiento de tareas diarias, reemplazando múltiples planillas de Excel por un sistema unificado. Permite gestionar incidencias, tracklists y tickets con diferentes roles de usuario.

## Demo

[https://daily-tasks-amber.vercel.app](https://daily-tasks-amber.vercel.app)

Podés probar el sistema con los siguientes usuarios:

| Rol   | Email                      | Contraseña |
|-------|----------------------------|------------|
| Admin | admin@dailytasks.com       | 1234       |
| Dev   | dev@dailytasks.com         | 1234       |
| QA    | qa@dailytasks.com          | 1234       |

> Si los datos de demo están rotos, es probable que alguien haya estado experimentando. Avisame y restauro el seed.

## ¿Qué permite hacer?

- Gestionar incidencias vinculadas a trámites externos con asignación de colaboradores y tareas
- Crear tracklists con tickets asociados, con seguimiento de estado por rol
- Ver el progreso en vista de grilla, kanban o timeline tipo Gantt
- Registrar en bitácora scripts, cambios de base de datos y notas por tracklist
- Configurar días no laborables que se reflejan en el diagrama de timeline

## Roles

**Admin** — acceso completo, puede asignar tareas y colaboradores  
**Dev** — gestiona sus tareas asignadas  
**QA** — crea tracklists, tickets y lleva el seguimiento de testing

## Stack

Next.js · Prisma · PostgreSQL · Docker · shadcn/ui
