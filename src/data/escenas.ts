// ─────────────────────────────────────────────────────────────
//  Ilustraciones de cada modo de «Ahora mismo» (Sobre mí).
//  SVG a mano en un lienzo de 400×150 con la escena entre x 190 y 400; escena()
//  recorta el viewBox a esa zona y la alinea a la derecha del banner, para dejar
//  sitio al avatar, que se superpone abajo a la izquierda.
//  Colores por CSS: --mc (color del modo), --bg, --fg... (ver AhoraMismo.astro).
//  Las clases sc-* llevan las animaciones.
//  Los ids deben coincidir con MODOS de api/estado.py.
// ─────────────────────────────────────────────────────────────

const programando = `
<g class="sc-drift">
  <text x="214" y="44" class="sc-glyph">{ }</text>
  <text x="372" y="34" class="sc-glyph sc-d2">&lt;/&gt;</text>
  <text x="226" y="122" class="sc-glyph sc-d3">;</text>
</g>
<rect x="252" y="34" width="116" height="76" rx="7" class="sc-dark"/>
<rect x="252" y="34" width="116" height="76" rx="7" class="sc-line"/>
<circle cx="262" cy="43" r="2.2" class="sc-acc"/><circle cx="270" cy="43" r="2.2" class="sc-soft"/><circle cx="278" cy="43" r="2.2" class="sc-soft"/>
<g class="sc-code">
  <rect x="262" y="54" width="34" height="5" rx="2.5" class="sc-acc sc-type" style="--d:0s"/>
  <rect x="300" y="54" width="22" height="5" rx="2.5" class="sc-soft sc-type" style="--d:.2s"/>
  <rect x="270" y="65" width="52" height="5" rx="2.5" class="sc-soft sc-type" style="--d:.45s"/>
  <rect x="270" y="76" width="26" height="5" rx="2.5" class="sc-acc sc-type" style="--d:.7s"/>
  <rect x="300" y="76" width="40" height="5" rx="2.5" class="sc-soft sc-type" style="--d:.9s"/>
  <rect x="262" y="87" width="18" height="5" rx="2.5" class="sc-acc sc-type" style="--d:1.15s"/>
  <rect x="284" y="87" width="3" height="7" rx="1" class="sc-fg sc-blink"/>
</g>
<path d="M240 112 H380 L372 122 H248 Z" class="sc-line-fill"/>
`;

const disponible = `
<g class="sc-twinkle"><circle cx="230" cy="34" r="2"/><circle cx="380" cy="52" r="1.6"/><circle cx="352" cy="22" r="1.4"/><circle cx="246" cy="86" r="1.4"/></g>
<g class="sc-cloud"><ellipse cx="258" cy="134" rx="30" ry="10"/><ellipse cx="350" cy="138" rx="36" ry="11"/></g>
<g class="sc-bob">
  <path d="M308 22 C330 44 332 82 324 104 L292 104 C284 82 286 44 308 22 Z" class="sc-fg-fill"/>
  <circle cx="308" cy="60" r="10" class="sc-dark"/><circle cx="308" cy="60" r="6" class="sc-acc"/>
  <path d="M292 84 L276 108 L294 104 Z" class="sc-acc"/>
  <path d="M324 84 L340 108 L322 104 Z" class="sc-acc"/>
  <path d="M297 106 Q308 140 319 106 Z" class="sc-flame"/>
</g>
`;

const ocupado = `
<rect x="244" y="30" width="104" height="96" rx="9" class="sc-dark"/>
<rect x="244" y="30" width="104" height="96" rx="9" class="sc-line"/>
<path d="M244 39 a9 9 0 0 1 9 -9 h86 a9 9 0 0 1 9 9 v11 h-104 Z" class="sc-acc"/>
<rect x="266" y="22" width="4" height="14" rx="2" class="sc-fg"/><rect x="322" y="22" width="4" height="14" rx="2" class="sc-fg"/>
<g class="sc-cells">
  ${[0, 1, 2, 3]
    .flatMap((f) =>
      [0, 1, 2, 3].map(
        (c) =>
          `<rect x="${254 + c * 22}" y="${58 + f * 16}" width="16" height="10" rx="3" class="${(f * 4 + c) % 5 === 3 ? "sc-soft" : "sc-acc"} sc-fill" style="--d:${(f * 4 + c) * 0.07}s"/>`,
      ),
    )
    .join("")}
</g>
<g transform="translate(366 46)">
  <circle r="22" class="sc-dark"/><circle r="22" class="sc-line"/>
  <rect x="-1.5" y="-15" width="3" height="16" rx="1.5" class="sc-fg sc-spin-fast"/>
  <rect x="-1.5" y="-10" width="3" height="11" rx="1.5" class="sc-acc sc-spin"/>
  <circle r="3" class="sc-fg"/>
</g>
`;

