import type { ClassType } from '../../types.ts'

export const CLASS_TYPES: ClassType[] = [
  {
    id: 'reformer-esencial',
    name: 'Reformer Esencial',
    summary:
      'Tu primera toma de contacto con la máquina: alineación, respiración y control del centro, a un ritmo pausado.',
    level: 'iniciacion',
    intensity: 2,
    durationMinutes: 50,
  },
  {
    id: 'mat-flow',
    name: 'Mat Flow',
    summary:
      'Pilates en esterilla con secuencias fluidas que encadenan fuerza y movilidad. Adaptamos cada ejercicio a tu nivel.',
    level: 'todos',
    intensity: 2,
    durationMinutes: 55,
  },
  {
    id: 'reformer-intenso',
    name: 'Reformer Intenso',
    summary:
      'Más carga, más tempo y transiciones exigentes para quien ya domina la técnica y busca un reto.',
    level: 'avanzado',
    intensity: 3,
    durationMinutes: 50,
  },
  {
    id: 'respira-y-estira',
    name: 'Respira y Estira',
    summary:
      'Movilidad suave, estiramientos y trabajo respiratorio para soltar tensiones y terminar el día en calma.',
    level: 'iniciacion',
    intensity: 1,
    durationMinutes: 45,
  },
]
