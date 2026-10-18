import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT_FILES = ['index.html', 'animation-reel.html', 'style.css', 'app.mjs', 'art.mjs', 'cels.mjs', 'engine.mjs', 'reel.mjs'];
export const SOURCE = fileURLToPath(new URL('../', import.meta.url));
export async function build(destination = resolve(SOURCE, 'dist')) {
  if (resolve(destination) === resolve(SOURCE)) throw new Error('Build destination cannot replace the source directory');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const name of [...ROOT_FILES, 'assets']) await cp(resolve(SOURCE, name), resolve(destination, name), { recursive: true });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await build();
  console.log('Static game built in dist/');
}
