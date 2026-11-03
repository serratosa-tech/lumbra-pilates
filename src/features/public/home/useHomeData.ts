import type { ClassType, Instructor } from '../../../data/index.ts'
import { LIVE_REFRESH_MS, useAsyncData, type AsyncState } from '../../../lib/useAsyncData.ts'
import { loadUpcoming, type UpcomingDay } from './upcoming.ts'

export interface HomeData {
  classTypes: ClassType[]
  instructors: Instructor[]
  /** Próximas clases agrupadas por día (hoy y, si hace falta, el siguiente día con clases). */
  upcoming: UpcomingDay[]
}

export type HomeState = AsyncState<HomeData>

export function useHomeData() {
  return useAsyncData('portada', async (ds) => {
    const [classTypes, instructors, upcoming] = await Promise.all([
      ds.listClassTypes(),
      ds.listInstructors(),
      loadUpcoming(ds, new Date()),
    ])
    return { classTypes, instructors, upcoming }
  }, { refreshMs: LIVE_REFRESH_MS })
}
