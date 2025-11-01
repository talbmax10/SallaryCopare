import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// 🟩 تعديل مهم: اجعل base ثابتًا عند البناء لـ GitHub Pages
const getBasePath = (): string => {
  if (process.env.VITE_GITHUB_PAGES) {
      // عند النشر إلى GitHub Pages
          return "/SallaryCopare/"; // 👈 اسم المستودع بالضبط
            }
              // عند التشغيل محلياً
                return "./";
                };

                export default defineConfig(({ mode }) => ({
                  base: getBasePath(),
                    server: {
                        host: "::",
                            port: 8080,
                                fs: {
                                      allow: ["./client", "./shared"],
                                            deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
                                                },
                                                  },
                                                    build: {
                                                        outDir: "dist/spa",
                                                            emptyOutDir: true,
                                                              },
                                                                plugins: [react(), expressPlugin()],
                                                                  resolve: {
                                                                      alias: {
                                                                            "@": path.resolve(__dirname, "./client"),
                                                                                  "@shared": path.resolve(__dirname, "./shared"),
                                                                                      },
                                                                                        },
                                                                                        }));

                                                                                        function expressPlugin(): Plugin {
                                                                                          return {
                                                                                              name: "express-plugin",
                                                                                                  apply: "serve", // Only apply during dev mode
                                                                                                      configureServer(server) {
                                                                                                            const app = createServer();
                                                                                                                  server.middlewares.use(app);
                                                                                                                      },
                                                                                                                        };
                                                                                                                        }