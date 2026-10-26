# Prototipo (legacy)

`timers.html` es el prototipo original: un único archivo HTML que se abre con doble clic. Se conserva por dos motivos:

1. **Referencia de comportamiento** para el ticket T02 (paridad).
2. **Migración de datos**: el prototipo guarda en el `localStorage` de `file://`, que la app nueva no puede leer. Para pasar los tiempos, abrir el prototipo, tocar **Exportar** y luego importar ese JSON en la app nueva (T02).

No se compila ni se publica. Se puede borrar cuando la v0.1.0 esté en uso.
