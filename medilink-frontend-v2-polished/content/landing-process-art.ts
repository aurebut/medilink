// Repository-authored SVG diagrams. Shared symbols keep the three steps visually related.
// All diagram labels remain at least 12px at the smallest supported viewport.
const symbols = {
  cabinet: '<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M9 21v-5h6v5M9 7h6M12 4v6M8 13h1m6 0h1"/>',
  doctor: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M8 13v4a2 2 0 0 0 4 0v-3M17 16v2"/><circle cx="17" cy="19" r="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 5h2m4 0h4"/>',
  location: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h5"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0ZM7 10h9m-9 4h6"/>',
};

function icon(name: keyof typeof symbols, x: number, y: number, size = 28) {
  return `<svg x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name]}</svg>`;
}

function person(name: 'cabinet' | 'doctor', x: number, y: number, label: string) {
  return `<g class="ml-art-person ml-art-person--${name}">
    <circle class="ml-art-person-halo" cx="${x}" cy="${y}" r="58"/>
    <circle class="ml-art-person-disc" cx="${x}" cy="${y}" r="45"/>
    ${icon(name, x, y, 35)}
    <text class="ml-art-label ml-art-label--person" x="${x}" y="${y + 84}">${label}</text>
  </g>`;
}

function criterion(name: 'calendar' | 'location' | 'clock', x: number, y: number, label: string) {
  return `<g class="ml-art-criterion"><circle cx="${x}" cy="${y}" r="28"/>${icon(name, x, y, 25)}<text class="ml-art-label" x="${x}" y="${y - 42}">${label}</text></g>`;
}

function figure(id: string, number: string, eyebrow: string, title: string, caption: string, description: string, drawing: string) {
  return `<figure class="ml-process-art ml-process-art--${id}">
    <div class="ml-art-heading" aria-hidden="true"><span class="ml-art-index">${number}</span><span>${eyebrow}</span><svg class="ml-art-mark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" focusable="false"><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"/></svg></div>
    <svg class="ml-art-diagram" width="100%" fill="none" viewBox="0 0 480 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ml-art-${id}-title ml-art-${id}-desc" focusable="false">
      <title id="ml-art-${id}-title">${title}</title><desc id="ml-art-${id}-desc">${description}</desc>
      ${drawing}
    </svg>
    <figcaption class="ml-art-caption"><strong>${title}</strong><span>${caption}</span></figcaption>
  </figure>`;
}

