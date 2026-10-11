const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const lines = value => escape(value).replace(/\r?\n/g, '<br>');
const heading = section => {
  let text = escape(section.title);
  const highlight = escape(section.highlight);
  if (highlight) text = text.replace(highlight, `<span>${highlight}</span>`);
  return text.replace(/\r?\n/g, '<br>');
};
const color = (value, fallback) => /^#[\da-f]{6}$/i.test(value ?? '') ? value : fallback;
const number = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
const fonts = { serif: "Georgia,'Times New Roman',serif", sans: 'Arial,Helvetica,sans-serif' };
export function renderPage(data, template, {preview = false, embedFallback = '', baseUrl = '', basePath = ''} = {}) {
  const {seo = {}, branding = {}, theme = {}, hero = {}, about = {}, cats = {}, closing = {}, footer = {}} = data;
  const localPath = value => String(value ?? '').startsWith('/') && !String(value).startsWith('//') && basePath && !String(value).startsWith(basePath + '/') ? basePath + value : String(value ?? '');
  const enabled = section => section.enabled !== false;
  const visibleIds = new Set(['main', ...[[hero, 'hero'], [about, 'about'], [cats, 'cats'], [closing, 'closing'], [footer, 'contact']].filter(([section]) => enabled(section)).map(([,id]) => id)]);
  const linkUrl = (value, fallback = '#main') => {
    const url = String(value ?? '').trim();
    if (url === '#') return '#';
    if (url.startsWith('#')) return visibleIds.has(url.slice(1)) ? url : fallback;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
    if (/^\/(?!\/)/.test(url)) return localPath(url);
    return fallback;
  };
  const imageUrl = value => /^(\/(?!\/)|https?:\/\/|blob:)/i.test(String(value ?? '')) ? escape(localPath(value)) : '';
  const link = (label, url, className = '') => label ? `<a${className ? ` class="${className}"` : ''} href="${escape(linkUrl(url))}">${escape(label)} <span aria-hidden="true">↗</span></a>` : '';
  const brand = () => `<a class="brand" href="#" aria-label="${escape(branding.name)} ${escape(branding.subtitle)}, back to top">${branding.logo ? `<img src="${imageUrl(branding.logo)}" width="38" height="38" alt="">` : ''}<span>${escape(branding.name)}${branding.subtitle ? `<span class="brand-sub">${escape(branding.subtitle)}</span>` : ''}</span></a>`;
  const eyebrow = (text, icon = '') => text ? `<p class="eyebrow">${icon ? `<span class="tiny-paw" aria-hidden="true">${escape(icon)}</span> ` : ''}${escape(text)}</p>` : '';
  let petfinderUrl = '#main';
  if (cats.petfinderUrl) {
    try { const url = new URL(cats.petfinderUrl); if (url.protocol === 'https:' && (url.hostname === 'petfinder.com' || url.hostname.endsWith('.petfinder.com'))) petfinderUrl = url.href; else throw new Error(); }
    catch { if (!preview) throw new Error('Petfinder listing URL must be an HTTPS Petfinder URL.'); }
  }
  const embed = String(cats.petfinderEmbed || embedFallback).trim();
  const hasEmbed = embed.replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;
  const placeholder = `<div class="widget-placeholder"><div class="widget-topline"><span class="widget-dots" aria-hidden="true">● ● ●</span><span>${escape(cats.placeholderLabel)}</span><span aria-hidden="true">♡</span></div><div class="widget-body">${cats.placeholderImage ? `<img src="${imageUrl(cats.placeholderImage)}" width="52" height="52" alt="">` : ''}${cats.placeholderTitle ? `<h3>${escape(cats.placeholderTitle)}</h3>` : ''}<p>${lines(cats.placeholderDescription)}</p>${cats.placeholderBadge ? `<span class="preview-badge">${escape(cats.placeholderBadge)}</span>` : ''}${preview && hasEmbed ? '<p class="preview-widget-note">Your Petfinder embed will run on the published page.</p>' : ''}</div></div>`;
  const nav = (data.navigation ?? []).filter(item => item.label && (!String(item.url).startsWith('#') || item.url === '#' || visibleIds.has(String(item.url).slice(1)))).map(item => `<a href="${escape(linkUrl(item.url))}">${escape(item.label)}</a>`).join('');
  const body = `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header wrap">${brand()}<nav aria-label="Main navigation">${nav}</nav></header>
<main id="main">
${enabled(hero) ? `<section id="hero" class="hero wrap${!hero.image ? ' hero-text-only' : ''}" aria-labelledby="hero-title"><div class="hero-copy">${eyebrow(hero.eyebrow, hero.eyebrowIcon)}<h1 id="hero-title">${heading(hero)}</h1><p class="hero-intro">${lines(hero.description)}</p>${link(hero.buttonLabel, hero.buttonUrl, 'button')}${hero.note ? `<p class="hero-note">${escape(hero.note)}</p>` : ''}</div>${hero.image ? `<div class="hero-art">${hero.imageLabel ? `<span class="art-label">${lines(hero.imageLabel)}</span>` : ''}<img src="${imageUrl(hero.image)}" alt="${escape(hero.imageAlt)}" width="600" height="650">${hero.imageCaption ? `<span class="art-caption"><span aria-hidden="true">${escape(hero.captionIcon)}</span> ${escape(hero.imageCaption)}</span>` : ''}</div>` : ''}</section>` : ''}
${enabled(about) ? `<section id="about" class="about" aria-labelledby="about-title"><div class="wrap about-grid"><div>${eyebrow(about.eyebrow)}<h2 id="about-title">${heading(about)}</h2></div><div class="about-copy"><p>${lines(about.description)}</p>${about.signoff ? `<p class="about-signoff">${lines(about.signoff)}</p>` : ''}</div></div></section>` : ''}
${enabled(cats) ? `<section id="cats" class="cats wrap" aria-labelledby="cats-title"><div class="section-heading"><div>${eyebrow(cats.eyebrow)}<h2 id="cats-title">${heading(cats)}</h2></div><p>${lines(cats.description)}</p></div><div class="petfinder-panel">${hasEmbed && !preview ? `<div class="live-widget">${embed}</div>` : placeholder}</div>${cats.fallbackLabel || cats.fallbackText ? `<p class="widget-help">${escape(cats.fallbackText)} ${link(cats.fallbackLabel, petfinderUrl)}</p>` : ''}</section>` : ''}
${enabled(closing) ? `<section id="closing" class="closing wrap">${closing.icon ? `<span aria-hidden="true">${escape(closing.icon)}</span>` : ''}<p>${lines(closing.text)}</p>${link(closing.buttonLabel, closing.buttonUrl)}</section>` : ''}
</main>
${enabled(footer) ? `<footer id="contact"><div class="wrap footer-grid"><div>${brand()}<p>${escape(branding.tagline)}</p></div><div><h2>${escape(footer.contactTitle)}</h2><p>${lines(footer.contactDescription)}</p>${footer.email ? `<a href="mailto:${escape(footer.email)}">${escape(footer.email)}</a>` : ''}${footer.phone ? `<p><a href="tel:${escape(String(footer.phone).replace(/[^\d+]/g,''))}">${escape(footer.phone)}</a></p>` : ''}</div><div><h2>${escape(footer.locationTitle)}</h2><p>${lines(footer.location)}</p>${link(footer.petfinderLabel, petfinderUrl)}${(footer.links ?? []).map(item => `<p>${link(item.label,item.url)}</p>`).join('')}</div></div><div class="wrap footer-bottom"><p>${escape(footer.copyright)}</p><p>${escape(footer.bottomText)}</p>${footer.showSampleNotice ? `<p class="sample-note">${escape(footer.sampleNotice)}</p>` : ''}</div></footer>` : ''}`;
  const vars = {'--white':color(theme.background,'#ffffff'),'--ink':color(theme.text,'#303a40'),'--muted':color(theme.muted,'#59666e'),'--blue':color(theme.lightBlue,'#e1f0f8'),'--accent':color(theme.accent,'#48728c'),'--line':color(theme.border,'#dbe4e9'),'--panel':color(theme.panel,'#f8fbfd'),'--footer':color(theme.footer,'#eef5f9'),'--button-text':color(theme.buttonText,'#ffffff'),'--heading-font':fonts[theme.headingFont] || fonts.serif,'--body-font':fonts[theme.bodyFont] || fonts.sans,'--page-width':`${number(theme.pageWidth,960,1440,1160)}px`,'--button-radius':`${number(theme.buttonRadius,0,40,5)}px`,'--widget-height':`${number(cats.widgetHeight,300,1600,650)}px`};
  const meta = `${preview && baseUrl ? `<base href="${escape(baseUrl)}">` : ''}<meta name="theme-color" content="${vars['--blue']}"><meta name="description" content="${escape(seo.description)}"><title>${escape(seo.title)}</title>${seo.favicon ? `<link rel="icon" href="${imageUrl(seo.favicon)}">` : ''}<meta property="og:title" content="${escape(seo.title)}"><meta property="og:description" content="${escape(seo.description)}">${hero.image && !preview ? `<meta property="og:image" content="${imageUrl(hero.image)}">` : ''}`;
  template = template.replaceAll('href="/assets/', `href="${basePath}/assets/`);
  return template.replace('{{meta}}', meta).replace('{{theme}}', `<style>:root{${Object.entries(vars).map(([key,value]) => `${key}:${value}`).join(';')}}</style>`).replace('{{body}}', body);
}
