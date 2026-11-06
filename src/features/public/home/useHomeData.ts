import type { ClassType, Instructor } from '../../../data/index.ts'
import { LIVE_REFRESH_MS, useAsyncData, type AsyncState } from '../../../lib/useAsyncData.ts'
import { loadUpcoming, type UpcomingDay } from './upcoming.ts'

/** Próximas clases agrupadas por día (hoy y, si hace falta, el siguiente día con clases). */
export type UpcomingState = AsyncState<UpcomingDay[]>

/** Tipos de clase y equipo: cambian poco y no los necesita el primer pantallazo. */
export interface Catalog {
  classTypes: ClassType[]
  instructors: Instructor[]
}
export type CatalogState = AsyncState<Catalog>

/**
 * Datos de la portada en dos cargas independientes: las próximas clases (tarjeta del héroe y «Hoy en
 * Lumbra», con refresco cada minuto) no esperan a los tipos de clase ni al equipo.
 */
export function useHomeData() {
  const upcoming = useAsyncData('portada:proximas', (ds) => loadUpcoming(ds, new Date()), { refreshMs: LIVE_REFRESH_MS })
  const catalog = useAsyncData('portada:catalogo', async (ds) => {
    const [classTypes, instructors] = await Promise.all([ds.listClassTypes(), ds.listInstructors()])
    return { classTypes, instructors }
  })
  return { upcoming, catalog }
}
