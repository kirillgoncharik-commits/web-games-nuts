import type {NodeId} from '../session/research';

const drawings:Record<NodeId,string>={
  W1:'<path d="M8 32h16l8-8 8 8-8 8-8-8M40 24l12-12M40 32h16M40 40l12 12"/><path d="M52 8v8h-8M52 48v8h-8"/>',
  W2:'<path d="M8 32h31l9-6v12l-9-6M48 18v28M55 18v28"/><path d="M14 26l-6 6 6 6"/>',
  W3:'<path d="M9 42l15-15 8 8 18-18"/><path d="M40 17h10v10M11 16h12M17 10v12"/><path d="M41 47h12"/>',
  W4:'<path d="M15 16h34v32H15zM21 10v6M43 10v6M21 48v6M43 48v-6"/><path d="M35 20l-9 14h8l-4 10 12-16h-8l4-8z"/>',
  M1:'<path d="M9 40h18l7-8 8 8h14M13 48h33"/><path d="M15 36l6-13 8 5 4 10M8 22h10M4 16h11"/>',
  M2:'<path d="M18 12h10v15H18zM36 12h10v15H36z"/><path d="M23 28v17M41 28v17M17 39l6 7 6-7M35 39l6 7 6-7"/><path d="M10 18h5M49 18h5"/>',
  M3:'<path d="M17 10v44M47 10v44M17 18h11l7 7-7 7H17M47 46H36l-7-7 7-7h11"/><path d="M12 14h10M42 50h10"/>',
  M4:'<path d="M13 13h38v38H13z" stroke-dasharray="5 4"/><path d="M20 39l9-17 7 12 7-8M22 46l8-5"/><path d="M30 9v8M8 31h8M47 31h8M30 47v8"/>',
  D1:'<path d="M32 7l21 8v16l-6 15-15 8-15-8-6-15V15z"/><path d="M32 14l14 5v12l-4 10-10 6-10-6-4-10V19z"/><path d="M26 25h12M26 32h12M26 39h12"/>',
  D2:'<path d="M32 6l21 8v15c0 13-8 21-21 28C19 50 11 42 11 29V14z"/><path d="M32 18v17M24 27h16"/><circle cx="32" cy="43" r="3"/>',
  D3:'<circle cx="32" cy="32" r="6"/><path d="M32 8v9M32 47v9M8 32h9M47 32h9M15 15l7 7M42 42l7 7M49 15l-7 7M22 42l-7 7"/><circle cx="32" cy="32" r="18" stroke-dasharray="4 5"/>',
  D4:'<path d="M12 19h30v28H12zM42 25h9v16h-9"/><path d="M20 25h14v16H20z"/><path d="M32 10l20 7v12c0 11-7 18-20 24" stroke-dasharray="5 4"/><path d="M24 29v8M20 33h8"/>'
};

export function researchIcon(id:NodeId,extraClass=''){
  return`<svg class="research-icon ${extraClass}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${drawings[id]}</svg>`;
}

export const moduleStateDrawings={
  available:'<circle cx="12" cy="12" r="7"/>',
  selected:'<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  locked:'<rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  'no-points':'<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  purchased:'<circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 6-7"/>',
  equipped:'<path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="8"/>'
};
export type ModuleVisualState=keyof typeof moduleStateDrawings;

export function moduleStateMark(state:ModuleVisualState){
  return`<svg class="module-state-mark ${state}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${moduleStateDrawings[state]}</svg>`;
}
