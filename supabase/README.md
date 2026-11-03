# Backend de Lumbra Pilates en Supabase

Esta carpeta contiene todo el backend de la app: la base de datos, la seguridad, la lógica de reservas y la demo que se mantiene sola. Es SQL que se pega en el editor SQL de Supabase. La app todavía no lo usa: la conexión llega en la fase 5.

```
supabase/
├── migrations/                         ← obligatorio, en este orden
│   ├── 0001_esquema.sql                  tablas, restricciones e índices
│   ├── 0002_seguridad.sql                RLS, políticas y permisos
│   ├── 0003_funciones_internas.sql       piezas internas (no se pueden llamar desde la app)
│   ├── 0004_funciones_publicas.sql       horario, reservar, Mis reservas, health_check
│   ├── 0005_funciones_cliente_estudio.sql  cuentas de cliente y panel del estudio
│   ├── 0006_cuentas_demo.sql             blindaje y restauración de las cuentas demo
│   └── 0007_ajustes_supabase.sql         cierra la función de «Enable automatic RLS» y repite RLS en demo_accounts
├── seed.sql                            ← opcional: datos de ejemplo de la demo
├── cron.sql                            ← opcional: restauración automática (requiere seed.sql)
└── tests/seguridad_y_reglas.sql        ← comprobaciones (no deja rastro)
```

---

## 1. Lo básico de Supabase en dos minutos

- **Postgres**: la base de datos. Cada tabla es como una hoja de cálculo con reglas estrictas (tipos, valores permitidos, relaciones).
- **Auth**: el sistema de cuentas de Supabase. Guarda los usuarios en una tabla especial, `auth.users`.
- **Roles**: Postgres decide qué puede hacer cada petición según su rol. La app usa dos:
  - `anon`: un visitante sin sesión.
  - `authenticated`: alguien que ha iniciado sesión (una clienta o el estudio). Tener cuenta **no** basta para gestionar: además hay que estar en la tabla `studio_members`.
- **GRANT** (permisos): indica si un rol puede tocar una tabla o llamar a una función. Si no tiene permiso, recibe «permission denied».
- **RLS** (Row Level Security, seguridad por filas): de lo que un rol puede tocar, decide qué filas ve. Si una tabla tiene RLS y ninguna política, nadie ve ninguna fila. Aquí se usan las dos barreras a la vez.
- **RPC** (funciones remotas): funciones de Postgres que la app llama por internet, como `supabase.rpc('book_class', {...})`. Las reglas de negocio viven aquí, dentro de la base de datos, para que nadie pueda saltárselas desde el navegador.
- **security definer**: la función se ejecuta con los permisos de su dueño, no con los de quien la llama. Por eso un visitante puede reservar sin tener acceso a la tabla de reservas. A cambio, cada función valida todo lo que recibe y devuelve solo lo justo. Todas llevan `search_path` vacío y nombres con su esquema completo (`public.bookings`), para que nadie pueda colar otra tabla con el mismo nombre.
- **Esquema `private`**: Supabase solo expone por la API el esquema `public`. Lo que vive en `private` (piezas internas, cuentas demo, datos de ejemplo) no se puede leer ni llamar desde la app.

## 2. Claves: cuál va dónde

En Supabase → **Project Settings → API Keys** hay dos tipos:

| Clave | Dónde | Por qué |
| --- | --- | --- |
| **Publishable** (`sb_publishable_…`) | En la app, en `.env.local` (ignorado por git) | Es pública por diseño: solo permite lo que dejan los permisos y RLS de este SQL. |
| **Secret** (`sb_secret_…`, antes `service_role`) | **Nunca sale de Supabase.** Ni en la app, ni en el repositorio, ni en GitHub Actions ni en Cloudflare. | Se salta toda la seguridad. Ninguna parte de este proyecto la necesita. |

El `.env.local` de la fase 5 tendrá esta forma (sin valores reales en el repositorio):

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## 3. Ajustes del proyecto antes de empezar

