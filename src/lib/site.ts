/** Titular real de la web (portafolio): responsable de los datos y contacto de las páginas legales. */
export const OWNER = { name: 'Helena Serratosa', email: 'serratosah@gmail.com' }

/** Fecha de los textos legales (actualízala al cambiarlos). */
export const LEGAL_UPDATED = '3 de noviembre de 2026'

/**
 * URL publicada, sin barra final. Es el único sitio donde se escribe: de aquí salen el canonical y
 * las etiquetas Open Graph (en index.html, con %SITE_URL%, y en cada página), robots.txt y
 * sitemap.xml (vite.config.ts). Para cambiar de dominio basta con cambiarla aquí.
 */
export const SITE_URL = 'https://lumbra-pilates.pages.dev'

/** Datos del sitio y del estudio (inventados para la demo). */
export const SITE_NAME = 'Lumbra Pilates'
export const SLOGAN = 'Calma que sostiene, fuerza que ilumina.'

export const STUDIO = {
  street: 'Plaza del Umbral 7, bajo',
  postalCode: '46003',
  city: 'Valencia',
  email: 'hola@lumbra.example',
  hours: [
    { days: 'Lunes a viernes', time: '7:30 – 21:30' },
    { days: 'Sábados', time: '9:00 – 14:00' },
  ],
}
