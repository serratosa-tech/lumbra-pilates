import { describe, expect, it } from 'vitest'
import { generateBookingCode, isBookingCode, normalizeCode } from './codes.ts'

describe('códigos de reserva', () => {
  it('tienen la forma LUM-XXXX sin caracteres ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateBookingCode()
      expect(code).toMatch(/^LUM-[A-Z2-9]{4}$/)
      expect(code.slice(4)).not.toMatch(/[01OIL]/)
      expect(isBookingCode(code)).toBe(true)
    }
  })

  it('no repite un código ya usado', () => {
    // Un generador que devuelve primero un código ocupado y después uno libre.
    const values = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5]
    const random = () => values.shift() ?? 0.9
    expect(generateBookingCode(new Set(['LUM-AAAA']), random)).toBe('LUM-SSSS')
  })

  it('normaliza lo que escribe la persona', () => {
    expect(normalizeCode('lum-7k3q')).toBe('LUM-7K3Q')
    expect(normalizeCode(' LUM 7K3Q ')).toBe('LUM-7K3Q')
    expect(normalizeCode('lum7k3q')).toBe('LUM-7K3Q')
    expect(normalizeCode('7k3q')).toBe('LUM-7K3Q')
  })

  it('rechaza formatos que no son códigos', () => {
    expect(isBookingCode('LUM-7K3')).toBe(false)
    expect(isBookingCode('LUM-7K3O')).toBe(false)
    expect(isBookingCode('ABC-7K3Q')).toBe(false)
  })
})
