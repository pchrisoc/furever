import { renderPage } from '../assets/render-page.mjs';
const response = await fetch(new URL('../assets/page-template.html', import.meta.url));
if (!response.ok) throw new Error('Could not load the page preview template.');
const template = await response.text();
const PagePreview = ({entry, getAsset}) => {
  const data = entry.getIn(['data']).toJS();
  for (const [section, key] of [['seo','favicon'],['branding','logo'],['hero','image'],['cats','placeholderImage']]) {
    if (data[section]?.[key]) data[section][key] = String(getAsset(data[section][key]));
  }
  return window.h('iframe', {
    title: 'Furever Home page preview',
    srcDoc: renderPage(data, template, {preview:true, baseUrl:new URL('../', import.meta.url).href, basePath:new URL('../', import.meta.url).pathname.replace(/\/$/,'')}),
    sandbox: 'allow-same-origin',
    style: {width:'100%', height:'85vh', border:0, display:'block', background:'white'}
  });
};
window.CMS.registerPreviewTemplate('content', PagePreview);
window.CMS.registerPreviewStyle('body{margin:0} iframe{display:block}', {raw:true});
