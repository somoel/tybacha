export function setMuted(_value: boolean): void {}
export function isMuted(): boolean { return false; }
export async function preloadCue(): Promise<void> {}
export async function playCue(_variant?: 'bell' | 'chime' | 'end'): Promise<void> {}
