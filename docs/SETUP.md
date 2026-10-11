# Deploy Furever Home

The source and configuration are ready. Account authentication, OAuth credentials, and domain activation are the remaining external steps. Run commands from `/Users/pchrisoc/furever`.

## 1. Publish the repository

For GitHub Pages on a free GitHub account, use a public repository. The configured remote is `pchrisoc/furever`.

```sh
gh auth login
```

Follow GitHub's browser sign-in. Check that `pchrisoc/furever` exists and is public. If it does not exist, create the public repository on GitHub; the local origin already points to it.

```sh
git add .
git commit -m "Build Furever Home with GitHub Pages and Cloudflare OAuth"
git push -u origin main
```

In the repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. Run **Actions → Publish Furever Home → Run workflow** if the first push occurred before Pages was enabled. GitHub Actions runs the tests, builds the page and local CMS bundle, and uploads `dist/`.

Expected site: `https://pchrisoc.github.io/furever/`. A deployment succeeds independently of OAuth setup; CMS login will work after the next steps.

## 2. Create the GitHub OAuth App

Go to https://github.com/settings/developers → **OAuth Apps → New OAuth App**. Enter:

| Setting | Value |
| --- | --- |
| Application name | Furever Home CMS |
| Homepage URL | `https://pchrisoc.github.io/furever/` |
| Authorization callback URL | `https://redirect.simplyhost.org/callback` |

Register the app. Copy the Client ID and generate a Client Secret. Enter them only into the secret prompts below, never into source files or chat. This OAuth app grants the editor access to public repositories through GitHub's `public_repo` scope. The Worker additionally restricts sign-in to the configured editor usernames and verifies write access to `pchrisoc/furever`.

## 3. Deploy the Cloudflare Worker

`simplyhost.org` must already be active in Cloudflare DNS. The Worker configuration attaches `redirect.simplyhost.org` as a custom domain; Cloudflare manages that domain's DNS and certificate. If an existing DNS record already occupies `redirect`, inspect it and replace it only if it is safe to retire its existing use.

```sh
npm ci
npx wrangler login
npm run worker:deploy
```

The initial Worker deployment reports setup incomplete until its secrets are set. Create them through hidden CLI prompts:

```sh
npx wrangler secret put GITHUB_CLIENT_ID --config oauth-worker/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config oauth-worker/wrangler.toml
openssl rand -base64 32 | npx wrangler secret put STATE_SECRET --config oauth-worker/wrangler.toml
```

`STATE_SECRET` encrypts the short-lived OAuth session cookie. Client secrets and editor access tokens are never written to files, logged by the Worker, or included in browser URLs. OAuth uses a random state, PKCE, an encrypted HttpOnly/Secure cookie, and an exact-origin Decap popup handshake.

Check `https://redirect.simplyhost.org/health`: it should return `configured: true`. Then open `https://pchrisoc.github.io/furever/admin/` and click **Login with GitHub**. GitHub will ask you to authorize the OAuth App. Complete that authorization yourself, then edit the site and publish. OAuth's cookie uses `SameSite=Lax`; the callback is a top-level GET from GitHub.

If your account is not `pchrisoc`, or you add editors, update `ALLOWED_GITHUB_USERS` in `oauth-worker/wrangler.toml` to a comma-separated username list and redeploy. All editors also need write access to the repository. For a private repository, review GitHub Pages plan requirements and change both the Worker scope and the CMS `auth_scope` to `repo`.

## 4. Change the public domain later

Choose your website hostname, for example `cats.example.org`, then:

```sh
npm run configure-domain -- cats.example.org
npm test
npm run build
git add deployment.json oauth-worker/wrangler.toml
git commit -m "Configure Furever Home custom domain"
git push
npm run worker:deploy
```

In **GitHub repository → Settings → Pages**, set the same custom domain and enable **Enforce HTTPS** once the certificate is ready. For a subdomain, add a DNS CNAME pointing to `pchrisoc.github.io` (no `/furever` path). Initially use DNS-only mode in Cloudflare to let GitHub validate DNS and issue its certificate. For an apex domain, follow GitHub's current documented A/AAAA or ALIAS records instead of copying subdomain instructions. Verify the domain in your GitHub account before switching DNS.

Update the OAuth App homepage URL to the new site. Keep its callback at `https://redirect.simplyhost.org/callback`. `deployment.json` controls site URLs; the domain helper also updates the Worker origin allowlist. Domain settings are deployment settings, rather than public CMS fields, because changes must coordinate GitHub Pages, DNS, and OAuth.

Changing origins requires editors to sign in again. Do not enable unrestricted wildcard origins in the Worker.

## Troubleshooting

- **404 or missing styles:** confirm Pages uses GitHub Actions, workflow succeeded, and `deployment.json` base path matches the Pages URL. `/furever` is for the default project URL; a custom domain uses an empty base path.
- **OAuth setup incomplete:** set all three Worker secrets.
- **Login request rejected:** `CMS_ORIGIN` must match the website origin exactly, and Decap's `base_url` must be `https://redirect.simplyhost.org`.
- **Session missing or expired:** start a new login from `/admin/`; keep the popup open and allow cookies.
- **Editor denied:** check the allowed username list and repository write access.
- **Worker custom domain fails:** verify `simplyhost.org` is active in your Cloudflare account and check for a conflicting DNS record.
- **CMS edits publish but site stays old:** inspect the GitHub Actions run and Pages source. Do not use the old Netlify deployment URL.

References: https://decapcms.org/docs/github-backend/, https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages, https://developers.cloudflare.com/workers/configuration/routing/custom-domains/, https://developers.cloudflare.com/workers/configuration/secrets/.