export const processIllustrations = {
  criteria: figure('criteria', '01', 'À chacun ses critères', 'Tout commence par vos attentes.', 'Deux points de vue. Les mêmes questions.',
    'Le cabinet et le médecin remplaçant précisent leurs dates, leur localisation et leurs horaires. Des lignes relient ces critères aux deux parties.', `
    <ellipse class="ml-art-orbit ml-art-orbit--sage" cx="163" cy="226" rx="116" ry="135" transform="rotate(-22 163 226)"/>
    <ellipse class="ml-art-orbit ml-art-orbit--sand" cx="318" cy="228" rx="116" ry="135" transform="rotate(22 318 228)"/>
    <g class="ml-art-link-base">
      <path d="M115 99C81 135 79 167 119 219M240 72C218 119 180 129 151 209M240 72C262 119 300 129 329 209M365 99C399 135 401 167 361 219"/>
    </g>
    <g class="ml-art-links">
      <path class="ml-art-link" pathLength="1" d="M115 99C81 135 79 167 119 219"/>
      <path class="ml-art-link" pathLength="1" d="M240 72C218 119 180 129 151 209"/>
      <path class="ml-art-link" pathLength="1" d="M240 72C262 119 300 129 329 209"/>
      <path class="ml-art-link" pathLength="1" d="M365 99C399 135 401 167 361 219"/>
    </g>
    ${criterion('calendar', 106, 87, 'Dates')}
    ${criterion('location', 240, 72, 'Lieu')}
    ${criterion('clock', 374, 87, 'Horaires')}
    ${person('cabinet', 145, 253, 'Le cabinet')}
    ${person('doctor', 335, 253, 'Le remplaçant')}
    <path class="ml-art-quiet-line" d="M203 253h74"/>
    <circle class="ml-art-small-dot" cx="240" cy="253" r="4"/>
    <circle class="ml-art-orbit-dot" cx="61" cy="202" r="4"/>
    <circle class="ml-art-orbit-dot ml-art-orbit-dot--sand" cx="417" cy="299" r="4"/>
    <path class="ml-art-detail" d="M232 381h16m-8-8v16"/>
  `),

  matching: figure('matching', '02', 'Les points communs se révèlent', 'Des liens qui font sens.', 'Les correspondances deviennent lisibles.',
    'Trois liens entre le cabinet et le remplaçant mettent en évidence leurs correspondances de dates, de lieu et de conditions d’exercice.', `
    <ellipse class="ml-art-orbit ml-art-orbit--sage" cx="184" cy="214" rx="133" ry="141" transform="rotate(-22 184 214)"/>
    <ellipse class="ml-art-orbit ml-art-orbit--sand" cx="298" cy="214" rx="133" ry="141" transform="rotate(22 298 214)"/>
    <g class="ml-art-link-base">
      <path d="M107 225C160 225 151 89 240 89S320 225 373 225M107 225H373M107 225C160 225 165 357 240 357S320 225 373 225"/>
    </g>
    <g class="ml-art-links">
      <path class="ml-art-link" pathLength="1" d="M107 225C160 225 151 89 240 89S320 225 373 225"/>
      <path class="ml-art-link" pathLength="1" d="M107 225H373"/>
      <path class="ml-art-link" pathLength="1" d="M107 225C160 225 165 357 240 357S320 225 373 225"/>
    </g>
    <g class="ml-art-match-point"><circle cx="240" cy="89" r="17"/>${icon('check', 240, 89, 18)}<text class="ml-art-label" x="240" y="54">Dates</text></g>
    <g class="ml-art-match-point"><circle cx="240" cy="357" r="17"/>${icon('check', 240, 357, 18)}<text class="ml-art-label" x="240" y="403">Conditions</text></g>
    <g class="ml-art-connection">
      <circle class="ml-art-connection-halo" cx="240" cy="225" r="52"/>
      <circle class="ml-art-connection-core" cx="240" cy="225" r="36"/>
      <g transform="translate(240 225) rotate(-35)"><rect x="-22" y="-10" width="29" height="20" rx="10"/><rect x="-7" y="-10" width="29" height="20" rx="10"/></g>
      <text class="ml-art-label" x="240" y="164">Lieu</text>
    </g>
    ${person('cabinet', 89, 225, 'Le cabinet')}
    ${person('doctor', 391, 225, 'Le remplaçant')}
    <circle class="ml-art-orbit-dot" cx="88" cy="97" r="4"/>
    <circle class="ml-art-orbit-dot ml-art-orbit-dot--sand" cx="399" cy="342" r="4"/>
  `),

  report: figure('report', '03', 'Le fil reste entre vos mains', 'La suite se prépare ensemble.', 'Un même fil, jusqu’à la transmission.',
    'Un fil relie le début du remplacement à la reprise par le cabinet. L’activité et les transmissions alimentent un compte rendu partagé tout au long du parcours.', `
    <ellipse class="ml-art-orbit ml-art-orbit--sage" cx="226" cy="229" rx="179" ry="112" transform="rotate(-28 226 229)"/>
    <ellipse class="ml-art-orbit ml-art-orbit--sand" cx="273" cy="221" rx="120" ry="155" transform="rotate(28 273 221)"/>
    <path class="ml-art-link-base" d="M87 132C169 132 111 253 228 253S290 332 393 332"/>
    <path class="ml-art-link ml-art-link--journey" pathLength="1" d="M87 132C169 132 111 253 228 253S290 332 393 332"/>
    <path class="ml-art-quiet-line" d="M232 111v52M353 167C320 166 310 178 292 192"/>
    <g class="ml-art-note"><circle cx="232" cy="86" r="24"/>${icon('activity', 232, 86, 25)}<text class="ml-art-label" x="232" y="43">Activité</text></g>
    <g class="ml-art-note"><circle cx="381" cy="160" r="24"/>${icon('message', 381, 160, 24)}<text class="ml-art-label" x="371" y="118">Transmissions</text></g>
    <g class="ml-art-document" transform="rotate(-6 244 235)">
      <rect class="ml-art-paper-back" x="190" y="174" width="114" height="133" rx="9" transform="rotate(12 247 240)"/>
      <rect class="ml-art-paper" x="181" y="165" width="114" height="133" rx="9"/>
      ${icon('document', 207, 192, 22)}
      <path class="ml-art-paper-line" d="M200 222h76m-76 14h76m-76 14h43"/>
      <circle class="ml-art-seal" cx="283" cy="286" r="22"/>${icon('check', 283, 286, 23)}
    </g>
    <text class="ml-art-label" x="220" y="343">Compte rendu partagé</text>
    <g class="ml-art-endpoint ml-art-endpoint--start"><circle cx="87" cy="132" r="36"/>${icon('doctor', 87, 132, 29)}<text class="ml-art-label" x="87" y="192">Le relais</text></g>
    <g class="ml-art-endpoint ml-art-endpoint--finish"><circle cx="393" cy="332" r="36"/>${icon('cabinet', 393, 332, 29)}<text class="ml-art-label" x="393" y="393">La reprise</text></g>
    <circle class="ml-art-orbit-dot" cx="106" cy="318" r="4"/>
    <circle class="ml-art-orbit-dot ml-art-orbit-dot--sand" cx="383" cy="70" r="4"/>
  `),
};
