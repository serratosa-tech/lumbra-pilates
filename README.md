# Lumbra Pilates

App de demostración de reservas para un estudio de pilates inventado en Valencia (proyecto de portafolio). Reserva sin cuenta con código, lista de espera automática, consulta y cancelación de reservas, cuentas de cliente y panel del estudio con clases, asistentes y métricas. Backend real en Supabase.

**Web:** https://lumbra-pilates.pages.dev *(pendiente de publicar)*

> Demo con datos inventados: se restablece automáticamente cada noche. No introduzcas datos reales.

## Rutas

| Ruta | Qué hay |
| --- | --- |
| `/` | Portada con las próximas clases y accesos «Probar como cliente» y «Probar como estudio» |
| `/clases` | Horario semanal: columnas en escritorio y selector de día en móvil, filtros por tipo, instructora y nivel, detalle y reserva (o lista de espera). Plazas actualizadas cada minuto |
| `/mis-reservas` | Sin sesión: consulta y cancelación con email y código. Con cuenta de cliente: sus reservas y cancelación (`noindex`) |
| `/privacidad` | Política de privacidad (con el apartado de cookies en `/privacidad#cookies`) |
| `/aviso-legal` | Aviso legal |
| `/sistema` | Sistema de diseño (`noindex`, fuera del sitemap) |
| `/estudio` | Acceso al panel (`noindex`) |
| `/estudio/resumen` | Métricas de la semana y ocupación por franja horaria |
| `/estudio/clases` | Crear, editar y cancelar clases |
| `/estudio/asistentes` | Reservas, lista de espera, asistencia y reservas manuales por clase |

Las rutas del panel solo se muestran a miembros del estudio: sin sesión llevan al acceso y con una cuenta de cliente muestran un aviso, sin pedir ningún dato del estudio.

**Indexación.** El sitemap solo tiene `/`, `/clases`, `/privacidad` y `/aviso-legal`. Las páginas `noindex` lo llevan dos veces: en `<meta name="robots">`, que la app pone al ejecutarse, y en la cabecera `X-Robots-Tag: noindex` de `public/_headers`, que Cloudflare Pages envía con la respuesta (el HTML inicial es el de la portada y dice «index»). `robots.txt` no bloquea nada: Google tiene que poder entrar para leer el `noindex`. `robots.txt` y `sitemap.xml` se generan en el build a partir de `SITE_URL` (ver «Cómo desplegarlo»).

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

### Lighthouse móvil

Lighthouse 12.2.1 con su perfil móvil por defecto (Moto G Power y red lenta simulada), contra el build servido con `vite preview`, en Edge headless. Mediana de 5 pasadas, medido el 4 de noviembre de 2026:

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | TBT | CLS | Transferido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 91 (91–97) | 100 | 100 | 100 | 1,5 s | 2,4–2,9 s | 24–210 ms | 0 | 166 KB |
| `/clases` | 97 (96–99) | 100 | 100 | 100 | 1,5 s | 1,8–2,3 s | 12–146 ms | 0 | 165 KB |
| `/mis-reservas` | 99 | 100 | 100 | 66 ¹ | 1,5 s | 1,8 s | 4–44 ms | 0 | 161 KB |

¹ A propósito: la página lleva `noindex` y Lighthouse lo cuenta como «no indexable».

- **La portada varía entre 91 y 97 con el mismo build**, sobre todo por la carga del equipo durante la medición: el TBT se mide con la CPU real y pasó de 24 a 210 ms sin cambiar nada (el de `/clases`, de 12 a 146 ms). Su LCP sale unas veces cerca de 2,2 s y otras cerca de 2,9 s. Que eso se deba a qué elemento acaba siendo el LCP (las clases de «Hoy en Lumbra» llegan después y cambian a lo largo del día) está sin confirmar. Queda para la fase 7 (ver «Pendiente»).
- **supabase-js no se descarga** en ninguna de las tres páginas (comprobado en las peticiones de cada pasada).
- **Preconnect a Supabase: probado y descartado.** Lighthouse lo sugiere (unos 90 ms), pero en una comparación A/B de 5 pasadas no mejoró la portada (91 frente a 91–92) y empeoró `/clases` (LCP 2,82 s frente a 2,25 s; rendimiento 93 frente a 97). Con la red lenta simulada, la conexión anticipada compite con la descarga del JavaScript y de la fuente.

