import { compile } from '@mdx-js/mdx'
import remarkDirective from 'remark-directive'
import remarkDirectiveMdx, { astroHandleLabel } from 'remark-directive-mdx'
import { read } from 'to-vfile'
import { format } from 'prettier'

const compiled = await compile(await read('./example/example.mdx'), {
  remarkPlugins: [remarkDirective, [remarkDirectiveMdx, { handleLabel: astroHandleLabel }]],
  jsx: true,
})

const formatted = await format(String(compiled), { parser: 'acorn' })

console.log(formatted)
