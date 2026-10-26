# Roadmap v0

Cada ítem se convierte en un ticket en `tickets/` (ver `/create-tickets`). Un ticket se puede partir en sub-tickets (T04a, T04b) si no entra en una sesión de trabajo. El orden importa: cada ticket asume los anteriores terminados.

## T01: Dominio y persistencia
Tipos del modelo (`docs/architecture.md`), funciones puras para start/pause (respetando `singleRunning`), totales por timer, grupo y día (con el corte de medianoche), y el clamp de ajustes negativos. Módulo `storage` con `load`/`save`, validación, migración por `schemaVersion` y resguardo de datos corruptos. Parser del respaldo del prototipo. Sin UI. Tests de todo.
**Listo cuando**: `npm run check` pasa y los casos borde (sesión abierta, medianoche, ajuste negativo, JSON inválido) tienen test.

## T02: UI base con paridad con el prototipo
Store de Zustand y lista de timers (por ahora en el grupo "General") con: agregar, renombrar inline, play/pausa, borrar con diálogo, total y "hoy" por timer, total del día, título de la pestaña, toggle "solo uno a la vez", aviso si falla el storage, sync entre pestañas. Botón "Importar respaldo del prototipo".
**Listo cuando**: puedo importar mi JSON del prototipo y usar la app como hoy uso `legacy/timers.html`.

## T03: Deploy en GitHub Pages
Workflow de GitHub Actions que corre `npm run check` y `npm run build` en cada PR y en `main`, y publica en GitHub Pages desde `main`. Configurar `base` de Vite para la ruta del repo.
**Listo cuando**: la app está publicada en `https://<usuario>.github.io/<repo>/` y un PR con tests rotos falla el check.

## T04: Grupos
Crear, renombrar, borrar (regla de grupo vacío) y archivar grupos. Mover un timer de grupo, total por grupo y colapsar o expandir (estado recordado).
**Listo cuando**: puedo armar "Programación" y "Tareas de la casa" con sus timers y ver la suma de cada grupo.

## T05: Ajustes de tiempo
En cada timer, acción "Ajustar" con +5, +15, +30, −5 y un valor libre en minutos (positivo o negativo), con nota opcional. Panel con las entries del timer (sesiones y ajustes, de la más reciente a la más vieja) que permite borrar un ajuste o una sesión cerrada.
**Listo cuando**: sumar 15 min se refleja en el total y en el "hoy", y deshacerlo lo revierte.

## T06: Iconos, colores y reordenar
Selector de icono (lucide, con buscador) y de color (paleta curada, legible en claro y oscuro) para grupos y timers. Drag & drop con @dnd-kit para reordenar grupos, timers dentro de un grupo y mover timers entre grupos. Accesible por teclado.
**Listo cuando**: el orden y los iconos persisten al recargar.

## T07: Estadísticas
Vista "Estadísticas" con selector de rango (hoy, semana, mes). Línea del día: una barra horizontal de 24 h por día con los tramos coloreados por timer y tooltip. Tortas: distribución por grupo y por timer dentro del rango. Totales por rango.
**Listo cuando**: con datos de una semana real, la línea y las tortas coinciden con los totales de la lista.

## T08: Respaldo, archivo y release v0.1.0
Exportar e importar el `PersistedState` completo, con validación y confirmación antes de reemplazar. Vista de archivados con opción de restaurar. README para el portfolio (qué es, GIF, stack, cómo correrlo y roadmap a la v1 con Tauri). Tag `v0.1.0`.
**Listo cuando**: exportar → borrar datos del sitio → importar deja todo igual.