1. **Data API → «Automatically expose new tables»: desactivado.** Las tablas nuevas no dan permiso a nadie. La app solo ve lo que este SQL concede con `GRANT` explícitos (tabla del apartado 7). Aun así, cada migración retira todos los permisos antes de conceder, así que el resultado es el mismo aunque el ajuste cambie.
2. **«Enable automatic RLS»: activado.** Las migraciones activan RLS de forma explícita en todas las tablas, así que no dependen de este ajuste. Al activarlo, Supabase crea la función `public.rls_auto_enable()` y un *event trigger* (un aviso que Postgres ejecuta solo cada vez que se crea una tabla). Como la función vive en `public`, los visitantes tenían permiso para ejecutarla. La migración `0007` les retira ese permiso. El *event trigger* sigue funcionando igual, porque lo ejecuta Postgres por su cuenta: las tablas nuevas siguen recibiendo RLS.
3. **Authentication → Sign In / Providers → «Allow new users to sign up»: desactivado.** Nadie puede crearse una cuenta desde fuera. Las cuentas (las de la demo y la del estudio real) se crean a mano desde el panel (apartado 5).

## 4. Paso a paso en el editor SQL

En Supabase → **SQL Editor**:

1. Pulsa **+ New query**.
2. Abre `migrations/0001_esquema.sql` en VS Code, copia **todo** el contenido, pégalo en el editor y pulsa **Run** (o Ctrl + Enter). Debe aparecer «Success. No rows returned».
3. Repite con `0002`, `0003`, `0004`, `0005`, `0006` y `0007`, **en orden**. Cada migración usa lo que crean las anteriores. Ejecuta cada una una sola vez; la `0007` se puede repetir sin problema.
   - Al pegar `0001`, el editor avisa de que `private.demo_accounts` no tiene RLS y ofrece **«Run and enable RLS»**. Puedes elegir cualquiera de las dos opciones: `0002` activa RLS en esa tabla y `0007` lo repite, así que el resultado final es el mismo.
   - Si `0007` se para con «No se ha podido retirar EXECUTE sobre public.rls_auto_enable() (su dueño es …)», es que esa función pertenece a otro usuario interno de Supabase y el editor no puede cambiar sus permisos. No hay riesgo real: una función de *event trigger* no se puede llamar desde la API, solo la ejecuta Postgres al crear tablas. Pero las pruebas 11.2 y 11.5 lo marcarán, así que avisa para ajustarlas.
4. *(Opcional, para la demo)* Ejecuta `seed.sql`. Crea el catálogo, unas 110 clases (de la semana pasada a dentro de dos semanas) y unas 600 reservas de ejemplo. Puedes volver a ejecutarlo cuando quieras: siempre empieza de cero.
5. Crea y vincula las cuentas demo (apartado 5).
6. *(Opcional)* Activa la restauración automática con `cron.sql` (apartado 8).
7. Ejecuta `tests/seguridad_y_reglas.sql`. El resultado debe ser una fila con **TODAS LAS COMPROBACIONES SUPERADAS**. Si algo falla, se para con «FALLO <número>: …» y el número coincide con el apartado de las pruebas. Todo ocurre dentro de una transacción que se deshace al final: no deja usuarios, clases ni reservas de prueba.

Qué hace cada migración:

