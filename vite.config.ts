import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Cargo пишет в src-tauri/target — не даём Vite следить за этой папкой (EBUSY на Windows)
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: { target: "es2021" },
});
