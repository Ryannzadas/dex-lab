import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Ícones do app (PWA) gerados a partir do favicon. O fundo escuro do ícone ocupa a área toda
// no "maskable" e no ícone da Apple, para não aparecer borda branca na tela inicial.
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: "#1c1917" } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: "#1c1917" } },
  },
  images: ["public/favicon.svg"],
});
