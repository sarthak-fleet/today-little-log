import { buildSync } from 'esbuild';
import { readdirSync, writeFileSync, unlinkSync, rmSync, existsSync } from 'fs';
import { join, basename } from 'path';

const apiDir = join(process.cwd(), 'api');

// Find all top-level .ts route files (not _ prefixed helpers)
const routeFiles = readdirSync(apiDir)
  .filter(f => f.endsWith('.ts') && !f.startsWith('_'));

console.log(`Bundling ${routeFiles.length} API functions...`);

for (const file of routeFiles) {
  const name = basename(file, '.ts');
  const entry = join(apiDir, file);

  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    packages: 'external',
  });

  // Delete the .ts file THEN write .js in its place
  unlinkSync(entry);
  writeFileSync(join(apiDir, `${name}.js`), result.outputFiles[0].text);
  console.log(`  ✓ ${name}`);
}

// Remove _lib/ dir since everything is bundled
const libDir = join(apiDir, '_lib');
if (existsSync(libDir)) {
  rmSync(libDir, { recursive: true });
  console.log('  ✓ Removed _lib/');
}

console.log('API bundling complete!');
