import { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx'

/**
 * Make an `MdxJsxAttribute` node from the given attribute name and value.
 */
export function attr(name: string, value: string | null | undefined): MdxJsxAttribute {
  return {
    type: 'mdxJsxAttribute',
    name,
    value,
  }
}

/**
 * Make an `MdxJsxFlowElement` node from the given name, attributes, and children.
 */
export function flow(
  name: string,
  attrs: MdxJsxAttribute[],
  children: MdxJsxFlowElement['children'],
): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes: attrs,
    children,
    data: { _mdxExplicitJsx: true },
  }
}

/**
 * Make an `MdxJsxTextElement` node from the given name, attributes, and children.
 */
export function text(
  name: string,
  attrs: MdxJsxAttribute[],
  children: MdxJsxTextElement['children'],
): MdxJsxTextElement {
  return {
    type: 'mdxJsxTextElement',
    name,
    attributes: attrs,
    children,
    data: { _mdxExplicitJsx: true },
  }
}
