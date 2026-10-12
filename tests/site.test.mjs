import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPage } from '../web/assets/render-page.mjs';
const base = JSON.parse(await readFile(new URL('../web/content.json', import.meta.url), 'utf8'));
const config = JSON.parse(await readFile(new URL('../web/admin/config.yml', import.meta.url), 'utf8'));
const template = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
const clone = () => structuredClone(base);
test('Decap exposes every content field, including nested objects and links', () => {
 const check = (data, fields, prefix = '') => {
  for (const [key,value] of Object.entries(data)) {
   const field = fields.find(item => item.name === key);
   assert(field, `Missing CMS field: ${prefix}${key}`);
   if (Array.isArray(value)) value.forEach(item => check(item,field.fields,`${prefix}${key}.`));
   else if (value && typeof value === 'object') check(value,field.fields,`${prefix}${key}.`);
  }
 };
 check(base,config.collections[0].files[0].fields);
});
test('CMS edits render text safely, appearance, media, links, and raw official embed', () => {
 const data=clone();
 data.hero.title='A <new> beginning';data.hero.highlight='beginning';data.hero.image='/assets/uploads/new-cat.jpg';
 data.branding.name='Happy cats';data.theme.accent='#123456';data.theme.headingFont='sans';
 data.cats.petfinderEmbed='<div id="real-widget"><script src="https://example.org/widget.js"></script></div>';
 data.footer.links=[{label:'Donate',url:'https://example.org/donate'}];data.footer.showSampleNotice=false;
 const html=renderPage(data,template);
 assert(html.includes('A &lt;new&gt; <span>beginning</span>'));
 assert(html.includes('/assets/uploads/new-cat.jpg'));
 assert(html.includes('Happy cats'));assert(html.includes('--accent:#123456'));
 assert(html.includes('--heading-font:Arial,Helvetica,sans-serif'));
 assert(html.includes(data.cats.petfinderEmbed));assert(html.includes('https://example.org/donate'));
 assert(!html.includes('Preview content ·'));
});
test('Hiding sections removes navigation targets and redirects buttons to a visible section', () => {
 const data=clone();data.about.enabled=false;data.cats.enabled=false;data.footer.enabled=false;
 const html=renderPage(data,template);
 assert(!html.includes('id="about"'));assert(!html.includes('id="cats"'));assert(!html.includes('id="contact"'));
 assert(!html.includes('href="#about"'));assert(!html.includes('href="#cats"'));assert(!html.includes('href="#contact"'));
 assert(html.includes('href="#main"'));
});
test('Preview isolates embedded scripts and invalid links/colors cannot inject markup', () => {
 const data=clone();data.cats.petfinderEmbed='<script>unsafe()</script>';
 data.theme.accent='red;}body{display:none';data.hero.buttonUrl='javascript:alert(1)';
 const html=renderPage(data,template,{preview:true,baseUrl:'https://example.org/'});
 assert(!html.includes('unsafe()'));assert(!html.includes('javascript:'));
 assert(!html.includes('display:none'));assert(html.includes('--accent:#7d3b8c'));
 assert(html.includes('Your Petfinder embed will run on the published page.'));
 data.cats.petfinderUrl='https://petfinder.com.example.org/';
 assert.throws(()=>renderPage(data,template),/HTTPS Petfinder/);
});
test('GitHub Pages project paths work for assets, internal links, and uploaded images',()=>{
 const data=clone();data.footer.links=[{label:'CMS',url:'/admin/'}];data.hero.image='/kittenrescueca/assets/uploads/cat.jpg';
 const html=renderPage(data,template,{basePath:'/kittenrescueca'});
 assert(html.includes('href="/kittenrescueca/assets/styles.css"'));assert(html.includes('href="/kittenrescueca/admin/"'));assert(html.includes('src="/kittenrescueca/assets/uploads/cat.jpg"'));assert(!html.includes('/kittenrescueca/kittenrescueca/'));assert(!html.includes('netlify'));
});
