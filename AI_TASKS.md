# AI Tasks - Deuda Técnica y Pendientes

Documento para rastrear tareas pendientes, bugs conocidos y mejoras técnicas identificadas.

---

## 🔴 Pendiente: Sticky Header en Backlog
- **Archivo:** components/board/backlog.tsx (línea ~359)
- **Problema:** La tabla scrollea con la página en lugar de tener scroll interno. El header se pierde al hacer scroll.
- **Intento fallido:** Se probó `sticky top-0`, `max-h-[calc(100vh-280px)]`, `z-20`, `bg-[#0F0F0F]` pero algo en el layout padre lo rompe.
- **Solución sugerida:** Revisar el layout contenedor principal o usar `ScrollArea` de Radix rodeando la tabla.

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

