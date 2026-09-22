// Convert CUA screenshots without resizing, recoloring or reconstructing the UI.
// Usage: node scripts/prepare-persona-captures.mjs [input-directory] [output-directory] [--names=candidates,report]
// Input: captures.json and one native {name}-{device}.png per selected capture.
// Use sourceFullViewport:true for viewport captures, or sourceFullPage:true and
// document crop coordinates for full-page captures. sourceSegments can join
// consecutive native viewport strips without resizing or modifying their pixels.
// The actual encoded image format is inspected because CUA can return JPEG bytes.
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
const names = ['search', 'offer', 'report', 'candidates'];
const devices = ['desktop', 'mobile'];
const args = process.argv.slice(2);
const options = args.filter(arg => arg.startsWith('--'));
const directories = args.filter(arg => !arg.startsWith('--'));
assert.ok(directories.length <= 2, 'Supply at most an input directory and an output directory');
assert.ok(options.length <= 1 && options.every(arg => arg.startsWith('--names=')), 'Only the optional --names=search,offer,report,candidates flag is supported');
const requestedNames = options.length ? options[0].slice('--names='.length).split(',') : names;
assert.ok(requestedNames.length > 0 && requestedNames.every(name => names.includes(name)), 'Choose valid, comma-separated capture names');
assert.equal(new Set(requestedNames).size, requestedNames.length, 'Do not repeat capture names');
const selectedNames = new Set(requestedNames);
const partial = selectedNames.size < names.length;
const input = path.resolve(directories[0] || path.join(root, 'output/persona-captures'));
const output = path.resolve(directories[1] || path.join(root, 'public/landing-assets/persona-interface'));
const sourceMetadata = JSON.parse(await readFile(path.join(input, 'captures.json'), 'utf8'));
const captures = Array.isArray(sourceMetadata) ? sourceMetadata : sourceMetadata.captures;
assert.ok(Array.isArray(captures), 'captures.json must contain a capture array');
assert.ok(captures.every(capture => names.includes(capture.name) && devices.includes(capture.device)), 'Every capture must have a valid name and device');
const captureKey = capture => `${capture.name}-${capture.device}`;
assert.equal(new Set(captures.map(captureKey)).size, captures.length, 'Supply each native capture at most once');
const selectedCaptures = captures.filter(capture => selectedNames.has(capture.name));
assert.deepEqual(
  selectedCaptures.map(captureKey).sort(),
  requestedNames.flatMap(name => devices.map(device => `${name}-${device}`)).sort(),
  'Supply both desktop and mobile native captures for every selected name',
);
const previousManifest = partial ? JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')) : null;
if (partial) {
  assert.ok(Array.isArray(previousManifest.assets), 'Partial regeneration requires an existing complete manifest');
  assert.deepEqual(
    previousManifest.assets.map(captureKey).sort(),
    names.flatMap(name => devices.map(device => `${name}-${device}`)).sort(),
    'Partial regeneration requires all eight existing manifest entries',
  );
}

