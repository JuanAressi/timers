# Producto

## Problema

Quiero medir cuánto tiempo le dedico a cada proyecto y actividad del día. Las alternativas que probé no permiten varios cronómetros con nombre, o cada pestaña del navegador consume unos 300 MB. La app tiene que ser liviana y **nunca perder el tiempo medido**, aunque recargue, cierre la pestaña o apague la compu.

## Versiones

- **v0 (actual)**: webapp estática publicada en GitHub Pages. Los datos viven en el navegador (`localStorage`).
- **v1**: app de escritorio para Ubuntu con Tauri (icono en el dock y en la barra superior, SQLite). Reusa el front de la v0 cambiando solo la capa de storage.

## Conceptos

- **Grupo**: agrupa timers. Por ejemplo, *Programación* (Proyecto 1, Proyecto 2, Investigación) o *Tareas de la casa* (Acomodar ropa, Limpiar, Ocio). Cada grupo tiene nombre, icono y color, y muestra la suma de sus timers.
- **Timer**: una actividad medible dentro de un grupo, con nombre, icono y color.
- **Sesión**: un tramo medido entre play y pausa. Una sesión abierta sigue contando aunque la app esté cerrada.
- **Ajuste**: tiempo sumado o restado a mano ("+15 min" porque me olvidé de darle play). Se guarda como un registro aparte; nunca modifica las sesiones.

## Funcionalidad de la v0

1. Crear, renombrar, archivar y borrar grupos y timers.
2. Play/pausa por timer. Por defecto, solo uno corriendo a la vez (configurable).
3. Ver por timer el tiempo total y el de hoy; por grupo, la suma; arriba, el total del día.
4. Ajustar tiempo: sumar o restar X minutos con atajos (+5, +15, +30) o un valor libre, y ver o deshacer los registros de un timer.
5. Icono y color por grupo y por timer, y reordenar con drag & drop (dentro de un grupo y entre grupos).
6. Estadísticas: una línea por día coloreada por timer, y gráficos de torta por grupo y por timer, con rango hoy/semana/mes.
7. Exportar e importar un respaldo JSON, incluido el del prototipo (`legacy/timers.html`).
8. El título de la pestaña muestra el timer que está corriendo y su tiempo.

## Fuera de alcance (decidido)

- Detección de inactividad.
- Valor hora o facturación.
- Cuentas, sync en la nube o backend.
- "Reiniciar a cero": con historial, reiniciar destruiría datos. Se reemplaza por los ajustes, archivar y borrar.