| Archivo | Qué crea |
| --- | --- |
| `0001_esquema.sql` | Tablas `class_types`, `instructors`, `sessions` (clases programadas), `bookings` (reservas), `studio_members`, `lookup_attempts` (intentos fallidos) y `private.demo_accounts`. Claves, relaciones, restricciones `CHECK` (aforo 1–30, duración 15–120, formatos de email, teléfono y código…), índices y `updated_at` automático. |
| `0002_seguridad.sql` | RLS en todas las tablas, las políticas y los permisos exactos de `anon` y `authenticated`. |
| `0003_funciones_internas.sql` | Normalización y validación (igual que `src/data/logic/validation.ts`), códigos `LUM-XXXX`, reservar, cancelar, subir la lista de espera, enmascarado y límite de intentos. Ninguna se puede llamar desde la app. |
| `0004_funciones_publicas.sql` | Lo único que puede usar un visitante: horario, reservar, Mis reservas, cancelar y `health_check`. |
| `0005_funciones_cliente_estudio.sql` | Mis reservas con cuenta y todas las funciones del panel. |
| `0006_cuentas_demo.sql` | Trigger que blinda las cuentas demo, vinculación y restauración. |
| `0007_ajustes_supabase.sql` | Retira a `anon` y `authenticated` el permiso de ejecutar `public.rls_auto_enable()`, solo si existe (en proyectos sin «Enable automatic RLS» no hace nada). Además, vuelve a activar RLS en `private.demo_accounts` de forma explícita. |

## 5. Cuentas: crear a mano y vincular

Hay dos cuentas demo, con contraseña pública a propósito: la app la mostrará en la pantalla de acceso.

| Cuenta | Para qué |
| --- | --- |
| `cliente@lumbra.example` | Cliente demo: ve sus reservas de ejemplo (una confirmada, una en lista de espera, una pasada con asistencia y una cancelada) y puede reservar y cancelar. |
| `estudio@lumbra.example` | Estudio demo: entra en el panel con todos los permisos de gestión, pero ve enmascarados los datos que escriban los visitantes. |

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Escribe el email y la contraseña pública de la demo, y marca **Auto Confirm User** para que no haga falta confirmar por correo.
3. Repite con la segunda cuenta.
4. En el editor SQL, vincúlalas:

```sql
select private.register_demo_account('cliente@lumbra.example', 'client', 'Ana Demo', '+34 600 000 900');
select private.register_demo_account('estudio@lumbra.example', 'studio', 'Lucía Ferrer', null);
```

Esto guarda una copia del email y de la contraseña cifrada (para restaurarlas), hace a la cuenta de estudio miembro con `is_demo = true` y crea las reservas de ejemplo del cliente. El nombre y el teléfono que pasas son los **datos de ejemplo**: el cliente demo siempre reserva con ellos, aunque escriba otros en el formulario.

5. **Comprueba que el inicio de sesión sigue funcionando con el trigger de blindaje.** Hasta la fase 5 la app no habla con Supabase, así que de momento lo cubre la prueba 13.5, que hace lo mismo que un inicio de sesión: actualizar `last_sign_in_at`. En la fase 5, lo primero será entrar con las dos cuentas demo desde la app. Si alguna diera «Database error», mira el apartado 9.

**Cuenta del estudio real** (si algún día la hay): créala igual en Authentication → Users y hazla miembro sin marca demo:

```sql
insert into public.studio_members (user_id, display_name, is_demo)
select id, 'Nombre de la persona', false from auth.users where email = 'email-real@dominio.es';
```

Para quitar a alguien del estudio: `delete from public.studio_members where user_id = (select id from auth.users where email = '…');`

## 6. Qué hace cada función

**Públicas** (visitantes y cuentas con sesión):

| Función | Qué hace |
| --- | --- |
| `list_sessions(p_from, p_to)` | Clases que empiezan en ese rango (100 días como mucho) con plazas ocupadas y en lista de espera, **solo como números**. Es la «vista» pública de plazas libres. Es una función y no una vista porque una vista con RLS no podría contar reservas que el visitante no puede leer. |
| `get_session(p_id)` | Lo mismo para una clase. |
| `book_class(p_session_id, p_name, p_email, p_phone)` | Reserva. Bloquea la fila de la clase (`SELECT … FOR UPDATE`): si dos personas van a por la última plaza a la vez, la segunda espera a la primera y ya la ve ocupada. Evita duplicados por email, pone en lista de espera si está llena y genera un código `LUM-XXXX` único. Devuelve `canCancelOnline: false` cuando faltan menos de 2 horas (el aviso de «no podrás cancelar online»). Con sesión iniciada, la reserva queda ligada a la cuenta y usa su email; con el cliente demo, también su nombre y su teléfono de ejemplo. |
| `find_booking(p_email, p_code)` | Mis reservas sin cuenta: solo esa reserva, o `null`. |
| `cancel_booking(p_email, p_code)` | Cancela (plaza confirmada hasta 2 h antes; lista de espera hasta que empiece) y sube la lista. Devuelve `promoted: true/false` sin datos de la persona que sube, o `{ "error": "not_found" }`. |
| `health_check()` | Consulta real y barata que solo devuelve `{ ok, checked_at }`. Sirve para que el proyecto no se pause (apartado 8). |

