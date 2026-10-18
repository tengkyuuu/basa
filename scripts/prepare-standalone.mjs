import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import process from 'node:process';

const root = resolve('apps/web/.next/standalone');
async function check(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (
      item.name.startsWith('.env') ||
      item.name === '.local-data' ||
      item.name.endsWith('.sqlite')
    )
      throw new Error('Private runtime files found in deployment artifact; do not deploy it.');
    if (item.isDirectory()) await check(join(directory, item.name));
  }
}
await check(root);
await mkdir(join(root, 'apps/web/.next'), { recursive: true });
await cp(resolve('apps/web/.next/static'), join(root, 'apps/web/.next/static'), {
  recursive: true,
});
await cp(resolve('apps/web/public'), join(root, 'apps/web/public'), { recursive: true });
process.stdout.write(
  'Standalone server prepared. No environment files or learner databases included.\n',
);
