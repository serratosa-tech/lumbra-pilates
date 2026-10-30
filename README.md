# Lumbra Pilates

App de demostración de reservas para un estudio de pilates inventado en Valencia (proyecto de portafolio). Reserva sin cuenta con código, lista de espera automática, consulta y cancelación de reservas, y panel del estudio con clases, asistentes y métricas.

> Demo: los datos se guardan solo en el navegador (localStorage, clave `lumbra-pilates:v1`). El botón «Restablecer demo» de la banda superior vuelve a los datos de ejemplo.

## Rutas

| Ruta | Qué hay |
| --- | --- |
| `/` | Portada con las próximas clases |
| `/clases` | Horario semanal: columnas en escritorio y selector de día en móvil, filtros por tipo, instructora y nivel, detalle y reserva (o lista de espera) |
| `/mis-reservas` | Consulta y cancelación con email y código (`noindex`) |
| `/privacidad` | Política de privacidad de la demo |
| `/sistema` | Sistema de diseño |
| `/estudio` | Acceso al panel (`noindex`) |
| `/estudio/resumen` | Métricas de la semana y ocupación por franja horaria |
| `/estudio/clases` | Crear, editar y cancelar clases |
| `/estudio/asistentes` | Reservas, lista de espera, asistencia y reservas manuales por clase |

## Probar la demo

- **Panel del estudio:** `estudio@lumbra.example` / `demo1234` (o el botón «Entrar con la cuenta demo»).
- **Mis reservas:** `ana.lopez@correo.example` + `LUM-7K3Q` (plaza confirmada) y `pablo.ruiz@correo.example` + `LUM-W8HT` (lista de espera, puesto 2). También se pueden abrir con un clic desde la propia página.

Los datos de ejemplo cubren la semana pasada, la actual y las dos siguientes, siempre relativas a la fecha de hoy: clases llenas con lista de espera, casi llenas y con plazas, una clase cancelada por el estudio, asistencia marcada en las pasadas y reservas que subieron desde la lista de espera.

## Reglas de negocio

Viven en funciones puras con tests en `src/data/logic/`, para reutilizarlas con Supabase:

- Una reserva por email y clase; si la clase está llena, la reserva entra en lista de espera.
- Cancelación online hasta 2 horas antes; al liberar una plaza sube la primera persona de la lista.
- El estudio no puede bajar el aforo por debajo de las plazas reservadas; si lo sube, entra gente de la lista.
- Al cancelar una clase, sus reservas pasan a «cancelada por el estudio».
- Una sola sala: dos clases no pueden solaparse.
- La asistencia se marca desde 30 minutos antes de la clase.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:5176 |
| `npm run build` | Compilación de producción |
| `npm run preview` | Sirve la compilación en el puerto 5176 |
| `npm run lint` | Lint con oxlint |
| `npm run typecheck` | Comprobación de tipos |
| `npm run test` | Tests con Vitest |
