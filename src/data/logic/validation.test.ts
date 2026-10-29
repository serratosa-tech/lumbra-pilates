import { describe, expect, it } from 'vitest'
import { normalizePhone, validateBookingForm, validateEmail, validateName, validatePhone } from './validation.ts'

describe('validación del formulario de reserva', () => {
  it('pide un nombre completo', () => {
    expect(validateName('')).toBe('Escribe tu nombre.')
    expect(validateName(' A ')).toBe('Escribe tu nombre completo.')
    expect(validateName('12')).toBe('Escribe tu nombre completo.')
    expect(validateName('Ana López')).toBeUndefined()
  })

  it('comprueba el formato del email', () => {
    expect(validateEmail('')).toBe('Escribe tu email.')
    expect(validateEmail('ana@')).toMatch(/Revisa el email/)
    expect(validateEmail('ana@correo')).toMatch(/Revisa el email/)
    expect(validateEmail(' ana.lopez@correo.example ')).toBeUndefined()
  })

  it.each([
    ['612345678', '+34 612 345 678'],
    ['+34 612 345 678', '+34 612 345 678'],
    ['0034-712-345-678', '+34 712 345 678'],
    ['(96) 312 34 56', '+34 963 123 456'],
    ['+34 823.456.789', '+34 823 456 789'],
  ])('acepta el teléfono español %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
    expect(validatePhone(input)).toBeUndefined()
  })

  it.each(['512345678', '61234567', '6123456789', '61234567a', '+33 612 345 678'])(
    'rechaza el teléfono %s',
    (input) => {
      expect(normalizePhone(input)).toBeNull()
      expect(validatePhone(input)).toMatch(/teléfono español/)
    },
  )

  it('exige aceptar la política de privacidad y devuelve solo los errores', () => {
    const values = { name: 'Ana López', email: 'ana@correo.example', phone: '612345678', privacy: false }
    expect(validateBookingForm(values)).toEqual({ privacy: expect.stringMatching(/política de privacidad/) })
    expect(validateBookingForm({ ...values, privacy: true })).toEqual({})
  })
})
