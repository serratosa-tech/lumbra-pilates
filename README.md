# Lumbra Pilates

App de demostración de reservas para un estudio de pilates inventado en Valencia (proyecto de portafolio). Reserva sin cuenta con código, lista de espera automática, consulta y cancelación de reservas, cuentas de cliente y panel del estudio con clases, asistentes y métricas. Backend real en Supabase.

> Demo con datos inventados: se restablece automáticamente cada noche. No introduzcas datos reales.

## Rutas

| Ruta | Qué hay |
| --- | --- |
| `/` | Portada con las próximas clases y accesos «Probar como cliente» y «Probar como estudio» |
| `/clases` | Horario semanal: columnas en escritorio y selector de día en móvil, filtros por tipo, instructora y nivel, detalle y reserva (o lista de espera). Plazas actualizadas cada minuto |
| `/mis-reservas` | Sin sesión: consulta y cancelación con email y código. Con cuenta de cliente: sus reservas y cancelación (`noindex`) |
| `/privacidad` | Política de privacidad (con el apartado de cookies en `/privacidad#cookies`) |
| `/aviso-legal` | Aviso legal |
| `/sistema` | Sistema de diseño |
| `/estudio` | Acceso al panel (`noindex`) |
| `/estudio/resumen` | Métricas de la semana y ocupación por franja horaria |
| `/estudio/clases` | Crear, editar y cancelar clases |
| `/estudio/asistentes` | Reservas, lista de espera, asistencia y reservas manuales por clase |

Las rutas del panel solo se muestran a miembros del estudio: sin sesión llevan al acceso y con una cuenta de cliente muestran un aviso, sin pedir ningún dato del estudio.

## Probar la demo

Las credenciales son públicas a propósito (contraseña `demo1234`):

- **Cliente:** `cliente@lumbra.example`. Ve sus reservas de ejemplo y reserva con sus datos de ejemplo, que van bloqueados en el formulario.
- **Estudio:** `estudio@lumbra.example`. Entra en el panel. Los emails y teléfonos que escriben los visitantes le aparecen enmascarados.
- **Mis reservas sin cuenta:** `ana.lopez@correo.example` + `LUM-7K3Q` (plaza confirmada) y `pablo.ruiz@correo.example` + `LUM-W8HT` (lista de espera). También se abren con un clic desde la propia página.

La interfaz no ofrece cambiar el email ni la contraseña, ni borrar la cuenta. Las reservas de la cuenta de cliente demo vuelven a las de ejemplo cada hora, y toda la demo se restablece cada noche (`supabase/README.md`, apartado 8).

## Arquitectura de datos

La app solo accede a los datos a través de `src/data` (interfaz `DataSource`).

- **Supabase** (`src/data/supabase/`): solo funciones RPC de `supabase/migrations`, más la lectura del catálogo y de la fila propia de `studio_members` que permite la RLS. Los errores de Postgres se traducen a los códigos de `src/data/errors.ts`.
- **Sin supabase-js en la carga pública.** El horario, la portada y Mis reservas con código usan `fetch` directo a `/rest/v1/rpc/…` con la cabecera `apikey` (clave publishable). supabase-js se descarga de forma diferida (`import()`) al reservar, iniciar sesión o entrar en el panel, y se precarga al abrir el detalle de una clase.
- **Sesión:** supabase-js la guarda en localStorage bajo la única clave de la app, `lumbra-pilates:v1`. Al arrancar se borra de esa clave cualquier resto de la demo antigua que no sea una sesión. Cerrar sesión usa `scope: 'local'`, para no echar a los demás visitantes de la cuenta demo.
- **Tests:** la demo en memoria (`src/data/demo/`) sustituye a Supabase en los tests de interfaz (`src/test/setup.ts`). La capa Supabase tiene sus propios tests, con `fetch` simulado.

### Variables de entorno

Copia `.env.example` a `.env.local` (ignorado por git) y rellena los valores de Supabase → Project Settings → API Keys:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Solo la clave **publishable**. La secreta (`sb_secret_…`, antes `service_role`) no la necesita ninguna parte del proyecto. Tras crear o cambiar `.env.local` hay que reiniciar `npm run dev`.

## Rendimiento

Build de producción (gzip):

| Fragmento | Antes de la fase 5 | Después | Cuándo se descarga |
| --- | --- | --- | --- |
| `index-*.js` | 125,44 kB | 124,96 kB | Siempre |
| `supabaseJs-*.js` (supabase-js) | — | 55,16 kB | Solo al reservar, iniciar sesión o entrar en el panel |
| `StudioApp-*.js` | 12,51 kB | 12,12 kB | Solo en `/estudio` |
| Páginas legales | (en `index`) | 0,9 + 1,2 + 2,4 kB | Solo en `/privacidad` y `/aviso-legal` |

## Reglas de negocio

Las aplica la base de datos (`supabase/migrations`) con funciones de Postgres que comprueban las plazas de forma atómica. Replican las funciones puras con tests de `src/data/logic/`:

- Una reserva por email y clase; si la clase está llena, la reserva entra en lista de espera.
- Cancelación online hasta 2 horas antes; al liberar una plaza sube la primera persona de la lista.
- El estudio no puede bajar el aforo por debajo de las plazas reservadas; si lo sube, entra gente de la lista.
- Al cancelar una clase, sus reservas pasan a «cancelada por el estudio».
- Una sola sala: dos clases no pueden solaparse.
- La asistencia se marca desde 30 minutos antes de la clase.
- Mis reservas con código admite 5 intentos fallidos en 15 minutos por email.

## Backend y seguridad

El backend en Supabase (esquema, seguridad RLS, funciones de reserva, datos de ejemplo, cuentas demo y pruebas) está en [`supabase/`](supabase/README.md), con una guía paso a paso, la **guía de comprobación en Network** para la revisión humana (apartado 12) y el resumen del **Security Advisor** (apartado 13).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:5176 |
| `npm run build` | Compilación de producción |
| `npm run preview` | Sirve la compilación en el puerto 5176 |
| `npm run lint` | Lint con oxlint |
| `npm run typecheck` | Comprobación de tipos |
| `npm run test` | Tests con Vitest |
