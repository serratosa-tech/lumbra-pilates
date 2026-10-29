import type { SlotOccupancy } from '../../../data/index.ts'
import { plural } from '../../../components/schedule/labels.ts'

const percent = (value: number) => `${Math.round(value * 100)} %`
const slotLabel = (slot: SlotOccupancy) => `${slot.fromHour}–${slot.toHour} h`

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
            // En móvil, franja y valor encima de la barra; desde 640 px, los tres en una fila.
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[5rem_minmax(0,1fr)_3.5rem]"
            title={`${slotLabel(slot)}: ${percent(slot.occupancy)} de ocupación en ${plural(slot.sessions, 'clase')}`}
          >
            <span className="text-sm text-tinta-700 tabular-nums">{slotLabel(slot)}</span>
            <span className="relative col-span-2 row-start-2 block h-7 rounded-sm bg-arena-100 sm:col-span-1 sm:col-start-2 sm:row-start-1">
              {/* La barra parte del eje (izquierda) y redondea solo su extremo de dato. */}
              <span
                className="absolute inset-y-0 left-0 rounded-r-sm bg-terracota-500 transition-[width,background-color] duration-(--duration-slow) ease-(--ease-out-soft) group-hover:bg-terracota-600"
                style={{ width: `${Math.max(1, Math.round(slot.occupancy * 100))}%` }}
              />
            </span>
            <span className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums sm:col-start-3">
              {percent(slot.occupancy)}
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