**Protección contra abuso**: `find_booking` y `cancel_booking` permiten como mucho 5 intentos fallidos en 15 minutos por email y 20 por IP (si Supabase la recibe en las cabeceras). Después responden `too_many_attempts`, aunque el código sea correcto. Se guarda el hash del email y de la IP, nunca el dato en claro, y se borran al día siguiente. En un fallo no se lanza un error porque el error desharía también el registro del intento: por eso responden `null` o `{ "error": "not_found" }`.

**Cliente con cuenta** (solo con sesión):

| Función | Qué hace |
| --- | --- |
| `list_my_bookings()` | Sus reservas, con la clase y la posición en la lista de espera. |
| `cancel_my_booking(p_booking_id)` | Cancela una reserva **suya** con las mismas reglas. Si no es suya, responde `not_found`, igual que si no existiera. |

**Estudio** (solo miembros; si no, `unauthorized`):

| Función | Regla |
| --- | --- |
| `create_session(...)` | Tipo e instructora existentes, aforo 1–30, duración 15–120, en el futuro y sin solaparse con otra clase (una sola sala). |
| `update_session(p_id, ...)` | Incluye **cambiar el aforo**: nunca por debajo de las plazas confirmadas (`capacity_below_booked`). Si sube, entra gente de la lista. Devuelve la clase y quién ha subido. |
| `cancel_session(p_id)` | Solo clases futuras. Sus reservas activas pasan a «cancelada por el estudio». |
| `add_manual_booking(...)` | Como reservar, pero se puede añadir a alguien hasta que la clase termina. |
| `cancel_booking_by_id(p_booking_id)` | Sin límite de horas mientras la clase no haya terminado. |
| `set_attendance(p_booking_id, 'attended' \| 'no_show' \| null)` | Solo plazas confirmadas, desde 30 minutos antes. |
| `get_roster(p_session_id)` | Confirmadas, lista de espera y canceladas de una clase. |
| `list_studio_bookings(p_from, p_to)` | Reservas de un rango, para calcular las métricas en la app con la función que ya existe (`computeMetrics`). |

**Códigos de error** (los mismos de `src/data/errors.ts`; el mensaje del error es el código):

| Código | Cuándo |
| --- | --- |
| `session_not_found` | La clase no existe. |
| `not_found` | No hay ninguna reserva con esos datos. |
| `invalid_input` | Algún dato no es válido. |
| `duplicate` | Ya hay una reserva activa con ese email en esa clase. |
| `past` | La clase ya ha empezado (o terminado, en el panel). |
| `class_cancelled` | La clase la ha cancelado el estudio. |
| `already_cancelled` | La reserva ya estaba cancelada. |
| `too_late` | Faltan menos de 2 horas para la clase y la plaza es confirmada. |
| `capacity_below_booked` | Aforo menor que las plazas confirmadas. |
| `overlap` | Ya hay otra clase en la sala a esa hora. |
| `not_confirmed` | Asistencia de una reserva que no es plaza confirmada. |
| `attendance_too_early` | Asistencia antes de 30 minutos de la clase. |
| `unauthorized` | Sin sesión, o sin ser miembro del estudio. |
| `too_many_attempts` | Demasiados intentos fallidos. **Nuevo**: hay que añadirlo a `DataErrorCode` en la fase 5. |

