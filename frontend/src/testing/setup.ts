// jsdom n'a pas `matchMedia`, que tout navigateur fournit : on le simule,
// comme un écran sans préférence (souris, mouvements autorisés).
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}
