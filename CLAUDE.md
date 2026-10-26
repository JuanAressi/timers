# Timers

Webapp para medir el tiempo dedicado a cada proyecto con varios cronómetros agrupados. Hoy es la **v0**: una webapp (Vite + React + TypeScript) que guarda todo en el navegador. La **v1** la empaqueta como app de escritorio para Ubuntu con Tauri, así que nada de la v0 puede depender de un servidor.

## Leer antes de trabajar

- `docs/product.md`: qué hace la app y qué decidimos dejar afuera.
- `docs/architecture.md`: modelo de datos, invariantes, estructura de carpetas y reglas técnicas. **Es la fuente de verdad del modelo.**
- `docs/roadmap.md`: los tickets de la v0 en orden.
- `tickets/`: los tickets detallados (carpeta ignorada por git, existe solo en local). Si no existe, se genera con `/create-tickets`.

## Convenciones

- **Todo el código en inglés**: nombres de archivos, tipos, funciones, variables, claves de JSON y comentarios. La UI va en español (rioplatense).
- TypeScript estricto, sin `any`. Validar todo dato externo (localStorage, archivos importados) antes de usarlo.
- La lógica de dominio vive en `src/domain/` como funciones puras: no importan React ni tocan storage, y reciben `now: number` como parámetro en lugar de llamar a `Date.now()`. Cada función de dominio lleva tests al lado (`*.test.ts`).
- Los componentes no calculan tiempos: llaman a funciones de dominio o a selectores del store.
- Estilos con Tailwind v4 (`src/index.css`). Soportar modo claro y oscuro, y ancho de celular (≥ 360 px).
- Cambios chicos y enfocados en el alcance del ticket. Si el ticket choca con la realidad del código, frenar y avisar antes de improvisar.

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run check      # typecheck + lint + tests (correr antes de dar un ticket por terminado)
npm run build      # build de producción
npm run test:watch # tests en modo watch
```

**Excepción autorizada**: en este repo se pueden correr `npm run check` y `npm run build` sin pedir permiso cada vez, aunque incluyan typecheck (`tsc -b`). Son parte del flujo de cada ticket.

## Flujo de tickets

- `/create-tickets`: genera los tickets en `tickets/` a partir de `docs/roadmap.md`.
- `/ticket T01`: ejecuta un ticket, lo verifica y actualiza su estado.
- Commits con Conventional Commits (`feat: …`, `fix: …`, `chore: …`). No commitear ni pushear salvo que el usuario lo pida.