### Tamaño del build

Build de producción (gzip):

| Fragmento | Antes de la fase 5 | Después | Cuándo se descarga |
| --- | --- | --- | --- |
| `index-*.js` | 125,44 kB | 125,02 kB (123,72 kB con el logotipo en Jost) | Siempre |
| `supabaseJs-*.js` (supabase-js) | — | 55,16 kB | Solo al reservar, iniciar sesión o entrar en el panel |
| `StudioApp-*.js` | 12,51 kB | 12,14 kB | Solo en `/estudio` |
| Páginas legales | (en `index`) | 0,9 + 1,2 + 2,4 kB | Solo en `/privacidad` y `/aviso-legal` |

### Tipografía

Una sola familia, **Jost** variable (`@fontsource-variable/jost` 5.3.0), solo el subconjunto latino y un único woff2 que cubre los dos pesos usados: 500 en titulares, cifras grandes, botones, etiquetas y títulos de tarjeta (la palabra destacada se distingue solo por el color terracota-600), y 400 en los párrafos, en `tinta-800` (#3a2d26, contraste mínimo de 9,5:1 sobre los fondos de la paleta). Lleva `font-display: swap`, se precarga desde `index.html` y tiene un respaldo sobre Arial con `size-adjust` por peso para que el cambio de fuente no mueva el diseño.

| Fuentes | Archivos | Peso |
| --- | --- | --- |
| Antes: Fraunces 500 normal y cursiva, Figtree 400 y 600 | 4 woff2 | 63 816 B (62,3 KiB) |
| Ahora: Jost variable 400–500 | 1 woff2 | 26 576 B (26,0 KiB), un 58 % menos |

Los titulares llevan muy poco espaciado negativo (−0,01em en el display, −0,005em en `text-3xl`, nada en `text-2xl`), y el display llega como máximo a 4,25rem para que «Muévete despacio.» quepa en una línea en escritorio con Jost 500. El esqueleto de la tarjeta «Próxima clase» reserva el mismo alto que la tarjeta con datos.

CLS de la portada medido en Edge: 0 a 390 px y a 320 px con el texto al 200 %, y 0,0001 a 1280 px.

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

El backend en Supabase (esquema, seguridad RLS, funciones de reserva, datos de ejemplo, cuentas demo y pruebas) está en [`supabase/`](supabase/README.md), con una guía paso a paso, la **guía de comprobación en Network** para la revisión humana (apartado 12), el resumen del **Security Advisor** (apartado 13) y los **resultados de la comprobación** de las pruebas SQL y de las 16 reglas desde el navegador (apartado 14).

## Cómo desplegarlo

La web es estática (Vite) y se publica en **Cloudflare Pages**. Los datos están en **Supabase**, y dos avisos externos evitan que el proyecto gratuito se pause.

### 1. Supabase

Sigue [`supabase/README.md`](supabase/README.md): ajustes del proyecto (apartado 3), migraciones `0001`–`0007` en el SQL Editor (apartado 4), `seed.sql`, cuentas demo (apartado 5), `cron.sql` (apartado 8) y `tests/seguridad_y_reglas.sql`. Copia la URL del proyecto y la clave **publishable** (Project Settings → API Keys). La clave secreta no se usa en ningún sitio.

### 2. Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, con este repositorio:

| Ajuste | Valor |
| --- | --- |
| Project name | `lumbra-pilates` (da la URL `https://lumbra-pilates.pages.dev`) |
| Production branch | `main` |
| Framework preset | El de Vite o React (Vite) si aparece; si no, `None`. Lo que cuenta son las dos filas siguientes |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variables de entorno (Production y Preview) | `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` |

Cada push a `main` publica la web, y cada rama tiene su vista previa. El build **falla a propósito** si falta `VITE_SUPABASE_URL` o si su origen no está en la CSP de `public/_headers`, para no publicar una web sin datos.

### 3. Rutas, cabeceras y dominio

- **`public/_redirects`** (`/* /index.html 200`): cualquier ruta devuelve la app, así que `/clases` o `/estudio/resumen` funcionan al recargar. Las rutas que no existen muestran la página 404 de la app, que lleva `noindex` (con estado HTTP 200, porque Cloudflare no permite reescribir con 404).
- **`public/_headers`**, en todas las rutas:

  | Cabecera | Valor y motivo |
  | --- | --- |
  | `Content-Security-Policy` | `default-src`, `script-src`, `style-src`, `img-src` y `font-src` solo `'self'`, **sin `unsafe-inline` ni `unsafe-eval`** (el `index.html` del build no tiene scripts en línea). `connect-src 'self'` más el proyecto de Supabase. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` (nadie puede meter la web en un iframe) y `upgrade-insecure-requests` |
  | `X-Content-Type-Options` | `nosniff`: el navegador no «adivina» el tipo de los archivos |
  | `Referrer-Policy` | `strict-origin-when-cross-origin`: Supabase solo ve el origen, no la ruta |
  | `Permissions-Policy` | Cámara, micrófono, ubicación, pagos, USB y Topics apagados |
  | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`: siempre https |
  | `Cross-Origin-Opener-Policy` | `same-origin`: la ventana queda aislada |

  `/assets/*` lleva `Cache-Control: public, max-age=31536000, immutable`, porque sus nombres llevan hash. El HTML no se guarda en caché. Los `noindex` de `/sistema`, `/mis-reservas` y `/estudio` siguen igual. Los tests `src/app/deploy.test.ts` e `indexing.test.ts` comprueban todas estas reglas.
- **Otro proyecto de Supabase:** cambia `VITE_SUPABASE_URL` en Cloudflare y el `connect-src` de `public/_headers`. El build avisa si no coinciden.
- **Otro dominio:** cambia solo `SITE_URL` en `src/lib/site.ts`. De ella salen el canonical y `og:url` (en `index.html`, con `%SITE_URL%`, y en cada página) y `robots.txt` y `sitemap.xml`, que genera un plugin de `vite.config.ts`. Un test comprueba que el dominio no aparece en ningún otro archivo.

### 4. Avisos para que Supabase no se pause

En el plan Free, Supabase pausa el proyecto tras una semana sin actividad. Dos servicios externos llaman a `health_check` (`POST /rest/v1/rpc/health_check` con la clave publishable) dos veces al día. Si la respuesta no es `{"ok": true}`, fallan:

| Aviso | Cuándo (UTC) | Archivo | Configuración |
| --- | --- | --- | --- |
| GitHub Actions | 07:17 y 19:17, y a mano | [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) | Secrets del repositorio `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. `permissions: {}` |
| Cloudflare Worker | 01:43 y 13:43 | [`keepalive-worker/`](keepalive-worker/README.md) | Paso a paso desde el panel, sin instalar nada |

> **GitHub desactiva los workflows programados de los repositorios públicos tras 60 días sin actividad en el repositorio.** Si pasan dos meses sin commits, el aviso de GitHub se para y solo queda el del Worker. Para reactivarlo: **Actions → keepalive → Enable workflow**.

## Calidad y verificación

Comprobado el 4 de noviembre de 2026 (fase 6), antes de publicar.

### Tests

265 tests con Vitest y Testing Library, todos en verde, sin herramientas añadidas a `package.json`:

| Módulo | Tests | Qué cubren |
| --- | --- | --- |
| Lógica de reservas, sesiones, validación y códigos (`src/data/logic`) | 61 | Reservar, lista de espera, duplicados, cancelar hasta 2 h antes, subida de la lista, crear y editar clases (aforo, solapes, pasado), cancelar clases, asistencia, validación de nombre, email y teléfono, códigos `LUM-XXXX`, horario y métricas |
| Capa Supabase (`src/data/supabase`) | 62 | Lo público va con `fetch`, solo con `apikey`, sin `Authorization` y sin descargar supabase-js; errores traducidos (red, límite de intentos, sesión caducada, servidor caído…); **sin sesión, o con la sesión caducada, ninguna de las 10 funciones de cuenta llega a llamarse**; sesión en la clave única; cierre de sesión `local` |
| RequireStudio y rutas del panel | 17 | Las 5 rutas del panel, sin sesión y con cliente, sin pedir datos del estudio; error al comprobar la sesión con «Reintentar»; acceso, contraseña incorrecta y cierre de sesión |
| Formulario de reserva | 9 | Validación en vivo, confirmación con código, lista de espera, menos de 2 h, cuenta demo, sin conexión sin perder lo escrito, clase que no carga o no existe |
| Mis reservas | 13 | Consulta, demasiados intentos, sin conexión, cancelar y subir la lista, salir de la lista de espera, error al cancelar, cuenta de cliente |
| Panel del estudio | 17 | Resumen (métricas, vacío, error), Clases (crear, cerrar con Esc, aforo por debajo de las reservas, error del servidor, cancelar clase), Asistentes (abrir clase, asistencia, reserva manual, subida de la lista, errores) y el formulario de clase |
| Demo en memoria y datos de ejemplo | 36 | Persistencia en la clave única, semilla coherente en distintas fechas |
| Componentes y utilidades | 35 | Diálogos con foco atrapado, menú de acciones con teclado, tarjetas de clase, pestañas de día, fechas en hora de Madrid, archivo `.ics`, refresco de datos y páginas legales |
| Publicación (`src/app/deploy.test.ts`, `indexing.test.ts`) | 10 | `_redirects`, CSP sin `unsafe-*` y con un solo proyecto de Supabase, cabeceras de seguridad, caché solo en `/assets/*`, límites de Cloudflare, sitemap, robots, `noindex` y el dominio escrito solo en `SITE_URL` |
| Aviso de Cloudflare (`keepalive-worker`) | 5 | Llamada a `health_check` solo con `apikey`, fallos si no responde ok, error HTTP o faltan variables, 404 desde fuera |

Las pruebas SQL del backend (`supabase/tests/seguridad_y_reglas.sql`) y las reglas comprobadas desde el navegador están en [`supabase/README.md`](supabase/README.md), apartado 14.

### Accesibilidad

- **axe-core 4.10** (WCAG 2.0, 2.1 y 2.2 A y AA, y buenas prácticas) en 21 pantallas a 390 y a 1280 px: portada, horario, detalle de clase, formulario con errores, confirmación, lista de espera, Mis reservas (vacío, resultado y con cuenta), privacidad, aviso legal, sistema de diseño, 404, acceso, aviso «sin acceso», las cuatro pantallas del panel y sus formularios. **0 incidencias.** Al empezar había dos, ya corregidas: la lista de horario del pie y del menú (cada grupo de la `<dl>` llevaba un icono fuera de `<dt>` y `<dd>`) y el contraste de los números de las tarjetas de clase.
- **Teclado:** el primer foco es «Saltar al contenido», que lleva a `#contenido`. Todas las paradas tienen el foco visible y ninguna está oculta. El orden sigue la lectura; solo «sube» al pasar a la siguiente columna (días del horario, columnas del pie y del panel). Escape cierra los seis diálogos (detalle, menú móvil, cancelar en Mis reservas y en el panel, añadir reserva, nueva clase) y devuelve el foco al botón que lo abrió.
- **Nombres accesibles:** ningún campo, botón de icono ni enlace sin nombre. Las pestañas de día empiezan por lo que se ve («Lun 2, 5 clases: lunes 2 de noviembre»), para el control por voz (WCAG 2.5.3).
- **`prefers-reduced-motion: reduce`:** ninguna animación ni transición dura más de 0 y el desplazamiento no es suave.
- **Consola:** sin errores ni avisos en todo el recorrido.

### Estados de cada pantalla

Los 37 casos comprobados con Playwright (carga, vacío, error y sin conexión en la portada, el horario, el detalle, Mis reservas con código y con cuenta, y las cuatro pantallas del panel) muestran su estado diseñado. Sin conexión, lo que ya se veía se mantiene, lo nuevo avisa con «Reintentar» y el formulario de reserva conserva lo escrito. Al volver la conexión, «Reintentar» carga los datos.

| | | |
| --- | --- | --- |
| ![Horario cargando](docs/capturas/horario-carga.png) Cargando | ![Horario de una semana sin publicar](docs/capturas/horario-vacio.png) Vacío | ![Portada sin poder cargar el horario](docs/capturas/portada-error.png) Error |
| ![Reserva sin conexión, con los datos escritos](docs/capturas/reserva-sin-conexion.png) Sin conexión | ![Plaza reservada con su código](docs/capturas/reserva-exito.png) Éxito | ![Página 404](docs/capturas/404.png) 404 |
| ![Mis reservas sin resultado](docs/capturas/mis-reservas-consulta-vacio.png) Reserva no encontrada | ![Tus reservas sin poder cargar](docs/capturas/mis-reservas-cuenta-error.png) Servicio no disponible | |

![Resumen del panel en una semana sin clases](docs/capturas/panel-resumen-vacio.png)
*Panel: semana sin clases.*

![Asistentes de una clase sin poder cargar](docs/capturas/panel-asistentes-de-una-clase-error.png)
*Panel: error al cargar los asistentes, con el camino de vuelta.*

### Fugas invisibles

- **npm audit:** 0 vulnerabilidades, tanto con todas las dependencias como solo con las de producción.
- **gitleaks 8.30.1** (binario oficial de la release de GitHub, con el SHA256 comprobado contra `gitleaks_8.30.1_checksums.txt`) sobre todo el historial de `main`, la única rama: **0 hallazgos** en 29 commits en la fase 6 y otra vez en los 39 de la fase 7, antes de hacer público el repositorio. `.env.local` no aparece en ningún commit y está en `.gitignore`.
- **Qué no se sube:** `.env.local`, `CLAUDE.md`, `.claude/`, `dist/` y `node_modules/` están en `.gitignore`. No hay archivos de prueba ni de soporte en la raíz, y las herramientas de verificación (Playwright, gitleaks) viven fuera del proyecto. Los commits llevan el email `noreply` de GitHub.
- **Clave secreta en la web:** en los JS del build, `sb_secret_` solo aparece dentro de supabase-js, como prefijo que la librería comprueba; `service_role` y `eyJ` no aparecen.

### Cabeceras y rutas (antes de publicar)

Con Edge headless a 1280 px, sirviendo `dist/` con las reglas de `_headers` y `_redirects` aplicadas (una simulación de Cloudflare Pages) y con las peticiones reales a Supabase: **24 de 24 comprobaciones correctas**. Portada, `/clases` al entrar directamente y al recargar, detalle de clase (supabase-js se descarga y conecta), Mis reservas con `LUM-7K3Q`, descarga del `.ics` (enlace `blob:`), acceso al panel con la cuenta demo del estudio y recarga en `/estudio/resumen`, y una ruta inexistente (404 de la app con `noindex`). **Ninguna violación de la CSP** y la consola sin errores ni avisos. Prueba de control: con Supabase fuera de `connect-src`, la portada marca enseguida la violación y el horario no carga.

### Pendiente para la fase 7 (con la web publicada)

- Comprobar las cabeceras reales con `curl -I` en `/`, `/clases`, `/estudio/resumen` y un archivo de `/assets/`, y revisar que el registro del despliegue no rechaza la regla de `_redirects`. Si la rechazara, se borra el archivo: sin `404.html`, Pages ya sirve la app en cualquier ruta.
- Medir con **PageSpeed Insights**. Si la portada baja de 90 o su LCP pasa de 2,5 s, investigar qué elemento es el LCP y cuándo se pinta.
- Lanzar a mano el workflow `keepalive` y el Worker, y confirmar que responden `ok`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:5176 |
| `npm run build` | Compilación de producción |
| `npm run preview` | Sirve la compilación en el puerto 5176 (con el servidor de desarrollo abierto: `npx vite preview --port 4176 --strictPort`) |
| `npm run lint` | Lint con oxlint |
| `npm run typecheck` | Comprobación de tipos |
| `npm run test` | Tests con Vitest |
