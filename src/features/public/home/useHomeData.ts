import { useCallback, useEffect, useState } from 'react'
import { getDataSource, type ClassType, type Instructor } from '../../../data/index.ts'
import { loadUpcoming, type UpcomingDay } from './upcoming.ts'

export interface HomeData {
  classTypes: ClassType[]
  instructors: Instructor[]
  /** Próximas clases agrupadas por día (hoy y, si hace falta, el siguiente día con clases). */
  upcoming: UpcomingDay[]
}

export type HomeState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: HomeData }

export function useHomeData() {
  const [state, setState] = useState<HomeState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const ds = getDataSource()
    Promise.all([ds.listClassTypes(), ds.listInstructors(), loadUpcoming(ds, new Date())])
      .then(([classTypes, instructors, upcoming]) => {
        if (active) setState({ status: 'ready', data: { classTypes, instructors, upcoming } })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
