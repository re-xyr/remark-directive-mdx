# remark-directive-mdx

[**remark**][remark] plugin to integrate [`remark-directive`][remark-directive] with [MDX][mdx].

## What is this?

This package is a [unified][unified] ([remark][remark]) plugin that converts Markdown directives to MDX JSX elements. Markdown directives are first parsed with [`remark-directive`][remark-directive], which needs to be used before this plugin.

**unified** is a project that transforms content with abstract syntax trees (ASTs). **remark** adds support for Markdown to unified, and has a rich plugin ecosystem. **MDX** enables the use of JSX components inside Markdown, and uses remark internally. This plugin operates on the Markdown AST used by remark, known as **mdast**.

## When should I use this?

This package is useful when you are using MDX and want to turn Markdown directives parsed by `remark-directive` into MDX JSX components.

Additionally, this plugin can work with any application that uses [`remark-rehype`][remark-rehype] and [`rehype-recma`][rehype-recma]. If that doesn't mean anything to you, it's probably fine to ignore it.

## Install

This package is [ESM only][esm-only]. In Node.js (version 16+), install with [npm][npm] or [pnpm][pnpm]:

```sh
npm install remark-directive-mdx # or
pnpm add remark-directive-mdx
```

In Deno with [esm.sh][esm-sh]:

```ts
import remarkDirectiveMdx from 'https://esm.sh/remark-directive-mdx@0.1'
```

In browsers with [esm.sh][esm-sh]:

```html
<script type="module">
  import remarkDirectiveMdx from 'https://esm.sh/remark-directive-mdx@0.1'
</script>
```

## Usage

Given the following file, `example.mdx`:

```mdx
import CustomList from './CustomList.jsx'
import ListItem from './ListItem.jsx'
import Emphasis from './Emphasis.jsx'

:::CustomList{type=unordered bulletType=square}
::ListItem[The :Emphasis[unified] collective is an ecosystem that deals with content via ASTs.]{first}
::ListItem[:Emphasis[remark] adds support for Markdown to unified.]
::ListItem[:Emphasis[MDX] leverages remark to bring JSX support to Markdown.]
:::
```

And the following `example.mjs`:

```js
import { compile } from '@mdx-js/mdx'
import remarkDirective from 'remark-directive'
import remarkDirectiveMdx from 'remark-directive-mdx'
import { read } from 'to-vfile'
import { format } from 'prettier'

// Compile MDX to JSX
const compiled = await compile(await read('./example.mdx'), {
  remarkPlugins: [remarkDirective, remarkDirectiveMdx],
  jsx: true,
})

// Format the JSX
const formatted = await format(String(compiled), { parser: 'acorn' })

console.log(formatted)
```

Running `node example.mjs` yields (only relevant parts shown):

```jsx
// -- snip -- //
import CustomList from './CustomList.jsx'
import ListItem from './ListItem.jsx'
import Emphasis from './Emphasis.jsx'
function _createMdxContent(props) {
  return (
    <CustomList type="unordered" bulletType="square">
      <ListItem first="">
        {'The '}
        <Emphasis>{'unified'}</Emphasis>
        {' collective is an ecosystem that deals with content via ASTs.'}
      </ListItem>
      <ListItem>
        <Emphasis>{'remark'}</Emphasis>
        {' adds support for Markdown to unified.'}
      </ListItem>
      <ListItem>
        <Emphasis>{'MDX'}</Emphasis>
        {' leverages remark to bring JSX support to Markdown.'}
      </ListItem>
    </CustomList>
  )
}
// -- snip -- //
```

## API & Configuration

This package is fully typed. Use [TypeScript][typescript] for ideal results.

We provide some configuration options. Markdown directives were initially designed to express arbitrary HTML (if you want to convert directives to HTML, not JSX, use [`remark-directive-rehype`][remark-directive-rehype]). There are many subtle differences between JSX and HTML, and some configuration options are intended to bridge this gap.

### function `remarkDirectiveMdx`

> Type: `unified.Plugin<[Option?], mdast.Root>`

