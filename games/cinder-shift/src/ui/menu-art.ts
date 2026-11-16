import promo from '../art/promo.generated.json' with {type:'json'};

/** A separate art column keeps the original robot clear of every localized control.
 * The viewBox is an editorial crop of the existing master, preserving head and feet.
 * The static ring lights the space around its silhouette, including in reduced effects.
 */
export function menuArtwork(){
 return `<div class="menu-art" data-testid="menu-art" aria-hidden="true">
  <svg viewBox="900 0 640 941" preserveAspectRatio="xMidYMid meet" focusable="false">
   <defs><radialGradient id="menu-robot-aura">
    <stop offset="0.52" stop-color="#76dcc8" stop-opacity="0"/>
    <stop offset="0.78" stop-color="#76dcc8" stop-opacity="0.3"/>
    <stop offset="1" stop-color="#76dcc8" stop-opacity="0"/>
   </radialGradient></defs>
   <image href="./assets/m06/${promo.menu.file}" width="1672" height="941"/>
   <ellipse data-testid="menu-robot-glow" cx="1195" cy="456" rx="258" ry="447" fill="url(#menu-robot-aura)"/>
  </svg>
 </div>`;
}
