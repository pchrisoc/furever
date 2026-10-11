# Furever Home

A responsive, one-page static cat adoption website for Netlify. All page content and appearance settings are editable in Decap CMS. The public page has no framework or package dependencies; the CMS loads Decap and Netlify Identity from their official CDNs.

## Edit the website

After deployment, open `https://YOUR-SITE/admin/`, log in, and choose **Furever Home → Configure entire website**. Expand the group you want to edit:

- **Browser title & search description:** page title, description, favicon.
- **Branding:** logo upload, name, subtitle, footer tagline.
- **Colors & appearance:** nine colors, heading/body fonts, page width, button corners.
- **Navigation links:** add, remove, reorder, or rename links.
- **Hero / top section:** all copy, highlighted phrase, image upload and alt text, image label/caption, button, and visibility.
- **About the organization:** heading, description, signoff, visibility.
- **Adoptable cats & Petfinder:** headings, description, official embed code, widget height, placeholder copy/image, listing link, visibility.
- **Closing call to action:** text, icon, link, visibility.
- **Footer & contact information:** email, phone, location, headings, social/donation links, copyright, bottom line, sample notice, visibility.

Use new lines in text fields to add line breaks. Clear optional labels to remove them. Highlight text must match part of its heading exactly. Links can use section anchors (`#about`, `#cats`, `#contact`), HTTPS URLs, `mailto:`, or `tel:`. Hidden sections disappear from navigation, and buttons aimed at hidden sections return to the page content.

The editor shows a live page preview using the same renderer as the static build. Petfinder scripts run only on the published page; preview uses the configurable placeholder. Uploaded images save under `web/assets/uploads` and are copied into the published site. Click **Publish** to commit to `main` and trigger the connected Netlify rebuild.

Contact details and organization copy are samples. Once replaced, turn off **Footer & contact information → Show sample content notice**.

## Petfinder

Generate your official widget from https://www.petfinder.com/tools-widgets/custom-pet-list/getting-started/ and paste it into **Adoptable cats & Petfinder → Official Petfinder widget embed code**. Set the listing URL to your own organization's Petfinder page. No API keys or secrets are needed. Owner-supplied embed HTML is trusted and runs on the live site; use only official Petfinder code.

The legacy `web/petfinder-embed.html` remains a fallback for existing embeds. The CMS field takes priority when nonempty. An empty field and comments-only fallback display the placeholder.

## Build and preview

Use Node 20 or newer. `npm run build` creates `dist/`. `npm test` verifies CMS field coverage, rendering, section visibility, embed isolation, and link/color validation. `npm start` builds and serves at http://localhost:8888 (requires Python 3). Netlify uses `npm run build` and publishes `dist`.

`web/content.json` is the sole CMS content file. `web/admin/config.yml` is JSON-formatted YAML (valid YAML) with grouped fields. `web/assets/render-page.mjs` is shared by the build and CMS preview. The default static preview supports browsing; CMS authentication and saving require the deployed backend.

## Authentication and deployment

The CMS retains the starter's `git-gateway` backend and `main` branch. It requires working Netlify Identity and Git Gateway on the same site and an invited CMS user. Existing Git Gateway configurations continue working, but Netlify has deprecated it and does not recommend new configurations. For a new setup, use another supported Decap backend such as GitHub with OAuth. See https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/ and https://decapcms.org/docs/github-backend/.

Push this repository to the branch connected to Netlify to deploy. Local edits alone do not update the live website. If dashboard settings override the repository, use build command `npm run build`, publish directory `dist`, and clear an old base directory. Existing custom domains can remain attached.

Both local repositories contain the same implementation. Each website's CMS edits only its connected repository; updates do not automatically synchronize between them. Invitation and reset tokens landing on the homepage redirect to `/admin/` on the same origin.

The former Hugo/Decap starter files in `site/` and `src/` are retained for reference in one-click-hugo-cms and are no longer built.
