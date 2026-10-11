# Kitten Rescue CA

A standalone static cat adoption website with a self-hosted Decap CMS, GitHub Pages publishing, and a Cloudflare Worker for GitHub OAuth. All public text, images, colors, fonts, navigation, sections, contact details, and Petfinder settings are editable in the CMS.

- Website: `https://kittenrescueca.org/` (after deployment)
- CMS: `https://kittenrescueca.org/admin/`
- OAuth service: `https://redirect.simplyhost.org`
- OAuth callback: `https://redirect.simplyhost.org/callback`

## Local development

Use Node 22 or newer. Run `npm ci`, `npm test`, then `npm start`. The preview opens at `http://127.0.0.1:8888/`. `npm run build` generates `dist/`, including the CMS bundle served from this same website. No Python, Hugo, Netlify, Identity service, or runtime CMS CDN is required.

## Configure and publish

Follow [the account setup guide](docs/SETUP.md) to enable GitHub Pages and deploy the OAuth Worker. Then visit `/admin/`, sign in with GitHub, choose **Kitten Rescue CA → Configure entire website**, expand a settings group, and click **Publish**. Decap saves to `main`; GitHub Actions builds and publishes the new static page.

CMS configuration is in `web/admin/config.yml` (JSON-formatted YAML). Website content is in `web/content.json`. Media uploads are saved in `web/assets/uploads`. The public page and CMS preview share `web/assets/render-page.mjs`. GitHub login requires repository write access and inclusion in the Worker's allowed-editor list, initially `pchrisoc`.

The public page is static. The OAuth Worker only handles login and returns the editor's GitHub token to the CMS through an origin-restricted popup handshake. The GitHub client secret stays in Cloudflare Worker secrets. The default OAuth scope is `public_repo`, for this public content repository. The CMS does not edit workflow or Worker files.

## Custom website domain later

Run `npm run configure-domain -- cats.example.org`, rebuild and push. This changes `deployment.json`, produces `dist/CNAME`, switches asset URLs to the domain root, and updates the Worker's allowed CMS origin. Set that same domain in GitHub Pages, configure its DNS, update the OAuth application's homepage URL, and redeploy the Worker. The OAuth callback remains `https://redirect.simplyhost.org/callback`.

To switch back: `npm run configure-domain -- --github-pages`; remove the custom domain from GitHub Pages and redeploy the Worker. See [setup and domain instructions](docs/SETUP.md).

## Petfinder and sample content

Paste official widget HTML into **Adoptable cats & Petfinder → Official Petfinder widget embed code**. The live page runs the embed; the CMS preview shows a placeholder. Use the organization's Petfinder URL for the fallback link. `web/petfinder-embed.html` is a fallback for existing widget code. No Petfinder API secret belongs in this static website.

Dummy contact information and draft copy are retained. Turn off **Footer & contact information → Show sample content notice** after replacing them.