const reunion = `
<g class="sc-pop-a">
  <rect x="226" y="30" width="104" height="40" rx="14" class="sc-dark"/>
  <rect x="226" y="30" width="104" height="40" rx="14" class="sc-line"/>
  <path d="M244 68 L238 82 L256 70 Z" class="sc-dark"/>
  <circle cx="262" cy="50" r="4" class="sc-fg sc-dot" style="--d:0s"/>
  <circle cx="278" cy="50" r="4" class="sc-fg sc-dot" style="--d:.15s"/>
  <circle cx="294" cy="50" r="4" class="sc-fg sc-dot" style="--d:.3s"/>
</g>
<g class="sc-pop-b">
  <rect x="282" y="80" width="100" height="40" rx="14" class="sc-acc"/>
  <path d="M362 118 L372 132 L352 120 Z" class="sc-acc"/>
  <rect x="296" y="92" width="58" height="5" rx="2.5" class="sc-dark-fill"/>
  <rect x="296" y="103" width="38" height="5" rx="2.5" class="sc-dark-fill"/>
</g>
<g class="sc-twinkle"><circle cx="214" cy="104" r="2"/><circle cx="388" cy="40" r="1.6"/></g>
`;

const descanso = `
<g class="sc-steam">
  <path d="M290 58 q-8 -10 0 -20 q8 -10 0 -20" style="--d:0s"/>
  <path d="M306 58 q-8 -10 0 -20 q8 -10 0 -20" style="--d:.6s"/>
  <path d="M322 58 q-8 -10 0 -20 q8 -10 0 -20" style="--d:1.2s"/>
</g>
<ellipse cx="306" cy="128" rx="54" ry="8" class="sc-soft"/>
<path d="M272 66 h68 v40 a20 20 0 0 1 -20 20 h-28 a20 20 0 0 1 -20 -20 Z" class="sc-fg-fill"/>
<path d="M272 66 h68 v10 h-68 Z" class="sc-acc"/>
<path d="M340 76 h6 a13 13 0 0 1 0 26 h-8" class="sc-line-thick" fill="none"/>
<g class="sc-sway" style="transform-origin:378px 126px">
  <path d="M378 126 q-2 -26 -14 -40 q14 6 14 40" class="sc-leaf"/>
  <path d="M378 126 q4 -30 18 -44 q-6 22 -18 44" class="sc-leaf"/>
  <path d="M378 126 q-10 -14 -24 -16 q16 -2 24 16" class="sc-leaf"/>
</g>
<path d="M366 116 h24 l-3 16 h-18 Z" class="sc-dark"/>
`;

const fuera = `
<g class="sc-twinkle">
  <path d="M232 36 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z"/>
  <path d="M380 92 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5 Z"/>
  <circle cx="262" cy="104" r="1.8"/><circle cx="364" cy="24" r="1.6"/><circle cx="388" cy="56" r="1.4"/><circle cx="248" cy="70" r="1.3"/>
</g>
<g class="sc-glow"><circle cx="318" cy="68" r="44" class="sc-halo"/></g>
<path d="M326 28 A42 42 0 1 0 356 100 A34 34 0 1 1 326 28 Z" class="sc-acc"/>
<g class="sc-zzz">
  <text x="270" y="64" style="--d:0s">z</text>
  <text x="258" y="50" style="--d:.8s">z</text>
  <text x="248" y="36" style="--d:1.6s">Z</text>
</g>
`;

const vacaciones = `
<g class="sc-sun"><circle cx="338" cy="74" r="28" class="sc-sunc"/></g>
<g class="sc-waves">
  <!-- empiezan muy a la izquierda: el banner enseña más lienzo que el viewBox -->
  <path d="M-80 116 q15 -8 30 0${" t30 0".repeat(20)} V150 H-80 Z" class="sc-acc"/>
  <path d="M-140 126 q15 -8 30 0${" t30 0".repeat(22)} V150 H-140 Z" class="sc-wave2"/>
</g>
<path d="M262 132 q4 -40 20 -76" class="sc-trunk" fill="none"/>
<g class="sc-sway" style="transform-origin:282px 56px">
  <path d="M282 56 C268 44 250 46 238 62 C254 54 268 54 282 56 Z" class="sc-leaf"/>
  <path d="M282 56 C272 38 256 30 240 34 C258 38 270 44 282 56 Z" class="sc-leaf"/>
  <path d="M282 56 C290 36 306 28 322 32 C306 38 294 44 282 56 Z" class="sc-leaf"/>
  <path d="M282 56 C298 44 316 46 326 62 C312 54 296 54 282 56 Z" class="sc-leaf"/>
  <circle cx="281" cy="60" r="3.5" class="sc-fg"/><circle cx="287" cy="61" r="3" class="sc-fg"/>
</g>
`;

export const ESCENAS: Record<string, string> = {
  disponible,
  programando,
  ocupado,
  reunion,
  descanso,
  fuera,
  vacaciones,
};

/** SVG completo de la escena de un modo (o la de «disponible» si no existe). */
export function escena(modo: string): string {
  // viewBox recortado a la zona donde están dibujadas las escenas (x 190–402): así se ven más grandes
  return `<svg viewBox="188 10 216 134" preserveAspectRatio="xMaxYMid meet" class="sc" data-escena="${modo}" aria-hidden="true">${
    ESCENAS[modo] ?? ESCENAS.disponible
  }</svg>`;
}
