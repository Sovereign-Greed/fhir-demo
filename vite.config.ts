import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const apiPort = env.API_PORT ?? "3001";
  const webPort = Number(env.WEB_PORT ?? 3010);

  return {
    plugins: [react()],
    root: projectRoot,
    envDir: projectRoot,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(projectRoot, "index.html"),
      },
    },
    server: {
      port: webPort,
      strictPort: true,
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
  };
});
