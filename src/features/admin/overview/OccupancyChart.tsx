import type { SlotOccupancy } from '../../../data/index.ts'
import { plural } from '../../../components/schedule/labels.ts'

const percent = (value: number) => `${Math.round(value * 100)} %`
const hour = (h: number) => String(h).padStart(2, '0')
/** «07–09 h»: dos cifras y guion medio, para que las etiquetas queden alineadas. */
const slotLabel = (slot: SlotOccupancy) => `${hour(slot.fromHour)}–${hour(slot.toHour)} h`

/**
 * Ocupación por franja horaria: barras horizontales de un solo tono (magnitud), con el valor
 * escrito en cada barra y una tabla equivalente para lectores de pantalla.
 */
export function OccupancyChart({ slots }: { slots: SlotOccupancy[] }) {
  return (
    <figure>
      <ul aria-hidden="true" className="flex flex-col gap-3">
        {slots.map((slot) => (
          <li
            key={slot.fromHour}
            // En móvil, franja y valor encima de la barra (si no caben juntos con el texto muy grande, el valor
            // baja de línea sin partir la franja); desde 640 px, los tres en una fila.
            className="group grid gap-y-1.5 sm:grid-cols-[5rem_minmax(0,1fr)_3.5rem] sm:items-center sm:gap-x-3"
            title={`${slotLabel(slot)}: ${percent(slot.occupancy)} de ocupación en ${plural(slot.sessions, 'clase')}`}
          >
            <span className="flex flex-wrap items-baseline gap-x-3 sm:contents">
              <span className="whitespace-nowrap text-sm text-tinta-700 tabular-nums sm:col-start-1 sm:row-start-1">
                {slotLabel(slot)}
              </span>
              <span className="ml-auto whitespace-nowrap text-right text-sm font-medium tabular-nums sm:col-start-3 sm:row-start-1">
                {percent(slot.occupancy)}
              </span>
            </span>
            <span className="relative block h-7 rounded-sm bg-arena-100 sm:col-start-2 sm:row-start-1">
              {/* La barra parte del eje (izquierda) y redondea solo su extremo de dato. */}
              <span
                className="absolute inset-y-0 left-0 rounded-r-sm bg-terracota-500 transition-[width,background-color] duration-(--duration-slow) ease-(--ease-out-soft) group-hover:bg-terracota-600"
                style={{ width: `${Math.max(1, Math.round(slot.occupancy * 100))}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 text-sm text-piedra">
        Plazas reservadas sobre el aforo de las clases de cada franja (sin contar las canceladas).
      </figcaption>
      {/* Una tabla no se encoge a 1 px: el recorte va en un contenedor. */}
      <div className="sr-only">
        <table>
          <caption>Ocupación por franja horaria</caption>
          <thead>
            <tr>
              <th scope="col">Franja</th>
              <th scope="col">Ocupación</th>
              <th scope="col">Clases</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.fromHour}>
                <th scope="row">{slotLabel(slot)}</th>
                <td>{percent(slot.occupancy)}</td>
                <td>{slot.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
