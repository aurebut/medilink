// Small, repository-authored diagrams; illustration CSS ships in a versioned Next.js asset.
const marks = {
  cabinet: '<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M9 21v-5h6v5M9 7h6M12 4v6M8 13h1m6 0h1"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 5h2m4 0h4"/>',
  location: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  document: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h5"/>',
  note: '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>',
  money: '<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M7 9H5v2m12 4h2v-2"/>',
  legal: '<path d="m3 9 9-6 9 6ZM5 10v8m5-8v8m4-8v8m5-8v8M3 21h18M3 18h18"/>',
};

function icon(name: keyof typeof marks, x: number, y: number, size = 24) {
  return `<svg x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${marks[name]}</svg>`;
}

function tag(x: number, y: number, width: number, mark: keyof typeof marks, text: string, accent = false) {
  return `<g class="ml-v2-tag${accent ? ' ml-v2-tag--accent' : ''}"><rect x="${x}" y="${y}" width="${width}" height="52" rx="26"/>${icon(mark, x + 29, y + 26, 22)}<text class="ml-v2-label" x="${x + 50}" y="${y + 33}">${text}</text></g>`;
}

function mapPin(x: number, y: number, mark: 'cabinet' | 'person', label = '') {
  const connected = Boolean(label);
  const shoulder = connected ? 20 : 16;
  const radius = connected ? 28 : 22;
  return `<g class="ml-map-pin ml-map-pin--${mark}${mark === 'person' ? ' ml-map-pin--dark' : ''} ml-map-pin--${connected ? 'connected' : 'context'}">
    <ellipse class="ml-map-pin-shadow" cx="${x}" cy="${y + 3}" rx="${connected ? 17 : 13}" ry="4"/>
    <path class="ml-map-pin-face" d="M${x} ${y}L${x - shoulder} ${y - shoulder}a${radius} ${radius} 0 1 1 ${shoulder * 2} 0Z"/>
    ${icon(mark, x, y - (connected ? 40 : 32), connected ? 27 : 24)}
    ${connected ? `<text class="ml-v2-label ml-v2-label--center ml-v2-label--strong" x="${x}" y="${y - 82}">${label}</text>` : ''}
  </g>`;
}

function mapTown(x: number, y: number, angle = 0) {
  return `<g class="ml-map-town" transform="translate(${x} ${y}) rotate(${angle})">
    <rect x="-24" y="-17" width="10" height="7" rx="1"/><rect x="-9" y="-20" width="8" height="10" rx="1"/>
    <rect x="5" y="-17" width="14" height="7" rx="1"/><rect x="-29" y="-4" width="12" height="8" rx="1"/>
    <rect x="-12" y="-4" width="9" height="7" rx="1"/><rect x="3" y="-3" width="7" height="12" rx="1"/>
    <rect x="16" y="-4" width="10" height="8" rx="1"/><rect x="-22" y="10" width="13" height="6" rx="1"/>
    <rect x="-3" y="14" width="10" height="7" rx="1"/><rect x="14" y="10" width="8" height="6" rx="1"/>
  </g>`;
}

function matchEntity(x: number, mark: 'cabinet' | 'person', label: string) {
  return `<g class="ml-match-entity"><rect x="${x - 34}" y="172" width="68" height="68" rx="21"/>${icon(mark, x, 206, 32)}<text class="ml-v2-label ml-v2-label--center" x="${x}" y="274">${label}</text></g>`;
}

function matchCriterion(index: number, label: string) {
  // All six rows are visible by default. Motion progressively reveals four at a time.
  const y = 116 + index * 40;
  return `<g class="ml-check-row" style="--row-index: ${index}">
    <text class="ml-v2-label ml-check-label" x="135" y="${y + 8}">${label}</text>
    <circle class="ml-check-badge" cx="369" cy="${y}" r="16"/>
    ${icon('check', 369, y, 22)}
    ${index < 5 ? `<path class="ml-check-rule ml-check-row-rule" d="M135 ${y + 28}H386"/>` : ''}
  </g>`;
}

