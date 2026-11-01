import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import markdownit from 'markdown-it';
const context=vm.createContext({markdownit});vm.runInContext(readFileSync(new URL('../web/markdown.js',import.meta.url),'utf8'),context);
const render=text=>{context.message=text;return vm.runInContext('renderMessageMarkdown(message)',context)};
test('chat renders Markdown headings, lists, tables and fenced code',()=>{
 const html=render('# Heading\n\n**Bold**\n\n- One\n- Two\n\n> Quote\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nconst x = "<tag>";\n```');
 for(const tag of ['h1','strong','ul','blockquote','table','pre','code'])assert.match(html,new RegExp('<'+tag+'[ >]'));
 assert.match(html,/&lt;tag&gt;/);
});
test('chat escapes raw HTML and rejects dangerous links and image requests',()=>{
 const html=render('<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![tracking](https://example.com/pixel.png)\n\n[good](https://example.com)');
 assert.doesNotMatch(html,/<script|<img|href="javascript:/);assert.match(html,/&lt;script&gt;/);assert.match(html,/href="https:\/\/example.com"/);assert.match(html,/noopener noreferrer/);
});