const encoded = [];
for (const capture of selectedCaptures) {
  const { name, device, route, viewport, crop } = capture;
  const label = `${name}-${device}`;
  const sourceSegments = capture.sourceSegments;
  if (sourceSegments !== undefined) assert.ok(Array.isArray(sourceSegments) && sourceSegments.length > 0, `${label}: sourceSegments must be a nonempty array`);
  const sourceFullPage = !sourceSegments && (capture.sourceFullPage ?? sourceMetadata.sourceFullPage ?? false);
  const sourceFullViewport = !sourceSegments && !sourceFullPage && (capture.sourceFullViewport ?? sourceMetadata.sourceFullViewport ?? false);
  assert.equal(typeof sourceFullPage, 'boolean', `${label}: sourceFullPage must be boolean`);
  assert.equal(typeof sourceFullViewport, 'boolean', `${label}: sourceFullViewport must be boolean`);
  assert.ok(route?.startsWith('/'), `${label}: application route required`);
  for (const field of ['width', 'height']) {
    assert.ok(Number.isInteger(viewport?.[field]) && viewport[field] > 0, `${label}: positive viewport ${field}`);
    assert.ok(Number.isInteger(crop?.[field]) && crop[field] > 0, `${label}: positive crop ${field}`);
  }
  const contentWidth = capture.contentWidth ?? viewport.width;
  assert.ok(Number.isInteger(contentWidth) && contentWidth > 0 && contentWidth <= viewport.width, `${label}: contentWidth must be a positive integer no wider than the viewport`);
  for (const field of ['x', 'y']) assert.ok(Number.isInteger(crop?.[field]) && crop[field] >= 0, `${label}: nonnegative crop ${field}`);
  assert.ok(crop.x + crop.width <= contentWidth, `${label}: crop fits content width`);
  if (!sourceFullPage && !sourceSegments) assert.ok(crop.y + crop.height <= viewport.height, `${label}: crop fits viewport height`);

  let nativeCrop;
  let sourceFormat;
  const segmentMetadata = [];
  if (sourceSegments) {
    const pixels = [];
    let destinationY = 0;
    for (const [index, segment] of sourceSegments.entries()) {
      const segmentLabel = `${label}: segment ${index + 1}`;
      assert.ok(typeof segment.file === 'string' && segment.file === path.basename(segment.file) && !segment.file.includes('\\'), `${segmentLabel}: source file must be a filename within the input directory`);
      for (const field of ['width', 'height']) assert.ok(Number.isInteger(segment.crop?.[field]) && segment.crop[field] > 0, `${segmentLabel}: positive crop ${field}`);
      for (const field of ['x', 'y']) assert.ok(Number.isInteger(segment.crop?.[field]) && segment.crop[field] >= 0, `${segmentLabel}: nonnegative crop ${field}`);
      assert.equal(segment.crop.width, crop.width, `${segmentLabel}: every strip has the final capture width`);
      assert.equal(segment.crop.x, crop.x, `${segmentLabel}: every strip preserves the same horizontal position`);
      assert.equal(segment.destinationY, destinationY, `${segmentLabel}: strips must be contiguous, ordered and start at zero`);
      assert.ok(segment.crop.x + segment.crop.width <= viewport.width && segment.crop.y + segment.crop.height <= viewport.height, `${segmentLabel}: crop fits native viewport`);
      if (segment.scrollY !== undefined) {
        assert.ok(Number.isInteger(segment.scrollY) && segment.scrollY >= 0, `${segmentLabel}: nonnegative scrollY`);
        assert.equal(segment.crop.y + segment.scrollY, crop.y + destinationY, `${segmentLabel}: strip preserves the measured document position`);
      }
      const bytes = await readFile(path.join(input, segment.file));
      const source = await sharp(bytes, { failOn: 'warning' }).metadata();
      assert.ok(['png', 'jpeg'].includes(source.format), `${segmentLabel}: expected a native PNG or JPEG screenshot`);
      assert.equal(source.width, viewport.width, `${segmentLabel}: native screenshot matches viewport width at 1x`);
      assert.equal(source.height, viewport.height, `${segmentLabel}: native screenshot matches viewport height at 1x`);
      pixels.push(await sharp(bytes, { failOn: 'warning' }).extract({
        left: segment.crop.x, top: segment.crop.y, width: segment.crop.width, height: segment.crop.height,
      }).ensureAlpha().raw().toBuffer());
      segmentMetadata.push({ ...segment, sourceFormat: source.format, sourceWidth: source.width, sourceHeight: source.height });
      destinationY += segment.crop.height;
    }
    assert.equal(destinationY, crop.height, `${label}: strips fill the final capture height without gaps or overlap`);
    const joinedPixels = Buffer.concat(pixels);
    assert.equal(joinedPixels.length, crop.width * crop.height * 4, `${label}: exactly one native RGBA pixel for each output pixel`);
    nativeCrop = () => sharp(joinedPixels, { raw: { width: crop.width, height: crop.height, channels: 4 } });
    sourceFormat = [...new Set(segmentMetadata.map(segment => segment.sourceFormat))].join('+');
  } else {
    const bytes = await readFile(path.join(input, `${label}.png`));
    const source = await sharp(bytes, { failOn: 'warning' }).metadata();
    assert.ok(['png', 'jpeg'].includes(source.format), `${label}: expected a native PNG or JPEG screenshot`);
    if (sourceFullViewport || sourceFullPage) {
      assert.equal(source.width, contentWidth, `${label}: full native source matches measured content width at 1x`);
      if (sourceFullPage) {
        assert.ok(source.height >= viewport.height, `${label}: full-page native source includes at least the viewport height at 1x`);
      } else {
        assert.equal(source.height, viewport.height, `${label}: full native source matches viewport height at 1x`);
      }
      assert.ok(crop.x + crop.width <= source.width && crop.y + crop.height <= source.height, `${label}: extraction fits the actual encoded image`);
    } else {
      assert.equal(source.width, crop.width, `${label}: encoded pixels match measured crop width`);
      assert.equal(source.height, crop.height, `${label}: encoded pixels match measured crop height`);
    }
    nativeCrop = () => {
      const pipeline = sharp(bytes, { failOn: 'warning' });
      return sourceFullViewport || sourceFullPage ? pipeline.extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height }) : pipeline;
    };
    sourceFormat = source.format;
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
      ...(capture.contentWidth !== undefined ? { contentWidth } : {}),
      ...(capture.selection ? { selection: capture.selection } : {}),
      width: result.width, height: result.height, previewHeight: result.height,
      files: [filename], sourceScale: 1, sourceFormat, sourceFullViewport,
      ...(sourceFullPage ? { sourceFullPage: true } : {}),
      ...(sourceSegments ? { sourceSegments: segmentMetadata } : {}),
      ...(partial && sourceMetadata.capturedAt ? { capturedAt: sourceMetadata.capturedAt } : {}),
      ...(partial && sourceMetadata.browser ? { browser: sourceMetadata.browser } : {}),
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
const manifest = previousManifest ? {
  ...previousManifest,
  // Preserve untouched entries, their order, and global provenance verbatim.
  assets: previousManifest.assets.map(asset => encoded.find(item => captureKey(item.asset) === captureKey(asset))?.asset ?? asset),
} : {
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