function relayEntity(x: number, mark: 'cabinet' | 'person', label: string) {
  return `<g class="ml-relay-entity${mark === 'person' ? ' ml-relay-entity--doctor' : ''}">
    <rect class="ml-relay-entity-shadow" x="${x - 36}" y="184" width="72" height="72" rx="23"/>
    <rect class="ml-relay-entity-face" x="${x - 36}" y="178" width="72" height="72" rx="23"/>
    ${icon(mark, x, 214, 33)}
    <text class="ml-v2-label ml-v2-label--center" x="${x}" y="282">${label}</text>
  </g>`;
}

function relayPaper(x: number, y: number, width: number, mark: 'document' | 'money' | 'legal', label: string, angle: number, secondLine = '') {
  const height = secondLine ? 80 : 64;
  return `<g class="ml-relay-file" transform="rotate(${angle} ${x + width / 2} ${y + height / 2})">
    <rect class="ml-relay-paper-back" x="${x + 4}" y="${y + 5}" width="${width}" height="${height}" rx="11"/>
    <rect class="ml-relay-paper" x="${x}" y="${y}" width="${width}" height="${height}" rx="11"/>
    <path class="ml-relay-fold" d="M${x + width - 25} ${y}V${y + 14}Q${x + width - 25} ${y + 23} ${x + width - 16} ${y + 23}H${x + width}"/>
    ${icon(mark, x + 26, y + height / 2, 24)}
    <text class="ml-relay-title" x="${x + 48}" y="${y + (secondLine ? 32 : 42)}">${label}</text>
    ${secondLine ? `<text class="ml-relay-title" x="${x + 48}" y="${y + 61}">${secondLine}</text>` : ''}
  </g>`;
}

function figure(id: string, number: string, eyebrow: string, headline: string, caption: string, description: string, drawing: string) {
  return `<figure class="ml-process-art ml-process-art--${id} ml-process-art--v2">
    <div class="ml-v2-heading"><span class="ml-v2-eyebrow"><i aria-hidden="true"></i>${eyebrow}</span><span class="ml-v2-index" aria-hidden="true">${number} / 03</span></div>
    <p class="ml-v2-title" aria-hidden="true">${headline}</p>
    <svg class="ml-art-diagram" width="100%" fill="none" viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ml-art-${id}-title ml-art-${id}-desc" focusable="false">
      <title id="ml-art-${id}-title">${headline.replaceAll('<br>', ' ').replaceAll(/<\/?em>/g, '')}</title><desc id="ml-art-${id}-desc">${description}</desc>
      <defs><pattern id="ml-v2-grid-${id}" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r=".9" fill="currentColor" opacity=".15"/></pattern></defs>
      <rect x="0" y="0" width="520" height="400" fill="url(#ml-v2-grid-${id})" class="ml-v2-grid"/>
      ${drawing}
    </svg>
    <figcaption class="ml-art-caption"><span class="ml-v2-caption-line" aria-hidden="true"></span>${caption}</figcaption>
  </figure>`;
}

