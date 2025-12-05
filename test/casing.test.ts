import { expect, test } from 'vitest'

import * as mod from '../src/index.js'

// normalizeTag

test('normalizeTag turns HTML tags to lowercase', () => {
  const normalizeTag = mod.normalizeTag()
  expect(normalizeTag('DIV')).toBe('div')
  expect(normalizeTag('Span')).toBe('span')
})

test('normalizeTag turns non-HTML tags to PascalCase by default', () => {
  const normalizeTag = mod.normalizeTag()
  expect(normalizeTag('my-component')).toBe('MyComponent')
  expect(normalizeTag('another_example')).toBe('AnotherExample')
})

test('normalizeTag can use different casing for non-HTML tags', () => {
  const normalizeTag = mod.normalizeTag('kebab')
  expect(normalizeTag('myComponent')).toBe('my-component')
  expect(normalizeTag('AnotherExample')).toBe('another-example')
})

// normalizeAttribute

test('normalizeAttribute applies camelCase by default', () => {
  const normalizeAttribute = mod.normalizeAttribute()
  expect(normalizeAttribute('div', 'data-value')).toBe('dataValue')
  expect(normalizeAttribute('span', 'aria-label')).toBe('ariaLabel')
})

test('normalizeAttribute applies casing to attribute names', () => {
  const normalizeAttribute = mod.normalizeAttribute('snake')
  expect(normalizeAttribute('div', 'dataValue')).toBe('data_value')
  expect(normalizeAttribute('span', 'AriaLabel')).toBe('aria_label')
})

test('normalizeAttribute can convert class to className', () => {
  const normalizeAttribute = mod.normalizeAttribute('camel', { className: true })
  expect(normalizeAttribute('div', 'class')).toBe('className')
})

// 'none': Casing

test("'none' casing leaves names unchanged", () => {
  const normalizeTag = mod.normalizeTag('none')
  expect(normalizeTag('myComponent')).toBe('myComponent')
  expect(normalizeTag('AnotherExample')).toBe('AnotherExample')

  const normalizeAttribute = mod.normalizeAttribute('none')
  expect(normalizeAttribute('div', 'dataValue')).toBe('dataValue')
  expect(normalizeAttribute('span', 'data-value')).toBe('data-value')
})