## 7. Quién puede hacer qué

| Tabla | Visitante (`anon`) | Con sesión, no miembro | Miembro del estudio |
| --- | --- | --- | --- |
| `class_types`, `instructors` | leer | leer | leer, crear, editar, borrar |
| `sessions` | leer (no tiene datos personales) | leer | leer; cambios solo con las funciones |
| `bookings` | nada | solo **sus** reservas | solo con las funciones (que enmascaran si es la cuenta demo) |
| `studio_members` | nada | su propia fila (ninguna) | su propia fila |
| `lookup_attempts`, `private.*` | nada | nada | nada |

Las clases y las reservas se cambian **solo** con funciones, también desde el panel, para que nadie se salte el aforo, los solapes ni la lista de espera. El estudio tampoco lee la tabla de reservas directamente. Si pudiera, la cuenta demo (cuya contraseña es pública) vería los emails y teléfonos que escriben los visitantes sin enmascarar.

**Enmascarado de la cuenta demo del estudio.** Afecta a toda reserva que haya escrito una persona (no a las de ejemplo) cuyo email no termine en `.example` o que se haya hecho con una cuenta demo. El email y el teléfono salen así: `maria@gmail.com` → `m***@gmail.com`, `+34 612 345 678` → `+34 6** *** *78`. Ocurre dentro de la base de datos, en todas las funciones del panel que devuelven reservas. Un miembro normal lo ve todo.

## 8. La demo que se mantiene sola

| Quién | Cuándo | Qué hace | Fase |
| --- | --- | --- | --- |
| **pg_cron** (`lumbra-demo`) | Cada hora en punto | `private.demo_hourly()`: a las 03:00 de Madrid, `reset_demo()`; el resto de horas, `restore_demo()` | 4 (`cron.sql`) |
| **GitHub Actions** | 07:17 y 19:17 UTC | `POST /rest/v1/rpc/health_check` con la clave publishable | 7 |
| **Cloudflare Cron Trigger** | 01:43 y 13:43 UTC | La misma llamada desde un Worker | 7 |

