import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import { u } from 'unist-builder'

export function block(
  name: string | null,
  attrs: Record<string, string | null | undefined> | null | undefined = {},
  children: MdxJsxFlowElement['children'] = [],
  data?: MdxJsxFlowElement['data'],
): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(attrs ?? {}).map(([attr, value]) =>
      u('mdxJsxAttribute', { name: attr, value }),
    ),
    children,
    data: { ...(data ?? {}), _mdxExplicitJsx: true },
  }
}

export function inline(
  name: string | null,
  attrs: Record<string, string | null | undefined> | null | undefined = {},
  children: MdxJsxTextElement['children'] = [],
  data?: MdxJsxTextElement['data'],
): MdxJsxTextElement {
  return {
    type: 'mdxJsxTextElement',
    name,
    attributes: Object.entries(attrs ?? {}).map(([attr, value]) =>
      u('mdxJsxAttribute', { name: attr, value }),
    ),
    children,
    data: { ...(data ?? {}), _mdxExplicitJsx: true },
  }
}
