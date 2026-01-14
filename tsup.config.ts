import { defineConfig } from "tsup"
import type { Options as TsupOptions } from "tsup"

const defaultConfig = {
  outDir: "dist",
  target: 'es2024',
  format: ["esm"],
  minify: true,
  sourcemap: true,
  swc: {
    logger: {
      error: (msg) => console.error("SWC Error:", msg),
      warn: (msg) => console.warn("SWC Warn:", msg),
      info: (msg) => console.info("SWC Info:", msg),
      success: (msg) => console.log("SWC Success:", msg),
      log: (msg) => console.log("SWC Log:", msg),
      setName: (_name) => {}
    },
    swcrc: true,
  }
} satisfies TsupOptions

export default defineConfig([
  {
    ...defaultConfig,
    entry: ["src/server.ts"],
    clean: true,
    banner: {
      js: "import 'reflect-metadata';",
    },
  },
  {
    ...defaultConfig,
    entry: ["prisma/seed.ts"],
    clean: false,
  }
])