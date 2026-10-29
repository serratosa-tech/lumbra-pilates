import { CalendarDays, LockKeyhole, Ticket, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/clases', label: 'Clases', icon: CalendarDays },
  { to: '/mis-reservas', label: 'Mis reservas', icon: Ticket },
  { to: '/estudio', label: 'Acceso estudio', icon: LockKeyhole },
]
