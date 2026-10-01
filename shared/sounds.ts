// ==============================================================================
// GESTOR DE AUDIO: SONIDOS DESACTIVADOS
// Se desactivan los efectos de sintetizador tipo videojuego a petición del usuario.
// Mantiene la interfaz de métodos para evitar errores en llamadas existentes.
// ==============================================================================

class SoundEffects {
  muted = true;
  ambientPlaying = false;

  init() {
    // Sin inicialización de osciladores de sintetizador
  }

  playSparkle() {}
  playCelebration() {}
  playPop() {}
  playHeartbeat() {}

  toggleMute(): boolean {
    return false;
  }
}

export const sounds = new SoundEffects();
