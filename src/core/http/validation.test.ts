import { describe, expect, it } from 'vitest'

import { validationExceptionFactory } from './validation.js'

describe('validationExceptionFactory', () => {
  it('builds a 400 with dotted paths for every issue', () => {
    const exception = validationExceptionFactory([
      { message: 'Invalid email', path: ['user', { key: 'email' }] },
      { message: 'Too short', path: ['items', 0, 'name'] },
      { message: 'Expected object' },
    ])

    expect(exception.getStatus()).toBe(400)
    expect(exception.getResponse()).toEqual({
      message: 'Validation failed',
      details: [
        { path: 'user.email', message: 'Invalid email' },
        { path: 'items.0.name', message: 'Too short' },
        { path: '', message: 'Expected object' },
      ],
    })
  })
})
