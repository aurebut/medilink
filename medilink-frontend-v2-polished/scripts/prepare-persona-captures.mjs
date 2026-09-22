// Convert CUA screenshots without resizing, recoloring or reconstructing the UI.
// Usage: node scripts/prepare-persona-captures.mjs [input-directory] [output-directory]
// Input: captures.json and one full-viewport {name}-{device}.png per capture.
// Set sourceFullViewport:true in the metadata. The actual encoded image format
// is inspected because CUA can return JPEG bytes as well.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || require.resolve('sharp', {
  paths: [path.dirname(require.resolve('next/package.json'))],
}));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.resolve(process.argv[2] || path.join(root, 'output/persona-captures'));
const output = path.resolve(process.argv[3] || path.join(root, 'public/landing-assets/persona-interface'));
const sourceMetadata = JSON.parse(await readFile(path.join(input, 'captures.json'), 'utf8'));
const captures = Array.isArray(sourceMetadata) ? sourceMetadata : sourceMetadata.captures;
const names = ['search', 'offer', 'report', 'candidates'];
const devices = ['desktop', 'mobile'];
assert.ok(Array.isArray(captures), 'captures.json must contain a capture array');
assert.deepEqual(
  captures.map(capture => `${capture.name}-${capture.device}`).sort(),
  names.flatMap(name => devices.map(device => `${name}-${device}`)).sort(),
  'Supply each of the eight native persona captures exactly once',
);

const encoded = [];
for (const capture of captures) {
  const { name, device, route, viewport, crop } = capture;
  const label = `${name}-${device}`;
  assert.ok(route?.startsWith('/'), `${label}: application route required`);
  for (const field of ['width', 'height']) {
    assert.ok(Number.isInteger(viewport?.[field]) && viewport[field] > 0, `${label}: positive viewport ${field}`);
    assert.ok(Number.isInteger(crop?.[field]) && crop[field] > 0, `${label}: positive crop ${field}`);
  }
  for (const field of ['x', 'y']) assert.ok(Number.isInteger(crop?.[field]) && crop[field] >= 0, `${label}: nonnegative crop ${field}`);
  assert.ok(crop.x + crop.width <= viewport.width, `${label}: crop fits viewport width`);
  assert.ok(crop.y + crop.height <= viewport.height, `${label}: crop fits viewport height`);

  const png = await readFile(path.join(input, `${label}.png`));
  const source = await sharp(png, { failOn: 'warning' }).metadata();
  assert.ok(['png', 'jpeg'].includes(source.format), `${label}: expected a native PNG or JPEG screenshot`);
  const sourceFullViewport = capture.sourceFullViewport ?? sourceMetadata.sourceFullViewport ?? false;
  if (sourceFullViewport) {
    assert.equal(source.width, viewport.width, `${label}: full native source matches viewport width at 1x`);
    assert.equal(source.height, viewport.height, `${label}: full native source matches viewport height at 1x`);
    assert.ok(crop.x + crop.width <= source.width && crop.y + crop.height <= source.height, `${label}: extraction fits the actual encoded image`);
  } else {
    assert.equal(source.width, crop.width, `${label}: encoded pixels match measured crop width`);
    assert.equal(source.height, crop.height, `${label}: encoded pixels match measured crop height`);
  }
  function nativeCrop() {
    const pipeline = sharp(png, { failOn: 'warning' });
    return sourceFullViewport ? pipeline.extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height }) : pipeline;
  }
  const webp = await nativeCrop().webp({ lossless: true, effort: 6 }).toBuffer();
  const result = await sharp(webp).metadata();
  assert.equal(result.width, crop.width, `${label}: unchanged native crop width`);
  assert.equal(result.height, crop.height, `${label}: unchanged native crop height`);
  const [before, after] = await Promise.all([
    nativeCrop().ensureAlpha().raw().toBuffer(),
    sharp(webp).ensureAlpha().raw().toBuffer(),
  ]);
  assert.ok(before.equals(after), `${label}: every decoded source pixel is preserved`);
  const filename = `${label}.webp`;
  encoded.push({
    filename, webp,
    asset: {
      name, device, route, viewport, crop,
      ...(capture.selection ? { selection: capture.selection } : {}),
      width: result.width, height: result.height, previewHeight: result.height,
      files: [filename], sourceScale: 1, sourceFormat: source.format, sourceFullViewport,
      sha256: createHash('sha256').update(webp).digest('hex'),
    },
  });
}

// Validate the complete batch before replacing any public asset.
await mkdir(output, { recursive: true });
for (const { filename, webp, asset } of encoded) {
  await writeFile(path.join(output, filename), webp);
  console.log(`${filename}: ${asset.width} × ${asset.height}, source ${asset.sourceFormat}, pixels unchanged`);
}
const manifest = {
  description: 'Actual MédiLink application UI captured through CUA with fictional API fixtures. No screenshot-specific UI restyling or reconstruction.',
  captureMethod: 'CUA browser screenshot',
  format: 'lossless WebP conversion; native source dimensions',
  source: 'scripts/prepare-persona-captures.mjs',
  fixture: 'scripts/fixtures/persona-interface.mjs',
  ...(sourceMetadata.capturedAt ? { capturedAt: sourceMetadata.capturedAt } : {}),
  ...(sourceMetadata.browser ? { browser: sourceMetadata.browser } : {}),
  assets: encoded.map(item => item.asset),
};
await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
