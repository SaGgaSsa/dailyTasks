# AI Tasks - Deuda Técnica y Pendientes

Documento para rastrear tareas pendientes, bugs conocidos y mejoras técnicas identificadas.

---

## 🔴 Pendiente: Sticky Header en Backlog
- **Archivo:** components/board/backlog.tsx (línea ~359)
- **Problema:** La tabla scrollea con la página en lugar de tener scroll interno. El header se pierde al hacer scroll.
- **Intento fallido:** Se probó `sticky top-0`, `max-h-[calc(100vh-280px)]`, `z-20`, `bg-[#0F0F0F]` pero algo en el layout padre lo rompe.
- **Solución sugerida:** Revisar el layout contenedor principal o usar `ScrollArea` de Radix rodeando la tabla.

---

## 🔴 Pendiente: Error de Performance en Redirecciones (Workaround Activo)
- **Archivo:** app/layout.tsx, components/performance-error-boundary.tsx
- **Problema:** Al hacer redirecciones rápidas desde Server Components (ej: /dashboard redirige a /dashboard?view=backlog), aparece el error `TypeError: Failed to execute 'measure' on 'Performance': ... cannot have a negative time stamp`. Esto rompe la hidratación de React y deja el CSS/Theme inconsistente.
- **Causa raíz:** Bug conocido de Next.js 16.x con Server Components + redirecciones inmediatas. Ver issue #86060 en vercel/next.js (estado: ABIERTO desde nov 2025).
- **Workaround implementado:** 
  - Parche global en `<head>` que intercepta `performance.measure()` y suprime errores de timestamp negativo
  - Error Boundary de React (`PerformanceErrorBoundary`) que captura y silencia el error específico
  - La app continúa funcionando normalmente después del error
- **Solución definitiva:** 
  - **Opción A:** Esperar fix oficial de Next.js (issue #86060 sigue abierto)
  - **Opción B:** Actualizar a Next.js 16.2.x o superior cuando esté estable y verificar si el fix está incluido
  - **Fecha de revisión recomendada:** Marzo 2026 o cuando salga Next.js 16.2 estable

---

## Cómo agregar nuevas entradas

```markdown
## [PRIORIDAD]: [Título descriptivo]
- **Archivo:** ruta/al/archivo.tsx (línea ~XX)
- **Problema:** Descripción del problema
- **Contexto:** Por qué se pospuso / qué se intentó
- **Solución sugerida:** Ideas para arreglarlo
```

**Prioridades:**
- 🔴 Alta - Bloqueante o impacto mayor
- 🟡 Media - Mejora importante pero no urgente
- 🟢 Baja - Nice to have

