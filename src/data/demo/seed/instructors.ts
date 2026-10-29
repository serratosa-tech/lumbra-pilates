import type { Instructor } from '../../types.ts'

export const INSTRUCTORS: Instructor[] = [
  {
    id: 'lucia-ferrer',
    name: 'Lucía Ferrer',
    role: 'Fundadora · Reformer',
    bio: 'Fisioterapeuta y formadora de pilates desde hace doce años. Abrió Lumbra para enseñar un método preciso y sin prisas.',
    specialties: ['Reformer', 'Readaptación'],
    initials: 'LF',
  },
  {
    id: 'marta-ibanez',
    name: 'Marta Ibáñez',
    role: 'Instructora · Mat',
    bio: 'Exbailarina especializada en suelo pélvico y pilates pre y posparto. Sus clases de esterilla son pura fluidez.',
    specialties: ['Mat', 'Suelo pélvico'],
    initials: 'MI',
  },
  {
    id: 'nerea-soler',
    name: 'Nerea Soler',
    role: 'Instructora · Movilidad',
    bio: 'Combina pilates, movilidad articular y respiración consciente. Ideal si vienes con la espalda cargada.',
    specialties: ['Movilidad', 'Respiración'],
    initials: 'NS',
  },
]
