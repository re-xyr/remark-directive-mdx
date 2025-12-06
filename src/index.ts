import type { Paragraph, Parent, PhrasingContent, Root } from 'mdast'
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive'
import { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import type { Plugin } from 'unified'
import * as mdx from './builder.js'
import { visit } from 'unist-util-visit'
import htmlTagsArray from 'html-tags'
import { camelCase, kebabCase, pascalCase, snakeCase } from 'tiny-case'

const htmlTags = new Set<string>(htmlTagsArray)

/**
 * Type for any of the directive AST nodes emitted by `mdast-util-directive`.
 */
export type AnyDirective = ContainerDirective | LeafDirective | TextDirective

/**
 * Casing options for tag and attribute name transformations.
 */
export type Casing = 'camel' | 'pascal' | 'kebab' | 'snake' | 'none'

const caseNormalizeFns: Record<Casing, (input: string) => string> = {
  camel: camelCase,
  pascal: pascalCase,
  kebab: kebabCase,
  snake: snakeCase,
  none: input => input,
}

/**
 * Options for `remarkDirectiveMdx`.
 */
export interface Options {
  /**
   * If `true`, nodes that have already been transformed for `remark-rehype` (i.e., have `data.hName` set) will be
   * skipped.
   *
   * @default true
   */
  skipTransformed?: boolean

  /**
   * Custom filter function to determine whether a directive node should be transformed.
   *
   * @default () => true // Transform all nodes
   */
  filter?: (node: AnyDirective) => boolean

  /**
   * Container directives have an optional label (`:::directive[label]`) that does not map cleanly to JSX. This
   * function allows you to customize how the label is handled. By default, the label is discarded.
   *
   * @param node The JSX node being created from a container directive.
   * @param label The label part of that directive.
   * @default (_node, _label) => {} // Discard the label
   */
  handleLabel?: (node: MdxJsxFlowElement, label: PhrasingContent[]) => void

  /**
   * Custom function to transform tag names. This can be useful when you want to use a different casing convention for
   * directive names.
   *
   * @default tag => tag // No transformation
   */
  transformTag?: (tag: string) => string

  /**
   * Custom function to transform attribute names. This can be useful when you want to use a different casing
   * convention for attribute names. It is also useful for the class shorthand: `remark-directive` transforms
   * `{.classname}` into `class="classname"`, but you may want to rename `class` to `className` for JSX.
   *
   * @default (_tag, attr) => attr // No transformation
   */
  transformAttribute?: (tag: string, attr: string) => string
}

/**
 * Handler for `Options.handleLabel` that works on Astro MDX. Wraps the label content with a `<Fragment slot="label">`
 * and appends it to the end of the element. For example:
 *
 * ```md
 * :::Note[Important]
 * This is an important note.
 * :::
 * ```
 *
 * becomes
 *
 * ```mdx
 * <Note>
 *   This is an important note.
 *   <Fragment slot="label">Important</Fragment>
 * </Note>
 * ```
 */
export function astroHandleLabel(node: MdxJsxFlowElement, label: PhrasingContent[]): void {
  node.children.push(
    mdx.flow('Fragment', [mdx.attr('slot', 'label')], label as MdxJsxFlowElement['children']),
  )
}

/**
 * Returns a tag transform function that can be passed to `Option.transformTag`. It converts all HTML tags to lowercase,
 * and applies the specified casing to non-HTML tags. By default, this uses PascalCase for non-HTML tags, which is
 * the convention used by React, Astro, Solid, Vue, and Svelte.
 *
 * @param casing The casing to apply to non-HTML tags. Default is `'pascal'`.
 */
export function normalizeTag(casing: Casing = 'pascal'): (tag: string) => string {
  const caseNormalize = caseNormalizeFns[casing]
  return (tag: string): string => {
    if (htmlTags.has(tag.toLowerCase())) {
      return tag.toLowerCase()
    }
    return caseNormalize(tag)
  }
}

/**
 * Returns an attribute transform function that can be passed to `Option.transformAttribute`. It applies the specified
 * casing to attribute names. Additionally, if `className` is `true`, it converts `class` attributes to `className`.
 * By default, this uses camelCase for attribute names, which is the convention used by React and Solid.
 *
 * @param casing The casing to apply to attribute names. Default is `'camel'`.
 * @param className Whether to convert `class` attributes to `className`. Default is `false`.
 */
export function normalizeAttribute(
  casing: Casing = 'camel',
  { className = false }: { className?: boolean } = {},
): (tag: string, attr: string) => string {
  const caseNormalize = caseNormalizeFns[casing]
  return (_tag: string, attr: string): string => {
    let normalizedAttr = caseNormalize(attr)
    if (className && normalizedAttr === 'class') {
      normalizedAttr = 'className'
    }
    return normalizedAttr
  }
}

/**
 * Remark plugin to transform directive nodes into MDX JSX nodes. This is intended to be used after `remark-directive`.
 *
 * The directive name becomes the JSX element name, and directive attributes become JSX attributes. For example:
 *
 * ```md
 * :::Note{type="warning"}
 * This is a :span[warning]{.red} note.
 * :::
 * ```
 *
 * becomes
 *
 * ```mdx
 * <Note type="warning">
 *   This is a <span class="red">warning</span> note.
 * </Note>
 * ```
 *
 * Note that all attribute values are strictly treated as strings, not expressions.
 *
 * Container directives can have an optional label (e.g., `:::Note[Label]`). By default, the label is discarded, but
 * you can provide a custom handler via the `Option.handleLabel` option.
 *
 * Your specific JSX framework may also have additional deviations from HTML (e.g. PascalCase vs kebab-case; `className`
 * vs `class`). You can provide custom tag and attribute transformers via the `Options.transformTag` and
 * `Options.transformAttribute` options to handle these cases.
 */
const remarkDirectiveMdx: Plugin<[Options?], Root> = ({
  skipTransformed = true,
  filter = _ => true,
  handleLabel = (_node, _label) => {},
  transformTag = tag => tag,
  transformAttribute = (_tag, attr) => attr,
}: Options = {}) => {
  return tree =>
    visit(tree, ['containerDirective', 'leafDirective', 'textDirective'], node => {
      if (skipTransformed && node.data && 'hName' in node.data) return // Already transformed
      if (!filter(node as AnyDirective)) return

      if (node.type === 'containerDirective') {
        const { name: rawTag, attributes, children } = node
        const tag = transformTag(rawTag)
        const newNode = mdx.flow(
          tag,
          Object.entries(attributes ?? {}).map(([attr, value]) =>
            mdx.attr(transformAttribute(tag, attr), value),
          ),
          children.filter(child => !child.data || !('directiveLabel' in child.data)),
        )
        const label = children.find(
          (child): child is Paragraph => !!child.data && 'directiveLabel' in child.data,
        )
        if (label) {
          handleLabel(newNode, label.children)
        }
        Object.assign(node as Parent, newNode)
      } else if (node.type === 'leafDirective') {
        const { name: rawTag, attributes, children } = node
        const tag = transformTag(rawTag)
        const newNode = mdx.flow(
          tag,
          Object.entries(attributes ?? {}).map(([attr, value]) =>
            mdx.attr(transformAttribute(tag, attr), value),
          ),
          children as MdxJsxFlowElement['children'],
        )
        Object.assign(node as Parent, newNode)
      } else if (node.type === 'textDirective') {
        const { name: rawTag, attributes, children } = node
        const tag = transformTag(rawTag)
        const newNode = mdx.text(
          tag,
          Object.entries(attributes ?? {}).map(([attr, value]) =>
            mdx.attr(transformAttribute(tag, attr), value),
          ),
          children,
        )
        Object.assign(node as Parent, newNode)
      }
    })
}

export default remarkDirectiveMdx
