import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const virtualId = "virtual:docs-kit";
const resolvedId = `\0${virtualId}`;

/**
 * Build a docs bundle from a manifest.
 *
 * `root` is the docs-site directory (where `docs.json` and `src/` live).
 * `repoRoot` is the repository root used to resolve page files.
 */
export function docsKit(options = {}) {
  const root = resolve(options.root || process.cwd());
  const repoRoot = resolve(options.repoRoot || resolve(root, ".."));
  const manifestPath = resolve(root, options.manifest || "docs.json");
  const audienceEnv = options.audienceEnv || "DOCS_AUDIENCE";
  const defaultAudience = options.defaultAudience || "public";
  const virtual = options.virtualId || virtualId;
  const resolved = options.virtualId ? `\0${options.virtualId}` : resolvedId;
  const audience = (process.env[audienceEnv] || defaultAudience).toLowerCase();
  if (!["public", "internal"].includes(audience)) {
    throw new Error(`${audienceEnv} must be public or internal, got ${audience}`);
  }

  return {
    name: "docs-kit",
    config() {
      return {
        define: {
          __DOCS_INTERNAL__: JSON.stringify(audience === "internal"),
        },
      };
    },
    resolveId(id) {
      return id === virtual ? resolved : null;
    },
    load(id) {
      if (id !== resolved) return null;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const navigation = manifest.navigation.filter(
        (group) => audience === "internal" || group.audience === "public",
      );
      const content = {};
      for (const group of navigation) {
        for (const page of group.pages) {
          content[page.slug] = readFileSync(resolve(repoRoot, page.file), "utf8");
        }
      }
      const docs = {
        name: manifest.name,
        description: manifest.description,
        buildAudience: audience,
        navigation,
      };
      return `export default ${JSON.stringify({ docs, content })};`;
    },
    handleHotUpdate(context) {
      if (!context.file.endsWith(".md") && context.file !== manifestPath) {
        return;
      }
      context.server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

export default docsKit;
