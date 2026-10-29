import { useCallback, useEffect, useState } from 'react'
import { getDataSource, type ClassSession, type ClassType, type Instructor } from '../../../data/index.ts'
import { addDays, dayRange, studioDate, studioDateTime } from '../../../lib/dates.ts'

/** Días que se miran hacia delante si hoy ya no quedan clases. */
const LOOKAHEAD_DAYS = 7

export interface UpcomingDay {
  /** true si son las clases que quedan hoy; false si es el siguiente día con clases. */
  isToday: boolean
  sessions: ClassSession[]
}

export interface HomeData {
  classTypes: ClassType[]
  instructors: Instructor[]
  upcoming: UpcomingDay
}

export type HomeState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: HomeData }

async function loadUpcoming(now: Date): Promise<UpcomingDay> {
  const ds = getDataSource()
  const today = studioDate(now)
  const todaySessions = await ds.listSessions(now.toISOString(), dayRange(today).to)
  if (todaySessions.length > 0) return { isToday: true, sessions: todaySessions }

  const tomorrow = addDays(today, 1)
  const ahead = await ds.listSessions(
    studioDateTime(tomorrow).toISOString(),
    studioDateTime(addDays(tomorrow, LOOKAHEAD_DAYS)).toISOString(),
  )
  if (ahead.length === 0) return { isToday: false, sessions: [] }
  const { to } = dayRange(studioDate(new Date(ahead[0].startsAt)))
  return { isToday: false, sessions: ahead.filter((s) => s.startsAt < to) }
}

export function useHomeData() {
  const [state, setState] = useState<HomeState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const ds = getDataSource()
    Promise.all([ds.listClassTypes(), ds.listInstructors(), loadUpcoming(new Date())])
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
