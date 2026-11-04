# docs-kit

A reusable, static, Mintlify-style documentation shell for Vite.

It provides:

- fixed sidebar, right-side table of contents, command palette, dark mode
- Markdown with syntax highlighting and copyable code blocks
- public/internal audience filtering at build time
- hash routing, so `dist/` works on any static host
- a plain `docs.json` manifest; no framework lock-in

## Use

```json
{
  "name": "My Product",
  "description": "What it does.",
  "navigation": [
    {
      "group": "Start here",
      "audience": "public",
      "pages": [
        {
          "title": "Introduction",
          "slug": "introduction",
          "file": "docs-site/content/index.md",
          "description": "Start here."
        }
      ]
    }
  ]
}
```

`vite.config.js`:

```js
import { defineConfig } from "vite";
import { docsKit } from "@ajmwagar/docs-kit/vite";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    docsKit({
      root: import.meta.dirname,
      repoRoot: resolve(import.meta.dirname, ".."),
      defaultAudience: "public",
    }),
  ],
  optimizeDeps: { exclude: ["@ajmwagar/docs-kit"] },
});
```

`src/main.js`:

```js
import { mountDocs } from "@ajmwagar/docs-kit";
import bundle from "virtual:docs-kit";

mountDocs(bundle, {
  brand: { name: "My Product", mark: "M", badge: "Docs" },
  repo: {
    url: "https://github.com/me/my-product",
    blobBase: "https://github.com/me/my-product/blob/main",
    rawBase: "https://raw.githubusercontent.com/me/my-product/main",
    showInPublic: true,
  },
  defaultSlug: "introduction",
  storageKey: "my-product-docs",
  audience: {
    labels: { public: "Public", internal: "Internal" },
    scopes: { public: "Public docs", internal: "Internal docs" },
  },
});
```

Public builds omit internal pages from the bundle. The consumer owns the public
check script, because the forbidden-source rules are repo-specific.

## Local package

During development use a `file:` dependency:

```json
{
  "dependencies": {
    "@ajmwagar/docs-kit": "file:../../ajmwagar/docs-kit"
  }
}
```

For deployment, point it at this repository or publish the package.
