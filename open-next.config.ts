import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      // "dummy" disables ISR (Incremental Static Regeneration).
      // ISR requires persistent storage (Redis, DynamoDB, etc.) to cache and revalidate pages.
      // This app uses only static pages and API routes, so not needed.
      incrementalCache: "dummy",
      // "dummy" disables on-demand revalidation by tag (revalidateTag()).
      // This also requires a persistent key-value store.
      tagCache: "dummy",
      // "dummy" disables background revalidation queue used for ISR background regeneration.
      // Without ISR, not needed.
      queue: "dummy",
    },
  },
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};

export default config;