- **`restore_demo()`** (cada hora): repone el catálogo de ejemplo, las credenciales de las cuentas demo, su fila de miembro, las reservas de ejemplo del cliente demo (borra las que se hayan hecho con esa cuenta y crea otra vez las cuatro de ejemplo) y las reservas `LUM-7K3Q` y `LUM-W8HT` si un visitante las ha cancelado.
- **`reset_demo()`** (cada noche): borra reservas, clases e intentos, vuelve a sembrar con fechas relativas a hoy y restaura. No toca usuarios ni miembros.
- **Por qué decide la hora dentro de la función:** pg_cron trabaja en hora UTC. Si se programara «a las 03:00», en invierno se ejecutaría a las 04:00 de Madrid y en verano a las 05:00. Al ejecutarse cada hora y preguntar la hora de Madrid, siempre es a las 03:00.
- **Activar el cron:** en Supabase → **Integrations → Cron** (o Database → Extensions → `pg_cron`), activa la extensión y después ejecuta `cron.sql`. Para ver las últimas ejecuciones: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;`
- **Restablecer a mano** en cualquier momento: `select private.reset_demo();`

**Por qué hay dos avisos externos.** En el plan gratuito, Supabase pausa el proyecto tras una semana sin actividad, y la actividad interna de pg_cron puede no contar. Por eso dos servicios de fuera llaman a `health_check` dos veces al día. Son dos y no uno porque **GitHub desactiva los workflows programados de los repositorios públicos tras 60 días sin actividad en el repositorio**. Si el proyecto pasa dos meses sin commits, el aviso de GitHub se para en silencio y el de Cloudflare sigue funcionando.

## 9. Blindaje de las cuentas demo

El trigger `lumbra_guard_demo_users` (`BEFORE UPDATE OR DELETE` en `auth.users`) actúa solo sobre las cuentas de `private.demo_accounts`:

- **Bloquea**: borrarlas y cambiar su email, su contraseña o su teléfono. También bloquea solicitar un cambio de email, antes de que se envíe ningún correo.
- **Deja pasar** todo lo demás, como `last_sign_in_at` y los metadatos de sesión. Por eso iniciar sesión sigue funcionando.
- **Excepción**: la restauración, que activa la marca `lumbra.restoring` solo dentro de su propia transacción. Desde la API nadie puede activarla.

Supabase permite triggers sobre `auth.users`: es el patrón que documentan para crear perfiles. Lo que no permite desde 2025 es crear funciones *dentro* del esquema `auth`, por eso la función vive en `private`. Si en el futuro Supabase lo impidiera, o un inicio de sesión de cuenta demo diera «Database error»:

1. Quita el trigger: `drop trigger lumbra_guard_demo_users on auth.users;`
2. La restauración de cada hora sigue devolviendo email y contraseña a su copia guardada, así que el daño dura como mucho una hora.

**Borrar de verdad una cuenta demo**: primero `delete from private.demo_accounts where email = '…';`, y después bórrala en Authentication → Users.

## 10. Decisiones de diseño

- **Mismas reglas que la app.** Cada función replica una de `src/data/logic`: `placeBooking`, `cancelByClient`, `cancelBookingById`, `promoteWaitlist`, `createSession`, `updateSession`, `cancelSession` y `setAttendance`, en el mismo orden de comprobaciones y con los mismos códigos de error.
- **La posición en la lista de espera se calcula, no se guarda.** Es el puesto por orden de llegada (`created_at`) entre las reservas que esperan. Así nunca hay que renumerar a nadie cuando alguien cancela.
- **`created_at` usa `clock_timestamp()`**: la hora real de cada reserva, que fija el orden de llegada exacto. `now()` sería la hora de inicio de la transacción.
- **«Asistió» y «no vino» van en `attendance`**, no en `status`, como en la app: una plaza confirmada sigue confirmada y además se anota si la persona vino.
- **Fechas en `timestamptz`** (un instante absoluto). La hora local de Madrid solo se usa donde importa (seed y cron) con `at time zone 'Europe/Madrid'`, que tiene en cuenta el cambio de hora.
- **Doble seguro contra duplicados y sobreaforo.** El bloqueo de la fila de la clase hace las reservas de una en una, y un índice único parcial impide dos reservas activas con el mismo email en la misma clase.
- **Las respuestas usan los nombres de campo de `src/data/types.ts`** (`startsAt`, `bookedCount`, `waitlistPosition`…) y las fechas van en el mismo formato que `toISOString()`, para que la fase 5 las use tal cual.

## 11. Notas para la fase 5

- **Rendimiento (objetivo: PageSpeed móvil 90 o más):** el horario público se pedirá con `fetch` directo a `POST /rest/v1/rpc/list_sessions`, con la cabecera `apikey: <publishable>`, **sin cargar supabase-js**. supabase-js se cargará de forma diferida (`import()`) solo al iniciar sesión o reservar.
- **Cuentas demo en la interfaz:** la cuenta demo no debe poder cambiar su email ni su contraseña. El trigger ya lo impide, pero además hay que ocultar esas opciones en la interfaz. Con la cuenta de cliente demo, el formulario de reserva muestra el nombre, el email y el teléfono de ejemplo rellenados y bloqueados.
- **Errores:** añadir `too_many_attempts` a `DataErrorCode`, con un mensaje como «Demasiados intentos. Espera unos minutos y vuelve a probar».
- **`cancel_booking`** responde `{ "error": "not_found" }` en lugar de lanzar un error (apartado 6).
- **Métricas:** `list_studio_bookings` más las clases de `list_sessions` alimentan `computeMetrics` sin duplicar la lógica en SQL.
