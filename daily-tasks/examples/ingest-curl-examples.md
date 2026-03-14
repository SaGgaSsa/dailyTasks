# Ejemplos de curl para probar el endpoint de ingesta de tareas

Antes de ejecutar los ejemplos, exporta el secreto real desde tu entorno local:

```bash
export INGEST_SECRET="reemplaza-este-valor"
```

## 1. Ingesta exitosa con archivo JSON

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $INGEST_SECRET" \
  -d @examples/ingest-example.json
```

## 2. Ingesta exitosa con payload inline

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $INGEST_SECRET" \
  -d '[
    {
      "title": "Tarea de ejemplo",
      "description": "Descripción de la tarea",
      "status": "pendiente",
      "userEmail": "sebastian.galarza@sisa.com.ar",
      "estimatedHours": 5.0
    }
  ]'
```

## 3. Error: Header de autenticación faltante

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d @examples/ingest-example.json
```

**Respuesta esperada:**
```json
{
  "error": "Header x-api-secret es requerido"
}
```

## 4. Error: Credenciales inválidas

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: clave-incorrecta" \
  -d @examples/ingest-example.json
```

**Respuesta esperada:**
```json
{
  "error": "Credenciales inválidas"
}
```

## 5. Error: Payload no es un array

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $INGEST_SECRET" \
  -d '{"title": "Tarea individual"}'
```

**Respuesta esperada:**
```json
{
  "error": "El payload debe ser un array de tareas"
}
```

## 6. Error: Array vacío

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $INGEST_SECRET" \
  -d '[]'
```

**Respuesta esperada:**
```json
{
  "error": "El array de tareas no puede estar vacío"
}
```

## 7. Error: Status inválido

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $INGEST_SECRET" \
  -d '[
    {
      "title": "Tarea con status inválido",
      "status": "invalido",
      "estimatedHours": 2.0
    }
  ]'
```

**Respuesta esperada:**
```json
{
  "success": false,
  "created": 0,
  "failed": 1,
  "errors": ["Status inválido: invalido. Valores permitidos: pendiente, analysis, desarrollo, testing, done"],
  "details": {
    "created": [],
    "failed": [
      {
        "title": "Tarea con status inválido",
        "error": "Status inválido: invalido. Valores permitidos: pendiente, analysis, desarrollo, testing, done"
      }
    ]
  }
}
```

## 8. Error: Usuario no encontrado

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $INGEST_SECRET" \
  -d '[
    {
      "title": "Tarea para usuario inexistente",
      "status": "pendiente",
      "userEmail": "usuario@inexistente.com",
      "estimatedHours": 3.0
    }
  ]'
```

**Respuesta esperada:**
```json
{
  "success": false,
  "created": 0,
  "failed": 1,
  "errors": ["Usuario con email usuario@inexistente.com no encontrado"],
  "details": {
    "created": [],
    "failed": [
      {
        "title": "Tarea para usuario inexistente",
        "error": "Usuario con email usuario@inexistente.com no encontrado"
      }
    ]
  }
}
```

## 9. Respuesta exitosa esperada

```json
{
  "success": true,
  "created": 6,
  "failed": 0,
  "errors": [],
  "details": {
    "created": [
      "clx1234567890",
      "clx1234567891", 
      "clx1234567892",
      "clx1234567893",
      "clx1234567894",
      "clx1234567895"
    ],
    "failed": []
  }
}
```

## 10. Respuesta parcial (algunas tareas fallan)

```json
{
  "success": false,
  "created": 4,
  "failed": 2,
  "errors": [
    "Status inválido: invalido. Valores permitidos: pendiente, analysis, desarrollo, testing, done",
    "Usuario con email usuario@inexistente.com no encontrado"
  ],
  "details": {
    "created": [
      "clx1234567890",
      "clx1234567891",
      "clx1234567892", 
      "clx1234567893"
    ],
    "failed": [
      {
        "title": "Tarea con status inválido",
        "error": "Status inválido: invalido. Valores permitidos: pendiente, analysis, desarrollo, testing, done"
      },
      {
        "title": "Tarea para usuario inexistente", 
        "error": "Usuario con email usuario@inexistente.com no encontrado"
      }
    ]
  }
}
```

## Notas importantes:

1. **Definir la clave secreta**: Usa el valor real de `INGEST_SECRET` desde tu `.env` o tu shell, nunca una clave hardcodeada en documentación
2. **Ruta del archivo**: Ajusta la ruta `@examples/ingest-example.json` según la ubicación de tu archivo
3. **URL del servidor**: Si tu servidor no está en `localhost:3000`, ajusta la URL en los comandos
4. **Formato de status**: Los valores permitidos son: `pendiente`, `analysis`, `desarrollo`, `testing`, `done` (y sus variantes en español)
5. **Campos requeridos**: `title` y `estimatedHours` son obligatorios para cada tarea
