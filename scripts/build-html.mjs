import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({
  configFile: false,
  root,
  publicDir: false,
  logLevel: 'warn',
  build: {
    write: false,
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: resolve(root, 'src/main.ts'),
      name: 'BorrowedFire',
      formats: ['iife'],
      fileName: () => 'game.js',
      cssFileName: 'game',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const builds = Array.isArray(result) ? result : [result];
if (builds.length !== 1 || !('output' in builds[0])) throw new Error('Expected a single build output');
const scripts = builds[0].output.filter(item => item.type === 'chunk');
const styles = builds[0].output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css'));
const other = builds[0].output.filter(item => item.type === 'asset' && !item.fileName.endsWith('.css'));
if (scripts.length !== 1 || styles.length !== 1 || other.length) {
  throw new Error(`Cannot produce a self-contained HTML: ${scripts.length} scripts, ${styles.length} styles, other assets: ${other.map(a => a.fileName).join(', ')}`);
}
// A classic IIFE script works with file:// without fetching ES module dependencies.
const js = scripts[0].code.replace(/<\/script/gi, '<\\/script');
new Script(js, { filename: 'borrowed-fire-inline.js' });
const css = String(styles[0].source).replace(/<\/style/gi, '\\3c /style');
if (/\burl\(\s*["']?(?!data:|#)[^\s"')]/i.test(css) || /@import\b/i.test(css)) {
  throw new Error('Stylesheet contains an external resource; embed it before exporting');
}
const template = await readFile(resolve(root, 'index.html'), 'utf8');
const entry = /<script\s+type="module"\s+src="\/src\/main\.ts"><\/script>/;
if (!entry.test(template)) throw new Error('Cannot locate the game entry point in index.html');
const threeLicense = await readFile(resolve(root, 'node_modules/three/LICENSE'), 'utf8');
const html = template
  .replace('</head>', () => `<style>\n${css}\n</style>\n</head>`)
  .replace(entry, () => `<script>\n${js}\n</script>`)
  .replace('</body>', () => `<script type="text/plain" id="third-party-licenses">Three.js\n${threeLicense.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`);
if (/<script\b[^>]*\bsrc\s*=/i.test(html) || /<link\b[^>]*\brel=["'](?:stylesheet|modulepreload)["']/i.test(html)) {
  throw new Error('HTML still depends on an external script or stylesheet');
}
const destination = resolve(root, 'release/borrowed-fire.html');
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, html);
console.log(`Exported: ${destination}\nSize: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB\nSelf-contained JavaScript + CSS + procedural game assets. No server required.`);
