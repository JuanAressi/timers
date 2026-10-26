---
description: Genera los tickets detallados de la v0 en tickets/ a partir de docs/roadmap.md
argument-hint: "[opcional: IDs a (re)generar, ej. T04 T05]"
---

Tu tarea es **planificar, no implementar**. No modifiques nada fuera de `tickets/`.

1. Leé `CLAUDE.md`, `docs/product.md`, `docs/architecture.md`, `docs/roadmap.md` y `docs/ticket-template.md`.
2. Recorré el código actual (`src/`, `package.json`, `vite.config.ts`, `legacy/timers.html`) para que los planes partan de lo que existe de verdad y no de lo que supongas.
3. Creá `tickets/` si no existe. Por cada ítem del roadmap (o solo los IDs de `$ARGUMENTS`, si se pasaron), escribí `tickets/TNN-slug-en-ingles.md` siguiendo **exactamente** la plantilla:
   - El plan de implementación nombra archivos concretos, funciones o componentes con sus nombres en inglés, y el orden de los pasos.
   - Los tests listan casos concretos, incluidos los bordes que menciona `docs/architecture.md`.
   - La verificación incluye comandos y, en tickets de UI, pasos visuales concretos.
   - Si un ticket es "L", partilo en sub-tickets (`T04a`, `T04b`), cada uno entregable por sí solo.
   - Si algo del roadmap es ambiguo, no lo inventes: dejalo en "Preguntas abiertas".
   - Respetá las decisiones de `docs/product.md`, incluido lo que está fuera de alcance.
4. Creá o actualizá `tickets/README.md` con una tabla de tickets: ID, título, estado, dependencias y estimación.
5. Confirmá que `tickets/` está en `.gitignore`.
6. Al terminar, resumime en pocas líneas: los tickets creados, los que partiste y todas las preguntas abiertas juntas, para que las responda antes de ejecutar.
