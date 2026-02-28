import { buildSync } from 'esbuild';
import { readdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

const apiDir = join(process.cwd(), 'api');

// Find all top-level .ts route files (not _ prefixed helpers)
const routeFiles = readdirSync(apiDir)
  .filter(f => f.endsWith('.ts') && !f.startsWith('_'));

console.log(`Bundling ${routeFiles.length} API functions...`);

for (const file of routeFiles) {
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

  // Overwrite the .ts file with bundled CJS content
  // Vercel will still find the .ts file, but its content is now
  // self-contained CJS with no local file imports
  writeFileSync(entry, result.outputFiles[0].text);
  console.log(`  ✓ ${file}`);
}

console.log('API bundling complete!');
