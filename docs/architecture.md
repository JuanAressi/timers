# Arquitectura

## Stack

| Pieza | Elección | Motivo |
|---|---|---|
| Build | Vite | Ya configurado. |
| UI | React 19 + TypeScript estricto | |
| Estilos | Tailwind v4 (`@tailwindcss/vite`) | Ya configurado en `src/index.css`. |
| Estado | Zustand | Liviano; el store llama a funciones de dominio puras. |
| Iconos | lucide-react | Para el selector de icono de grupos y timers. |
| Drag & drop | @dnd-kit | Reordenar dentro de una lista y entre listas. |
| Gráficos | Recharts para las tortas; SVG propio para la línea del día | La línea es simple y queda mejor hecha a medida. |
| Tests | Vitest | Ya configurado (`src/**/*.test.ts`). |
| Lint | oxlint | Ya configurado. |

Cada dependencia se instala en el ticket que la necesita, no antes.

## Estructura de carpetas

```
src/
  domain/      # tipos y funciones puras (sin React, sin storage). Tests al lado.
  storage/     # leer/guardar en localStorage, migraciones, parseo y validación de JSON externo
  store/       # store de Zustand: une acciones de dominio + persistencia
  features/    # UI por feature: timers/, groups/, entries/, stats/, backup/
  ui/          # componentes visuales compartidos (Button, Dialog, IconPicker, …)
legacy/        # prototipo HTML original (referencia de comportamiento; no se compila)
```

## Modelo de datos

```ts
type Id = string // crypto.randomUUID()

interface Group {
  id: Id
  name: string
  icon: string | null   // nombre de icono de lucide, ej. "code"
  color: string         // hex, ej. "#2f7d5b"
  order: number
  archivedAt: number | null
  createdAt: number
}

interface Timer {
  id: Id
  groupId: Id
  name: string
  icon: string | null
  color: string
  order: number         // orden dentro de su grupo
  archivedAt: number | null
  createdAt: number
}

type Entry =
  | { id: Id; timerId: Id; type: 'session'; startedAt: number; endedAt: number | null }
  | { id: Id; timerId: Id; type: 'adjustment'; at: number; deltaMs: number; note: string | null }

interface Settings {
  singleRunning: boolean // default true
}

interface PersistedState {
  schemaVersion: 1
  groups: Group[]
  timers: Timer[]
  entries: Entry[]
  settings: Settings
}
```

Todos los tiempos son epoch en milisegundos (`number`). Las fechas legibles se calculan solo en la UI.

## Invariantes

1. Cada timer tiene como máximo **una** sesión abierta (`endedAt === null`).
2. Con `singleRunning`, como máximo una sesión abierta en toda la app: iniciar un timer cierra las demás en el mismo `now`.
3. Una sesión cerrada cumple `endedAt >= startedAt`.
4. El total de un timer es la suma de sus sesiones cerradas, más `now - startedAt` de la abierta, más sus ajustes. **Nunca es negativo**: un ajuste negativo se limita a `-total` actual.
5. Todo timer pertenece a un grupo existente. Siempre existe al menos un grupo; si no hay ninguno, se crea "General".
6. Archivar oculta y conserva el historial. Borrar elimina el timer y sus entries, con confirmación.
7. Un grupo se borra solo si está vacío; si tiene timers, la UI pide moverlos a otro grupo o archivarlos.

## Cálculos de tiempo (src/domain)

- Toda función que dependa del tiempo actual recibe `now` como parámetro.
- **Por día**: los días son locales (zona horaria del navegador). Una sesión que cruza la medianoche se reparte entre los dos días. Un ajuste cuenta en el día de su `at`.
- **Rangos de estadísticas**: hoy, esta semana (lunes a domingo) y este mes, todos en hora local.
- La sesión abierta se incluye en todos los cálculos hasta `now`.

## Persistencia (src/storage)

- Una sola clave: `timers.state`, con `PersistedState` serializado.
- Se guarda después de cada acción que modifica el estado. No se guarda en cada tick: los tiempos se derivan de los timestamps.
- Al cargar: parsear, validar y migrar según `schemaVersion`. Si el contenido es inválido, copiarlo a `timers.state.corrupt` antes de arrancar vacío; nunca pisarlo en silencio.
- Si `localStorage` falla (incógnito, cuota llena), mostrar un aviso persistente y sugerir exportar.
- Sincronizar entre pestañas con el evento `storage`.
- La interfaz del módulo (`load()`, `save(state)`) no debe filtrar detalles de `localStorage`, para que la v1 la reemplace por SQLite.

## Importación del prototipo

El prototipo (`legacy/timers.html`) guardaba en otra origin (`file://`), así que la app nueva **no puede leer** su `localStorage`. La migración se hace importando el JSON que exporta el prototipo:

```json
{ "exportedAt": "ISO", "timers": [{ "id", "name", "accumulatedMs", "startedAt": "number|null" }], "singleRunning": true }
```

Conversión:
- Se crea (o reusa) el grupo "General".
- Cada timer pasa a ser un `Timer` con un ajuste `deltaMs = accumulatedMs`, `at = exportedAt` y nota "Importado del prototipo".
- Si tenía `startedAt`, se le abre una sesión con ese inicio.
- Ese tiempo aparece en las estadísticas en el día de la exportación. Es aceptable.

## UI

- Español rioplatense, tono corto ("Iniciar", "Pausar", "Agregar timer").
- Accesible: botones con `aria-label` cuando son solo icono, navegable por teclado, foco visible.
- El tick visual va cada 1 s con un solo intervalo global, y se pausa con `document.hidden`. El título de la pestaña se actualiza igual.
- Las acciones destructivas usan un diálogo propio, no `confirm()`.