This is the default export and exposes a unified (remark) plugin. It optionally accepts one argument of type [`Option`](#interface-option), which we will describe below.

### interface `Option`

This is the means to configure this plugin. It has the following fields:

#### `skipTransformed?: boolean` (default: `true`)

If true, skip transforming any directives that are already transformed for `remark-rehype` (i.e. have their `data.hName` field set) by preceding plugins.

#### `filter?: (node: mdast.Parent) => boolean`

If supplied, the plugin additionally uses this function to filter out directives it will not transform.

#### `handleLabel?: (node: mdx.MdxJsxFlowElement, label: mdast.PhrasingContent[]) => void`

Markdown container directives have an optional "label" part that can accept arbitrary inline Markdown. This does not map cleanly to JSX:

```md
:::Directive[this is the **label**]
... Content ...
:::
```

By default, this plugin drops the label entirely:

```jsx
function _createMdxContent(props) {
  return (
    <Directive>
      <p>{'... Content ...'}</p>
    </Directive>
  )
}
```

However, some JSX frameworks might have a "slots" mechanism that allows you to include this label in a dedicated slot. [Astro][astro-slots] is such an example. In this case, you can set `handleLabel` to the [`astroHandleLabel`](#function-astrohandlelabel) function that this plugin provides, which produces this output instead:

```jsx
function _createMdxContent(props) {
  return (
    <Directive>
      <p>{'... Content ...'}</p>
      <Fragment slot="label">
        {'this is the '}
        <strong>{'label'}</strong>
      </Fragment>
    </Directive>
  )
}
```

You can also write a custom function for this field to handle the label however you like. This function should modify `node` in-place, or use `Object.assign()` to replace the node.

#### `transformTag?: (tag: string) => string`

If provided, this function transforms the directive name before making it a JSX tag. This could be useful if e.g. you want to use kebab-case in your directives, but your components come in PascalCase (which is the prevalent convention). We provide a [`normalizeTag`](#function-normalizetag) function that normalizes all non-HTML tags to a specific casing convention.

#### `transformAttribute?: (tag: string, attr: string) => string`

If provided, this function transforms the attribute names from directives before putting them into JSX tags. The transformation can also depend on the (transformed) tag name.

This is useful if you want to use kebab-case for your attributes but your JSX framework uses camelCase for all attributes, for example React and Solid. For frameworks that mix kebab-case and camelCase (e.g. Astro, Svelte), you need to be very careful if you use this field.

It is also useful for this specific scenario: `remark-directive` always translates the class shorthand `{.myclass}` to `class="myclass"`. If you use React, you can use this function to transform all `class` to `className`.

We provide a [`normalizeAttribute`](#function-normalizeattribute) function that normalizes all attributes to a specific casing convention, and optionally transforms `class` to `className`.

### function `astroHandleLabel`

> Type: `(node: mdx.MdxJsxFlowElement, label: mdast.PhrasingContent[]) => void`

Pass this function to `Options.handleLabel` to instruct the plugin to append the label of a container directive as a fragment in the `label` slot. Only works with [`@astrojs/mdx`][astro-mdx].

### function `normalizeTag`

> Type: `(casing: Casing = 'kebab') => (tag: string) => string`

_Calling_ this function returns a function that you can pass to `Options.transformTag`. I.e.:

```js
{
  transformTag: normalizeTag(),
}
```

By default, this normalizes all HTML tags to lowercase, and all non-HTML tags to PascalCase. Optionally, provide a specific casing convention for non-HTML tags:

```js
{
  transformTag: normalizeTag('kebab'),
}
```

### function `normalizeAttribute`

> Type: `(casing: Casing = 'kebab', {className = false} = {}) => (tag: string, attr: string) => string`

_Calling_ this function returns a function that you can pass to `Options.transformAttribute`. I.e.:

```js
{
  transformAttribute: normalizeAttribute(),
}
```

By default, this normalizes _all_ attributes to camelCase. Optionally, provide a specific casing convention. Also optionally, instruct it to transform `class` to `className`:

```js
{
  transformAttribute: normalizeAttribute('kebab'), // or
  transformAttribute: normalizeAttribute('camel', { className: true })
}
```

### type `Casing`

The casing conventions that `normalizeTag` and `normalizeAttribute` support. Available values are:

- `'pascal'`, `'kebab'`, `'camel'`, `'snake'`;
- `'none'` for leaving the input as-is.

Internally they use [tiny-case][tiny-case].

## Testing & Contribution

This plugin is unit tested, as well as tested on Astro. We appreciate you testing this plugin on other JSX frameworks and submitting a bug report if it doesn't work there.

Contributions are welcome for use cases that could be reasonably supported by this plugin.

## License

This package is provided under the permissive [BSD 3-Clause "New" or "Revised" License (`BSD-3-Clause`)][license].

[remark]: https://github.com/remarkjs/remark
[remark-directive]: https://github.com/remarkjs/remark-directive
[mdx]: https://mdxjs.com
[unified]: https://unifiedjs.com
[remark-rehype]: https://github.com/remarkjs/remark-rehype
[rehype-recma]: https://github.com/mdx-js/recma/tree/main/packages/rehype-recma
[esm-only]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
[npm]: https://docs.npmjs.com/cli/v11/commands/npm-install
[pnpm]: https://pnpm.io/cli/add
[esm-sh]: https://esm.sh
[astro-slots]: https://docs.astro.build/en/basics/astro-components/#slots
[typescript]: https://typescriptlang.org
[tiny-case]: https://github.com/jquense/tiny-case
[license]: https://github.com/re-xyr/remark-directive-mdx/blob/master/LICENSE
[remark-directive-rehype]: https://github.com/IGassmann/remark-directive-rehype
[astro-mdx]: https://docs.astro.build/en/guides/integrations-guide/mdx/
