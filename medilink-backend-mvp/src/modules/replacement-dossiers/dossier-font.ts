import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fontkit = require('fontkit');

export const DOSSIER_FONT_PATH = join(__dirname, 'fonts', 'DejaVuSans.ttf');
let font: ReturnType<typeof fontkit.create>;

/** Check the actual bundled glyphs; never substitute a person's identity. */
export function supportsDossierText(text: string): boolean {
  font ??= fontkit.create(readFileSync(DOSSIER_FONT_PATH));
  return Array.from(text.normalize('NFC')).every((character) =>
    '\t\r\n'.includes(character) || font.hasGlyphForCodePoint(character.codePointAt(0)!));
}
