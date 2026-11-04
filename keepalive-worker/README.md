# Aviso a Supabase desde Cloudflare

Worker con un Cron Trigger que llama a `health_check` dos veces al día (01:43 y 13:43 UTC) para que el proyecto de Supabase (plan Free) no se pause tras una semana sin actividad. Hace lo mismo que el workflow `.github/workflows/keepalive.yml`, pero no depende de GitHub, que desactiva los workflows programados de los repositorios públicos tras 60 días sin actividad.

- **Código:** [`worker.js`](worker.js), JavaScript sin dependencias, para pegarlo tal cual en el editor del panel. Tiene sus tests en `worker.test.js` (`npm run test`), con `fetch` simulado.
- **Qué envía:** `POST <SUPABASE_URL>/rest/v1/rpc/health_check` con la cabecera `apikey` (clave **publishable**) y el cuerpo `{}`, igual que la app. Si la respuesta no es `{"ok": true, …}`, lanza un error, que queda en los registros del Worker.
- **Desde fuera no hace nada:** cualquier visita a su URL recibe un 404.
- **Coste:** cabe en el plan gratuito de Workers (5 Cron Triggers por cuenta).

## Crearlo desde el panel de Cloudflare, sin instalar nada

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** (Crear) → pestaña **Workers** → **Start with Hello World!** (Empezar con Hola, mundo).
2. **Worker name** (nombre): `lumbra-keepalive`. Pulsa **Deploy** (Desplegar).
3. Pulsa **Edit code** (Editar código). Borra todo el contenido de `worker.js` en el editor, pega el de [`worker.js`](worker.js) de esta carpeta y pulsa **Deploy**.
4. Vuelve al Worker → **Settings** (Ajustes) → **Variables and Secrets** (Variables y secretos) → **Add** (Añadir):
   - **Type** `Text` · **Variable name** `SUPABASE_URL` · **Value**: la URL del proyecto (`https://<proyecto>.supabase.co`, Supabase → Project Settings → API Keys / Data API).
   - **Type** `Secret` · **Variable name** `SUPABASE_PUBLISHABLE_KEY` · **Value**: la clave **publishable** (`sb_publishable_…`). **Nunca** la secreta (`sb_secret_…`) ni `service_role`.
   - Pulsa **Deploy** para guardarlas.
5. **Settings** → **Trigger Events** o **Triggers** (Eventos de activación) → **Add** → **Cron Triggers** → expresión `43 1,13 * * *` → **Add**. La hora es UTC: en Madrid, las 02:43 y 14:43 en invierno y las 03:43 y 15:43 en verano. El cambio puede tardar hasta 15 minutos en aplicarse.
6. **Settings** → **Domains & Routes** (Dominios y rutas) → en `workers.dev`, **Disable** (Desactivar). No hace falta ninguna URL pública. Si se queda activa, solo responde 404.

## Comprobar que funciona

- **Sin esperar al cron:** en **Edit code**, si el editor muestra el panel de pruebas con la pestaña **Schedule** (Programado), pulsa **Trigger scheduled event** (Lanzar evento programado). En la consola debe salir `health_check ok (<fecha>)`. Las variables del paso 4 tienen que estar ya guardadas.
- **Después de la primera ejecución programada:** Worker → **Logs** u **Observability** (Registros). Cada ejecución aparece con el resultado `Ok` o `Exception` y el mensaje. La lista de ejecuciones del cron también está en **Settings** → **Triggers** → **Cron Triggers** (eventos pasados).
- Si sale `Faltan las variables…`, revisa los nombres del paso 4. Si sale `health_check ha respondido 401`, la clave no es la publishable del proyecto. Si sale `503` o un error de conexión, el proyecto de Supabase puede estar pausado: reactívalo en el panel de Supabase.

## Si se cambia algo

- **Otra clave o la URL:** cambia la variable en el paso 4. No hace falta tocar el código.
- **Otro horario:** edita el Cron Trigger. Este Worker no usa Wrangler, así que el horario solo vive en el panel.
- **Código nuevo:** repite el paso 3 con el `worker.js` actualizado.
