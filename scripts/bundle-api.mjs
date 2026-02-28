import { buildSync } from 'esbuild';
import { readdirSync, writeFileSync, renameSync, rmSync } from 'fs';
import { join, basename } from 'path';

const apiDir = join(process.cwd(), 'api');

// Find all top-level .ts route files (not _ prefixed helpers, not tsconfig)
const routeFiles = readdirSync(apiDir)
  .filter(f => f.endsWith('.ts') && !f.startsWith('_') && f !== 'tsconfig.json');

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
    // Keep npm packages external — Vercel resolves these from node_modules
    // Only bundle local file imports (_lib/*, _schema, etc.)
    packages: 'external',
  });

  // Rename .ts source to .ts.bak so Vercel picks up the .js instead
  renameSync(entry, join(apiDir, `${file}.bak`));

  // Write bundled CJS output
  writeFileSync(join(apiDir, `${name}.js`), result.outputFiles[0].text);
  console.log(`  ✓ ${name}`);
}

// Remove _lib/ dir since everything is bundled now
try {
  rmSync(join(apiDir, '_lib'), { recursive: true });
  console.log('  ✓ Removed _lib/ (inlined into bundles)');
} catch {}

console.log('API bundling complete!');
