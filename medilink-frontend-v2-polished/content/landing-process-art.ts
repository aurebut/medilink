// Small, repository-authored diagrams; illustration CSS ships in a versioned Next.js asset.
import { curvePath, mapRoute, pinOutline } from './process-sequence-geometry';
import { pilotActors, pilotContactRoute } from './process-pilot-geometry';
import { conclusionActors, paymentRoute } from './process-conclude-geometry';

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
  parking: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  login: '<rect x="3" y="3" width="18" height="15" rx="3"/><path d="M8 21h8M12 18v3M8 10h8m-3-3 3 3-3 3"/>',
  coffee: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M3 22h15M7 3v2m5-2v2"/>',
  phone: '<path d="m8 3 2 5-3 2a15 15 0 0 0 7 7l2-3 5 2v3a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/>',
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
    <path class="ml-check-rule ml-check-row-rule" d="M135 ${y + 28}H386"/>
  </g>`;
}

function design(...parts: [id: string, number: string, eyebrow: string, headline: string, caption: string, description: string, drawing: string]) { return parts; }

const processDesigns = {
  criteria: design('criteria', '01', 'Poser les bases', 'Deux besoins.<br><em>Un même cadre.</em>', 'Deux profils, un territoire en commun.',
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

  matching: design('matching', '02', 'Rapprocher les attentes', 'La bonne rencontre<br><em>se dessine.</em>', 'Des critères communs. Une décision à deux.',
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

};

function sequenceActor(mark: 'cabinet' | 'person', x: number, y: number) {
  const label = mark === 'cabinet' ? 'Cabinet' : 'Remplaçant';
  return `<g class="ml-map-pin ml-map-pin--${mark}${mark === 'person' ? ' ml-map-pin--dark' : ''} ml-map-pin--connected ml-sequence-actor" data-entity="${mark}" transform="translate(${x} ${y})">
    <ellipse class="ml-map-pin-shadow" cx="0" cy="43" rx="17" ry="4"/>
    <path class="ml-map-pin-face ml-sequence-face" d="${curvePath(pinOutline, true)}"/>
    ${icon(mark, 0, 0, 27)}
    <text class="ml-v2-label ml-v2-label--center ml-v2-label--strong ml-sequence-label--map" x="0" y="-42">${label}</text>
    <text class="ml-v2-label ml-v2-label--center ml-sequence-label--match" x="0" y="-42">${mark === 'cabinet' ? 'Cabinet' : 'Médecin'}</text>
  </g>`;
}

function sequenceDiscussion() {
  return `<g class="ml-sequence-discussion">
    <g class="ml-sequence-question">
      <path class="ml-sequence-question-tail" d="M116 83 99 94 116 105"/>
      <text class="ml-v2-label ml-sequence-message" x="140" y="82">On précise la</text>
      <text class="ml-v2-label ml-sequence-message" x="140" y="113">rétrocession ?</text>
    </g>
    <g class="ml-sequence-reply">
      <path class="ml-sequence-reply-shadow" d="M155 180H385Q405 180 405 200V212L420 224 405 236V260Q405 280 385 280H155Q135 280 135 260V200Q135 180 155 180Z"/>
      <path class="ml-sequence-reply-face" d="M155 174H385Q405 174 405 194V206L420 218 405 230V254Q405 274 385 274H155Q135 274 135 254V194Q135 174 155 174Z"/>
      <text class="ml-v2-label ml-sequence-message" x="158" y="213">Oui, et le délai</text>
      <text class="ml-v2-label ml-sequence-message" x="158" y="244">de versement.</text>
    </g>
    <g class="ml-sequence-contract">
      <path class="ml-sequence-contract-link" d="M260 274V306"/>
      <g transform="rotate(-3 260 339)">
        <rect class="ml-relay-paper-back" x="154" y="307" width="222" height="73" rx="12"/>
        <rect class="ml-relay-paper" x="149" y="301" width="222" height="73" rx="12"/>
        <path class="ml-relay-fold" d="M347 301V315Q347 324 357 324H371"/>
        ${icon('document', 175, 327, 24)}
        <text class="ml-relay-title" x="198" y="333">Contrat</text>
        <text class="ml-v2-label ml-sequence-contract-note" x="172" y="358">À relire ensemble</text>
      </g>
    </g>
  </g>`;
}

function sequenceFigure() {
  const [, number, mapEyebrow, mapTitle, mapCaption, , originalMap] = processDesigns.criteria;
  const [, , matchEyebrow, matchTitle, matchCaption, , originalMatch] = processDesigns.matching;
  // Reuse the existing artwork. Only the two selected entities and their link are shared.
  const waypoints = originalMap.match(/<g class="ml-map-waypoints">[\s\S]*?<\/g>/)?.[0] || '';
  const mapDrawing = originalMap
    .replace(mapPin(112, 188, 'cabinet', 'Cabinet'), '')
    .replace(mapPin(407, 293, 'person', 'Remplaçant'), '')
    .replace(/<path class="ml-map-route(?:-bed)?"[^>]*\/>/g, '')
    .replace(waypoints, '');
  const matchDrawing = originalMatch
    .replace(matchEntity(52, 'cabinet', 'Cabinet'), '')
    .replace(matchEntity(468, 'person', 'Médecin'), '')
    .replace(/<path class="ml-v2-connection(?:-shadow)?"[^>]*\/>/g, '')
    .replaceAll(/(id="|url\(#)ml-check-/g, '$1ml-sequence-check-')
    .replace('<g class="ml-checklist">', '<g class="ml-checklist" clip-path="url(#ml-sequence-unfold)">');
  return `<figure class="ml-process-art ml-process-art--criteria ml-process-art--v2">
    <div class="ml-v2-heading">
      <span class="ml-sequence-eyebrows"><span class="ml-v2-eyebrow ml-sequence-copy--map"><i aria-hidden="true"></i>${mapEyebrow}</span><span class="ml-v2-eyebrow ml-sequence-copy--match" aria-hidden="true"><i aria-hidden="true"></i>${matchEyebrow}</span><span class="ml-v2-eyebrow ml-sequence-copy--discussion" aria-hidden="true"><i aria-hidden="true"></i>Préciser les derniers détails</span></span>
      <span class="ml-sequence-actions"><button class="ml-sequence-control" type="button" aria-label="Mettre l’animation en pause" title="Mettre l’animation en pause" hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="ml-sequence-pause-icon" d="M9 5v14M15 5v14"/><path class="ml-sequence-play-icon" d="m9 5 10 7-10 7Z"/><path class="ml-sequence-next-icon" d="M5 12h14m-6-6 6 6-6 6"/></svg></button><span class="ml-v2-index" aria-hidden="true">${number} / 03</span></span>
    </div>
    <div class="ml-sequence-titles"><p class="ml-v2-title ml-sequence-copy--map" aria-hidden="true">${mapTitle}</p><p class="ml-v2-title ml-sequence-copy--match" aria-hidden="true">${matchTitle}</p><p class="ml-v2-title ml-sequence-copy--discussion" aria-hidden="true">Les derniers détails,<br><em>ensemble.</em></p></div>
    <svg class="ml-art-diagram" width="100%" fill="none" viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ml-art-criteria-title ml-art-criteria-desc" focusable="false">
      <title id="ml-art-criteria-title">De la rencontre aux derniers détails</title>
      <desc id="ml-art-criteria-desc">Dans cette même première étape, une carte présente trois cabinets et trois médecins. Une seule paire est reliée. Ces deux repères deviennent les interlocuteurs d’une liste de critères qui défile en boucle continue : dates, lieu, spécialité, logiciel, horaires et conditions, chacun accompagné d’une coche. Sans animation, les six critères restent visibles. Puis la liste devient une discussion : le cabinet propose de préciser la rétrocession, le médecin demande aussi le délai de versement, et un contrat est partagé pour être relu ensemble. Cet exemple illustre la préparation d’un accord, sans signature automatique.</desc>
      <g class="ml-sequence-map">${mapDrawing}</g>
      <path class="ml-map-route-bed ml-sequence-link-bed" d="${curvePath(mapRoute)}"/>
      <path class="ml-map-route ml-sequence-link" pathLength="1" d="${curvePath(mapRoute)}"/>
      <g class="ml-sequence-waypoints">${waypoints}</g>
      <g class="ml-sequence-match">
        <defs><pattern id="ml-sequence-grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r=".9" fill="currentColor" opacity=".15"/></pattern><clipPath id="ml-sequence-unfold"><rect x="103" y="193.5" width="314" height="0" rx="22"/></clipPath></defs>
        <rect x="0" y="0" width="520" height="400" fill="url(#ml-sequence-grid)" class="ml-v2-grid"/>
        ${matchDrawing}
      </g>
      ${sequenceDiscussion()}
      ${sequenceActor('cabinet', 112, 148)}
      ${sequenceActor('person', 407, 253)}
    </svg>
    <figcaption class="ml-art-caption"><span class="ml-v2-caption-line" aria-hidden="true"></span><span class="ml-sequence-captions"><span class="ml-sequence-copy--map">${mapCaption}</span><span class="ml-sequence-copy--match" aria-hidden="true">${matchCaption}</span><span class="ml-sequence-copy--discussion" aria-hidden="true">L’accord se construit dans l’échange.</span></span></figcaption>
  </figure>`;
}

function pilotActor(id: string, mark: keyof typeof marks, x: number, y: number, label: string) {
  return `<g class="ml-pilot-actor ml-pilot-actor--${id}" data-pilot-actor="${id}" transform="translate(${x} ${y})">
    <rect class="ml-pilot-received" x="-36" y="-36" width="72" height="72" rx="36" opacity="0"/>
    <rect class="ml-pilot-actor-face" x="-29" y="-29" width="58" height="58" rx="29"/>
    ${icon(mark, 0, 0, 30)}
    <text class="ml-v2-label ml-v2-label--center ml-pilot-actor-label" x="0" y="${id === 'order' ? -44 : 75}">${label}</text>
    ${id === 'holder' ? `<g class="ml-pilot-cabinet" opacity="0"><circle cx="23" cy="-22" r="15"/>${icon('cabinet', 23, -22, 19)}<text class="ml-v2-label ml-v2-label--center" x="0" y="84">&amp; cabinet</text></g>` : ''}
  </g>`;
}

function pilotTile(index: number, mark: keyof typeof marks, label: string) {
  const documents = ['Contrat', 'Licence', 'Autorisation', 'Attestation', 'Justificatif'];
  const width = 232;
  const doc = index < documents.length;
  const x = 260;
  const y = 132 + index * 47;
  return `<g class="ml-pilot-tile" data-pilot-tile="${index}" transform="translate(${x} ${y})"${doc ? '' : ' opacity="0"'}>
    <rect class="ml-pilot-paper-back" x="${-width / 2}" y="-20" width="${width}" height="42" rx="4"/>
    <rect class="ml-pilot-paper-face" x="${-width / 2}" y="-21" width="${width}" height="42" rx="4"/>
    ${doc ? `<g class="ml-pilot-document-content"><path class="ml-pilot-paper-fold" d="M92-21v13q0 9 10 9h14"/>${icon('document', -91, 0, 25)}<text class="ml-pilot-paper-title" x="-68" y="10">${documents[index]}</text><g class="ml-pilot-document-details" opacity="0"><text class="ml-v2-label ml-pilot-folio" x="86" y="-66" text-anchor="end">0${index + 1} / 05</text><path class="ml-pilot-paper-rule" d="M-86 12H86M-86 35H58"/>${index === 1 || index === 2 ? '<text class="ml-v2-label ml-pilot-condition" x="-86" y="74">Si nécessaire</text>' : index === 0 ? '<path class="ml-pilot-signature" d="M15 70q13-17 17-6t12-2q11-8 24-3"/>' : '<path class="ml-pilot-paper-rule" d="M-86 70H-18"/>'}</g></g>` : ''}
    ${doc ? '<g class="ml-pilot-envelope" opacity="0"><path class="ml-pilot-envelope-seams"/><path class="ml-pilot-envelope-flap"/></g>' : ''}
    <g class="ml-pilot-info-content" data-info="${label}" opacity="0">${icon(mark, 0, 0, 58)}</g>
  </g>`;
}

function pilotFigure() {
  const copies = [
    ['documents', 'Préparer les documents', 'Les documents,<br><em>au bon endroit.</em>', 'Chaque pièce rejoint le bon interlocuteur.'],
    ['information', 'Transmettre les repères', 'Les bonnes infos,<br><em>avant d’arriver.</em>', 'Les repères du quotidien passent le relais.'],
    ['contact', 'Pendant la mission', 'Gardez<br><em>le contact.</em>', 'Titulaire et remplaçant échangent au quotidien.'],
  ];
  const copy = (column: number, className: string) => copies.map(([state, ...texts], i) => `<span class="${className} ml-pilot-copy" data-pilot-copy="${state}"${i ? ' aria-hidden="true"' : ''}>${texts[column]}</span>`).join('');
  return `<figure class="ml-process-art ml-process-art--matching ml-process-art--v2">
    <div class="ml-v2-heading"><span class="ml-pilot-copies ml-v2-eyebrow">${copy(0, 'ml-pilot-eyebrow')}</span><span class="ml-sequence-actions"><button class="ml-sequence-control" type="button" aria-label="Mettre l’animation en pause" title="Mettre l’animation en pause" hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="ml-sequence-pause-icon" d="M9 5v14M15 5v14"/><path class="ml-sequence-play-icon" d="m9 5 10 7-10 7Z"/><path class="ml-sequence-next-icon" d="M5 12h14m-6-6 6 6-6 6"/></svg></button><span class="ml-v2-index" aria-hidden="true">02 / 03</span></span></div>
    <div class="ml-pilot-copies ml-v2-title" aria-hidden="true">${copy(1, 'ml-pilot-headline')}</div>
    <svg class="ml-art-diagram" width="100%" fill="none" viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ml-art-matching-title ml-art-matching-desc" focusable="false">
      <title id="ml-art-matching-title">Pilotez le remplacement et gardez le contact pendant la mission</title>
      <desc id="ml-art-matching-desc">Illustration : cinq documents sont échangés, puis les informations pratiques circulent du cabinet au remplaçant. Pendant la mission, les deux médecins restent en contact pour se coordonner. Le titulaire propose « On fait un point ce soir ? », le remplaçant répond « Oui, après les consultations. ».</desc>
      ${pilotTile(0, 'parking', 'Parking')}${pilotTile(1, 'login', 'Logiciel')}${pilotTile(2, 'phone', 'Contacts')}${pilotTile(3, 'lock', 'Codes')}${pilotTile(4, 'coffee', 'Café')}${pilotTile(5, 'clock', 'Horaires')}
      <text class="ml-v2-label ml-v2-label--center ml-pilot-document-note" x="260" y="388">Selon votre situation</text>
      <g class="ml-pilot-contact" opacity="0">
        <path class="ml-pilot-contact-link" d="${curvePath(pilotContactRoute)}" pathLength="1"/>
        <circle class="ml-pilot-contact-pulse" r="3" opacity="0"/>
        <g class="ml-pilot-contact-message ml-pilot-contact-message--holder"><path class="ml-pilot-contact-bubble" d="M82 68H334a14 14 0 0 1 14 14V119a14 14 0 0 1-14 14H116l-18 13 3-13H82a14 14 0 0 1-14-14V82a14 14 0 0 1 14-14Z"/><text class="ml-v2-label" x="91" y="94"><tspan x="91">On fait un point</tspan><tspan x="91" dy="25">ce soir ?</tspan></text></g>
        <g class="ml-pilot-contact-message ml-pilot-contact-message--locum"><path class="ml-pilot-contact-bubble" d="M184 160H438a14 14 0 0 1 14 14V211a14 14 0 0 1-14 14H418l3 13-18-13H184a14 14 0 0 1-14-14V174a14 14 0 0 1 14-14Z"/><text class="ml-v2-label" x="191" y="186"><tspan x="191">Oui, après</tspan><tspan x="191" dy="25">les consultations.</tspan></text></g>
      </g>
      ${pilotActor('order', 'legal', pilotActors.order.x, pilotActors.order.y, 'Ordre des médecins')}${pilotActor('holder', 'person', pilotActors.holder.x, pilotActors.holder.y, 'Titulaire')}${pilotActor('locum', 'person', pilotActors.locum.x, pilotActors.locum.y, 'Remplaçant')}
    </svg>
    <figcaption class="ml-art-caption"><span class="ml-v2-caption-line" aria-hidden="true"></span><span class="ml-pilot-copies ml-pilot-captions">${copy(2, '')}</span></figcaption>
  </figure>`;
}

function concludeActor(id: keyof typeof conclusionActors, label: string) {
  const [x, y] = conclusionActors[id];
  return `<g class="ml-close-actor ml-close-actor--${id}" data-close-actor="${id}" transform="translate(${x} ${y})">
    <rect class="ml-close-actor-halo" x="-37" y="-37" width="74" height="74" rx="37" opacity="0"/>
    <rect class="ml-close-actor-face" x="-29" y="-29" width="58" height="58" rx="29"/>
    ${icon(id === 'establishment' ? 'cabinet' : 'person', 0, 0, 30)}
    <text class="ml-v2-label ml-v2-label--center" x="0" y="${id === 'doctor' ? -47 : 58}">${label}</text>
  </g>`;
}

function banknote(index: number) {
  return `<g class="ml-close-sheet" data-close-sheet="${index}" transform="translate(${[225, 253, 281][index]} ${[196, 178, 160][index]}) rotate(${[-15, -11, -7][index]})">
    <rect class="ml-close-sheet-shadow" x="-82" y="-44" width="164" height="94" rx="10"/>
    <rect class="ml-close-sheet-face" x="-82" y="-47" width="164" height="94" rx="10"/>
    <g class="ml-close-banknote-ink">
      <path class="ml-close-banknote-frame" d="M-53-34h-16v16m122-16h16v16m0 36v16H53m-106 0h-16V18"/>
      <ellipse cx="0" cy="0" rx="28" ry="36"/>
      <text class="ml-close-euro" x="0" y="19" text-anchor="middle">€</text>
      <path d="M-56 0h9m94 0h9"/>
    </g>
  </g>`;
}

function concludeFigure() {
  const copies = [
    ['payment', 'Valider le paiement', 'Le paiement,<br><em>en toute clarté.</em>', 'De l’établissement au médecin remplaçant.'],
    ['summary', 'Retrouver le bilan', 'Toute la mission,<br><em>en un regard.</em>', 'Exemple de bilan partagé de fin de mission.'],
  ];
  const copy = (column: number) => copies.map(([state, ...texts], index) => `<span class="ml-close-copy" data-close-copy="${state}"${index ? ' aria-hidden="true"' : ''}>${texts[column]}</span>`).join('');
  return `<figure class="ml-process-art ml-process-art--report ml-process-art--v2">
    <div class="ml-v2-heading"><span class="ml-close-copies ml-v2-eyebrow">${copy(0)}</span><span class="ml-sequence-actions"><button class="ml-sequence-control" type="button" aria-label="Mettre l’animation en pause" title="Mettre l’animation en pause" hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="ml-sequence-pause-icon" d="M9 5v14M15 5v14"/><path class="ml-sequence-play-icon" d="m9 5 10 7-10 7Z"/><path class="ml-sequence-next-icon" d="M5 12h14m-6-6 6 6-6 6"/></svg></button><span class="ml-v2-index" aria-hidden="true">03 / 03</span></span></div>
    <div class="ml-close-copies ml-v2-title" aria-hidden="true">${copy(1)}</div>
    <svg class="ml-art-diagram" width="100%" fill="none" viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ml-art-report-title ml-art-report-desc" focusable="false">
      <title id="ml-art-report-title">Conclure le remplacement : paiement et bilan global</title>
      <desc id="ml-art-report-desc">Illustration : le paiement est validé, puis trois billets passent de l’établissement au médecin remplaçant. Les billets se déploient ensuite en lignes pour composer un bilan de la mission. Exemple du 14 au 18 septembre : 90 consultations en cinq jours, paiement confirmé et transmissions réunies.</desc>
      <g class="ml-close-payment-path">
        <text class="ml-v2-label ml-close-payment-name" x="40" y="54">Rétrocession</text>
        <path class="ml-close-route" d="${curvePath(paymentRoute)}"/>
      </g>
      ${banknote(0)}${banknote(1)}${banknote(2)}
      <g class="ml-close-summary" opacity="0">
        <g class="ml-close-summary-head"><text class="ml-v2-label ml-close-period" x="40" y="54">14–18 septembre</text>${icon('calendar', 466, 46, 24)}</g>
        <g class="ml-close-total"><text class="ml-close-value" x="35" y="213">90</text><text class="ml-v2-label ml-close-stat-label" x="42" y="248">consultations</text></g>
        <g class="ml-close-total"><text class="ml-close-value ml-close-value--secondary" x="362" y="185">5</text><text class="ml-v2-label ml-close-stat-label" x="369" y="217">jours</text><g class="ml-close-days">${[0, 1, 2, 3, 4].map(i => `<path d="M${372 + i * 21} 240v9" pathLength="1"/>`).join('')}</g></g>
        <g class="ml-close-summary-row">${icon('note', 54, 367, 23)}<text class="ml-v2-label ml-close-period" x="82" y="374">Transmissions réunies</text></g>
      </g>
      ${concludeActor('establishment', 'Établissement')}${concludeActor('doctor', 'Remplaçant')}
      <g class="ml-close-status" transform="translate(151 354)">
        <rect class="ml-close-status-face" x="-14" y="-14" width="28" height="28" rx="14"/>
        <g class="ml-close-status-clock" opacity="0">${icon('clock', 0, 0, 20)}</g>
        <g class="ml-close-status-check"><path d="m-6 0 4 4 8-8" pathLength="1"/></g>
        <g class="ml-close-status-labels"><text class="ml-v2-label" data-payment-status="pending" x="28" y="7" opacity="0">Paiement à valider</text><text class="ml-v2-label" data-payment-status="validated" x="28" y="7">Paiement validé</text><text class="ml-v2-label" data-payment-status="received" x="28" y="7" opacity="0">Paiement confirmé</text></g>
      </g>
    </svg>
    <figcaption class="ml-art-caption"><span class="ml-v2-caption-line" aria-hidden="true"></span><span class="ml-close-copies ml-close-captions">${copy(2)}</span></figcaption>
  </figure>`;
}

export const processIllustrations = {
  criteria: sequenceFigure(),
  matching: pilotFigure(),
  report: concludeFigure(),
};
