// ==============================================================================
// GESTOR DE AUDIO: SONIDOS DESACTIVADOS
// Se desactivan los efectos de sintetizador tipo videojuego a petición del usuario.
// Mantiene la interfaz de métodos para evitar errores en llamadas existentes.
// ==============================================================================

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = true;
    this.ambientPlaying = false;
  }

  init() {
    // Sin inicialización de osciladores de sintetizador
  }

  // Chime / destellos
  playSparkle() {}

  // Celebración
  playCelebration() {}

  // Pop de botones
  playPop() {}

  // Latido
  playHeartbeat() {}

  toggleMute() {
    return false;
  }
}

export const sounds = new SoundEffects();
