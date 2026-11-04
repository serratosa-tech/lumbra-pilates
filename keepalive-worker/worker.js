// Worker de Cloudflare: aviso a Supabase para que el proyecto (plan Free) no se pause.
// Lo lanza su Cron Trigger (43 1,13 * * *, en UTC) y llama a health_check con la clave publishable.
// Variables del Worker: SUPABASE_URL (texto) y SUPABASE_PUBLISHABLE_KEY (secreto).
// Instrucciones en keepalive-worker/README.md.

async function healthCheck(env) {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, '')
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY.')

  const response = await fetch(`${url}/rest/v1/rpc/health_check`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`health_check ha respondido ${response.status}: ${text.slice(0, 200)}`)

  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`health_check no ha devuelto JSON: ${text.slice(0, 200)}`)
  }
  if (body?.ok !== true) throw new Error(`health_check no ha respondido ok: ${text.slice(0, 200)}`)
  return body
}

export default {
  // Sin acceso desde fuera: el aviso solo lo lanza el Cron Trigger.
  fetch() {
    return new Response('Not found', { status: 404 })
  },

  // Si falla, el error queda como «exception» en los registros del Worker.
  async scheduled(_controller, env) {
    const body = await healthCheck(env)
    console.log(`health_check ok (${body.checked_at})`)
  },
}
