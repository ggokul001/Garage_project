import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptsDir, '..');
const distDir = path.join(backendDir, 'dist');
const productionDir = path.join(backendDir, 'production-package');

const bundleOptions = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
};

await build({
  ...bundleOptions,
  entryPoints: [path.join(backendDir, 'src', 'start-production.ts')],
  outfile: path.join(distDir, 'server.js'),
});
// Keep both names self-contained so old and new hosting startup settings work.
await copyFile(path.join(distDir, 'server.js'), path.join(distDir, 'start-production.js'));

await build({
  ...bundleOptions,
  entryPoints: [path.join(backendDir, 'src', 'migrate-production.ts')],
  outfile: path.join(distDir, 'migrate-production.js'),
});

await rm(productionDir, { recursive: true, force: true });
await mkdir(path.join(productionDir, 'dist', 'database'), { recursive: true });
await mkdir(path.join(productionDir, 'uploads'), { recursive: true });
await copyFile(path.join(distDir, 'server.js'), path.join(productionDir, 'dist', 'server.js'));
await copyFile(path.join(distDir, 'start-production.js'), path.join(productionDir, 'dist', 'start-production.js'));
await copyFile(path.join(distDir, 'migrate-production.js'), path.join(productionDir, 'dist', 'migrate-production.js'));
await copyFile(path.join(distDir, 'database', 'schema.sql'), path.join(productionDir, 'dist', 'database', 'schema.sql'));

const productionPackage = {
  name: 'accura-trucking-backend',
  version: '1.0.0',
  private: true,
  engines: { node: '>=22' },
  scripts: {
    start: 'node dist/server.js',
    'db:migrate:production': 'node dist/migrate-production.js',
  },
};
await writeFile(path.join(productionDir, 'package.json'), `${JSON.stringify(productionPackage, null, 2)}\n`, 'utf8');

try {
  const envFile = path.join(backendDir, '.env.production');
  await access(envFile, constants.R_OK);
  await copyFile(envFile, path.join(productionDir, '.env.production'));
} catch {
  console.warn('Warning: backend/.env.production was not copied; add it before upload.');
}

await writeFile(path.join(productionDir, 'UPLOAD_THIS_FOLDER.txt'), [
  'Upload all contents of this folder to /home/appsdemo/accura-backend.',
  'No node_modules or server-side npm install is required.',
  'Webuzo startup file: dist/server.js',
  'Webuzo start command: npm start',
].join('\n') + '\n', 'utf8');

console.log(`Self-contained backend package ready: ${productionDir}`);
