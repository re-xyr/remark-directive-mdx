import { expect, test } from 'vitest'

import { unified } from 'unified'
import remarkDirective from 'remark-directive'
import remarkDirectiveMdx, { astroHandleLabel } from '../src/index.js'
import { u } from 'unist-builder'
import { Root } from 'mdast'
import { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import { block, inline } from './builder.js'

test('transforms directives to MDX JSX', async () => {
  const processor = unified().use(remarkDirective).use(remarkDirectiveMdx, {
    skipTransformed: false,
  })

  const tree: Root = u('root', [
    u('paragraph', [
      u('text', 'Before '),
      // Text directive
      u('textDirective', { name: 'my-component', attributes: { foo: 'bar' } }, []),
      u('text', ' After'),
    ]),
    // Leaf directive
    u('leafDirective', { name: 'fancy-button', attributes: { disabled: '' } }, []),
    // Container directive
    u('containerDirective', { name: 'fancy-box' }, [
      u('paragraph', { data: { directiveLabel: true } }, [u('text', 'Label')]),
      u('paragraph', [u('text', 'Content inside fancy box.')]),
      // Test we can handle nested directives
      u('leafDirective', { name: 'inner-directive' }, []),
    ]),
  ])

  const transformed = await processor.run(tree)

  const expected: Root = u('root', [
    u('paragraph', [
      u('text', 'Before '),
      inline('my-component', { foo: 'bar' }),
      u('text', ' After'),
    ]),
    block('fancy-button', { disabled: '' }),
    block('fancy-box', {}, [
      u('paragraph', [u('text', 'Content inside fancy box.')]),
      block('inner-directive', {}, []),
    ]),
  ])

  expect(transformed).toEqual(expected)
})

test('astroHandleLabel adds label as last child wrapped by <Fragment slot="label">', async () => {
  const processor = unified().use(remarkDirective).use(remarkDirectiveMdx, {
    handleLabel: astroHandleLabel,
    skipTransformed: false,
  })

  const tree: Root = u('root', [
    u('containerDirective', { name: 'fancy-box' }, [
      u('paragraph', { data: { directiveLabel: true } }, [u('text', 'Label')]),
      u('paragraph', [u('text', 'Content inside fancy box.')]),
    ]),
  ])

  const transformed = await processor.run(tree)

  const expected: Root = u('root', [
    block('fancy-box', {}, [
      u('paragraph', [u('text', 'Content inside fancy box.')]),
      block('Fragment', { slot: 'label' }, [
        u('text', 'Label'),
      ] as unknown[] as MdxJsxFlowElement['children']),
    ]),
  ])

  expect(transformed).toEqual(expected)
})

test('skipTransformed option skips already transformed nodes', async () => {
  const processor = unified().use(remarkDirective).use(remarkDirectiveMdx)

  const tree: Root = u('root', [
    u('leafDirective', { name: 'fancy-button', attributes: { disabled: '' } }, []),
    u('leafDirective', { name: 'already-transformed', data: { hName: 'SomeComponent' } }, []),
  ])

  const transformed = await processor.run(tree)

  const expected: Root = u('root', [
    block('fancy-button', { disabled: '' }),
    u('leafDirective', { name: 'already-transformed', data: { hName: 'SomeComponent' } }, []),
  ])

  expect(transformed).toEqual(expected)
})

test('filter option skips nodes based on custom logic', async () => {
  const processor = unified()
    .use(remarkDirective)
    .use(remarkDirectiveMdx, {
      skipTransformed: false,
      filter: node => node.name !== 'skip-me',
    })

  const tree: Root = u('root', [
    u('leafDirective', { name: 'process-me', attributes: { foo: 'bar' } }, []),
    u('leafDirective', { name: 'skip-me', attributes: { baz: 'qux' } }, []),
  ])

  const transformed = await processor.run(tree)

  const expected: Root = u('root', [
    block('process-me', { foo: 'bar' }),
    u('leafDirective', { name: 'skip-me', attributes: { baz: 'qux' } }, []),
  ])

  expect(transformed).toEqual(expected)
})

test('transformTag and transformAttribute options modify tag and attribute names', async () => {
  const processor = unified()
    .use(remarkDirective)
    .use(remarkDirectiveMdx, {
      skipTransformed: false,
      transformTag: tag => `custom-${tag}`,
      transformAttribute: (_tag, attr) => `data-${attr}`,
    })

  const tree: Root = u('root', [
    u('leafDirective', { name: 'my-directive', attributes: { foo: 'bar' } }, []),
  ])

  const transformed = await processor.run(tree)

  const expected: Root = u('root', [block('custom-my-directive', { 'data-foo': 'bar' })])

  expect(transformed).toEqual(expected)
})
