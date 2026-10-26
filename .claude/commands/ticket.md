---
description: Ejecuta un ticket de tickets/ de punta a punta y lo verifica
argument-hint: "<ID del ticket, ej. T01>"
---

Ejecutá el ticket `$ARGUMENTS`.

1. Leé `CLAUDE.md` y el archivo `tickets/$ARGUMENTS-*.md`. Si no existe, frená y sugerí correr `/create-tickets`.
2. Revisá en `tickets/README.md` que sus dependencias estén en "hecho". Si no, frená y avisame.
3. Si el ticket tiene "Preguntas abiertas" sin responder, hacémelas antes de escribir código.
4. Marcá el ticket como "en progreso" (en el archivo y en `tickets/README.md`).
5. Implementá **solo el alcance del ticket**, siguiendo el plan. Si el plan choca con el código real o con `docs/architecture.md`, frená, explicá el conflicto y proponé cómo seguir; no improvises un rediseño.
6. Escribí los tests que pide el ticket. Corré `npm run check` y `npm run build` hasta que pasen.
7. En tickets de UI: levantá `npm run dev`. Si tenés herramientas de browser, navegá los flujos del ticket en ancho de escritorio y de celular, en modo claro y oscuro, y sacá screenshots de cada estado relevante. Si no tenés, decime qué probar a mano.
8. Tildá los criterios de aceptación cumplidos, completá "Notas de implementación" (decisiones, desvíos y un mensaje de commit sugerido con Conventional Commits) y pasá el estado a "hecho".
9. Si aparece algo que se resuelve en otro ticket, anotalo ahí, no lo hagas ahora.
10. No commitees ni pushees salvo que te lo pida. Terminá con un resumen corto: qué cambió, cómo lo verificaste y cuál es el próximo ticket.
