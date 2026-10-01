import type { PetalsEngine } from './engine';

// Reemplaza al antiguo `window.petalsInstance`: cualquier componente puede
// disparar una ráfaga de globos sin acoplarse directamente al canvas activo.
let activeEngine: PetalsEngine | null = null;

export function setActivePetals(engine: PetalsEngine | null) {
  activeEngine = engine;
}

export function triggerGlobalBurst(x?: number, y?: number, count = 28) {
  activeEngine?.triggerBurst(x, y, count);
}