export const processIllustrations = {
  criteria: figure('criteria', '01', 'Poser les bases', 'Deux besoins.<br><em>Un même cadre.</em>', 'Deux profils, un territoire en commun.',
    'Vue élargie d’un territoire fictif : trois cabinets et trois médecins sont répartis entre plusieurs communes. Un seul lien vert relie un cabinet et un médecin remplaçant mis en évidence ; les quatre autres repères restent indépendants.', `
    <defs><clipPath id="ml-map-clip"><rect x="3" y="10" width="514" height="380" rx="24"/></clipPath></defs>
    <g class="ml-map-ground" clip-path="url(#ml-map-clip)">
      <rect class="ml-map-base" x="3" y="10" width="514" height="380" rx="24"/>
      <g class="ml-map-fields">
        <path d="M-15 7H179L145 64 75 99-15 72Z"/><path d="M178 13 265 10 282 62 235 89 169 55Z"/>
        <path d="M23 164 81 130 143 167 105 231 19 217Z"/><path d="M163 110 214 91 254 156 199 196 145 163Z"/>
        <path d="M-10 251 78 243 121 302 68 347-10 314Z"/><path d="M145 279 209 254 248 290 215 348 147 330Z"/>
        <path d="M289 260 340 247 365 305 336 354 268 332Z"/><path d="M402 161 468 152 535 188 520 244 435 236Z"/>
        <path d="M411 329 455 295 530 318 535 399 395 400Z"/>
      </g>
      <g class="ml-map-woodland">
        <path d="M268 25C302-1 333 17 342 52S308 89 287 72 246 50 268 25Z"/>
        <path d="M20 337C46 316 102 334 110 362S87 408 47 397-5 360 20 337Z"/>
        <path d="M417 127C444 102 479 109 491 132S463 173 440 158 399 146 417 127Z"/>
        <path d="M237 340C272 326 304 343 309 373S289 408 259 398 215 357 237 340Z"/>
      </g>
      <g class="ml-map-contours"><path d="M246 12C275-17 341 0 357 43S325 108 280 90 223 46 246 12Z"/><path d="M233-1C283-38 359-2 373 45S326 127 269 106 200 38 233-1Z"/><path d="M217 344C257 305 313 325 325 364S304 427 259 416 182 378 217 344Z"/></g>
      <path class="ml-map-water" d="M365-15C323 31 403 70 365 110S320 173 351 211 404 256 377 301 361 358 396 415"/>
      <g class="ml-map-roads ml-map-roads--minor">
        <path d="M-20 54C70 46 97 91 147 80S203 56 246 84 313 105 358 91 458 83 540 45M67-20C55 40 116 76 111 126S64 206 79 253 138 314 126 407M189-20C221 54 185 88 204 132S261 185 248 241 197 324 210 417M450-20C411 67 466 116 448 168S404 225 428 281 467 340 448 422M-20 324C87 296 135 353 211 339S323 331 390 347 458 363 540 346"/>
      </g>
      <g class="ml-map-roads">
        <path d="M-20 217C30 180 70 187 112 188S178 155 219 167 261 230 301 238 365 282 407 293 482 274 540 288M-20 102C61 119 61 191 112 188S189 216 215 280 310 310 307 417M248-20C276 55 255 115 282 139S366 147 407 170 458 219 540 191"/>
      </g>
      ${mapTown(66, 55, 12)}${mapTown(111, 184, -10)}${mapTown(244, 89, 18)}${mapTown(430, 87, -17)}
      ${mapTown(54, 279, -12)}${mapTown(211, 337, 14)}${mapTown(407, 294, 12)}${mapTown(294, 231, -10)}
      <ellipse class="ml-map-zone" cx="260" cy="224" rx="207" ry="117" transform="rotate(16 260 224)"/>
      <path class="ml-map-route-bed" d="M112 188C151 188 178 155 219 167S261 230 301 238 365 282 407 293"/>
      <path class="ml-map-route" pathLength="1" d="M112 188C151 188 178 155 219 167S261 230 301 238 365 282 407 293"/>
      <g class="ml-map-waypoints"><circle cx="219" cy="167" r="4"/><circle cx="301" cy="238" r="4"/></g>
    </g>
    ${mapPin(243, 92, 'cabinet')}
    ${mapPin(457, 165, 'person')}
    ${mapPin(55, 284, 'person')}
    ${mapPin(246, 355, 'cabinet')}
    ${mapPin(112, 188, 'cabinet', 'Cabinet')}
    ${mapPin(407, 293, 'person', 'Remplaçant')}
    ${tag(274, 24, 225, 'location', 'Votre secteur')}
    <g class="ml-map-compass" transform="translate(39 349)"><circle r="17"/><path d="M0-10 5 6 0 3-5 6Z"/></g>
  `),

  matching: figure('matching', '02', 'Rapprocher les attentes', 'La bonne rencontre<br><em>se dessine.</em>', 'Des critères communs. Une décision à deux.',
    'Exemple de correspondance entre le cabinet et le médecin remplaçant : dates, lieu, spécialité, logiciel, horaires et conditions. La liste défile pour montrer les six critères, chacun accompagné d’une coche verte. Sans animation, tous restent visibles. Cette illustration présente des critères compatibles, pas un accord conclu.', `
    <defs>
      <clipPath id="ml-check-clip"><rect x="126" y="89" width="265" height="252"/></clipPath>
      <linearGradient id="ml-check-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".04" stop-color="white"/><stop offset=".96" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
      <mask id="ml-check-mask" maskUnits="userSpaceOnUse" x="126" y="89" width="265" height="252"><rect x="126" y="89" width="265" height="252" fill="url(#ml-check-fade)"/></mask>
    </defs>
    <g class="ml-v2-network">
      <path d="M-20 67H77Q104 67 104 97V115M-20 346H76Q103 346 103 318V297M417 100V62Q417 35 444 35H542M417 300V327Q417 354 444 354H550"/>
      <circle cx="39" cy="67" r="5"/><circle cx="43" cy="346" r="5"/><circle cx="458" cy="35" r="5"/><circle cx="484" cy="354" r="5"/>
    </g>
    <path class="ml-v2-connection-shadow" d="M52 212H468"/>
    <path class="ml-v2-connection" pathLength="1" d="M52 206H468"/>
    <g class="ml-checklist">
      <rect class="ml-checklist-back" x="115" y="39" width="290" height="317" rx="22"/>
      <rect class="ml-checklist-face" x="115" y="31" width="290" height="317" rx="22"/>
      <text class="ml-checklist-title" x="135" y="73">Les critères s’alignent.</text>
      <path class="ml-check-rule" d="M135 89H386"/>
      <g clip-path="url(#ml-check-clip)" mask="url(#ml-check-mask)"><g class="ml-check-reel">
        ${['Dates', 'Lieu', 'Spécialité', 'Logiciel', 'Horaires', 'Conditions'].map((label, index) => matchCriterion(index, label)).join('')}
      </g></g>
      <g class="ml-check-scrollbar"><path d="M396 103V325"/><path class="ml-check-scroll-thumb" d="M396 103V183"/></g>
    </g>
    ${matchEntity(52, 'cabinet', 'Cabinet')}
    ${matchEntity(468, 'person', 'Médecin')}
    <text class="ml-v2-label ml-v2-label--center ml-checklist-foot" x="260" y="385">Une compatibilité expliquée.</text>
  `),

  report: figure('report', '03', 'Assurer la continuité', 'Le relais,<br><em>sans perdre le fil.</em>', 'Documents et informations passent le relais.',
    'Le cabinet et le médecin remplaçant échangent dans les deux sens. Le contrat, les informations de rémunération et les déclarations légales composent une pile de documents partagés. Une seconde boucle transmet les informations, notes et consignes, pour préparer le remplacement et faciliter la reprise.', `
    <path class="ml-relay-path-bed" d="M118 200C155 200 130 91 184 91H336C390 91 365 200 402 200M402 227C365 227 390 314 336 314H184C130 314 155 227 118 227"/>
    <path class="ml-relay-path ml-relay-path--out" pathLength="1" d="M118 200C155 200 130 91 184 91H336C390 91 365 200 402 200"/>
    <path class="ml-relay-path ml-relay-path--back" pathLength="1" d="M402 227C365 227 390 314 336 314H184C130 314 155 227 118 227"/>
    <g class="ml-relay-arrows"><path d="m391 194 10 6-10 6"/><path d="m129 221-10 6 10 6"/></g>
    <g class="ml-relay-document">
      ${relayPaper(151, 16, 220, 'document', 'Contrat', -5)}
      ${relayPaper(137, 80, 246, 'money', 'Rémunération', 2)}
      ${relayPaper(144, 142, 238, 'legal', 'Déclarations', -3, 'légales')}
    </g>
    <g class="ml-relay-note">
      <path class="ml-relay-note-back" d="M181 278H353Q371 278 371 296V345Q371 363 353 363H207L181 377V363Q168 363 168 347V296Q168 278 181 278Z"/>
      <path class="ml-relay-note-face" d="M177 270H349Q367 270 367 288V337Q367 355 349 355H203L177 369V355Q164 355 164 339V288Q164 270 177 270Z"/>
      ${icon('note', 191, 299, 22)}
      <text class="ml-relay-title" x="214" y="308">Infos &amp; notes</text>
      <path class="ml-relay-rule" d="M185 331H283M185 341H251"/>
      ${icon('check', 339, 333, 22)}
    </g>
    ${relayEntity(82, 'cabinet', 'Cabinet')}
    ${relayEntity(438, 'person', 'Remplaçant')}
    <text class="ml-v2-label ml-v2-label--center" x="260" y="391">Le contexte circule, lui aussi.</text>
  `),
};
