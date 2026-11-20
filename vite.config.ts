import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets allow the same build to run in a GitHub Pages repository path.
  base: './',
  build: {
    rollupOptions: {
      output: { manualChunks: { three: ['three', 'three/addons/postprocessing/EffectComposer.js', 'three/addons/postprocessing/UnrealBloomPass.js'] } },
    },
  },
});
