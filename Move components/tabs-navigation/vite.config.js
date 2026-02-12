import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import handlebars from "vite-plugin-handlebars";
import postcssNesting from "postcss-nesting";
import autoprefixer from "autoprefixer";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  css: {
    postcss: {
      plugins: [postcssNesting(), autoprefixer()],
    },
  },
  plugins: [
    tailwindcss(),
    handlebars({
      partialDirectory: resolve(__dirname, "src/partials"),
    }),
  ],
});
