import fs from 'node:fs/promises';
import path from 'node:path';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const repoRoot = process.cwd();
  const srcTemplates = path.join(repoRoot, 'src', 'prompts', 'templates');
  const distTemplates = path.join(repoRoot, 'dist', 'prompts', 'templates');

  await copyDir(srcTemplates, distTemplates);
  console.log(`Copied templates to ${distTemplates}`);
}

main().catch((error) => {
  console.error('Failed to copy templates:', error);
  process.exit(1);
});
