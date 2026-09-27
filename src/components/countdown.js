// ==============================================================================
// COMPONENTE: CRONÓMETRO REGRESIVO PARA LA SIGUIENTE CITA
// ==============================================================================

import { getEvents } from '../utils/storage.js';
import { sounds } from '../utils/audio.js';

export class CountdownTimer {
  constructor(containerId = 'countdown-section') {
    this.container = document.getElementById(containerId);
    this.timerInterval = null;
    this.quoteInterval = null;
    this.targetDate = null;
    this.activeEventTitle = '';
    this.quotes = [
      'Contando cada segundo para volver a verte sonreír 🌻',
      'El tiempo se hace eterno cuando no estás, y vuela cuando estamos juntos ✨',
      'Tengo mil cosas que contarte y más ganas de abrazarte 💖',
      'Cada segundo que pasa es un segundo más cerca de nuestro momento 🥰',
      '¡Prometo que esta salida será inolvidable! 🥂'
    ];
    this.currentQuoteIndex = 0;
    this.init();
  }

  init() {
    this.calculateNextDate();
    this.render();
    this.start();
  }

  calculateNextDate() {
    const events = getEvents();
    const now = new Date().getTime();

    // Buscar el evento futuro más cercano
    const futureEvents = events
      .map(e => {
        const dateTimeStr = `${e.date}T${e.time || '19:00'}:00`;
        const time = new Date(dateTimeStr).getTime();
        return { ...e, timestamp: isNaN(time) ? now + 86400000 * 3 : time };
      })
      .filter(e => e.timestamp > now)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (futureEvents.length > 0) {
      this.targetDate = futureEvents[0].timestamp;
      this.activeEventTitle = futureEvents[0].title;
    } else {
      // Si ambos ya pasaron o no hay futuros, poner por defecto 5 días adelante
      this.targetDate = now + 86400000 * 5;
      this.activeEventTitle = 'Nuestra Próxima Cita Mágica 🌻';
    }
  }

  setCustomTarget(dateTimeStr, title) {
    const time = new Date(dateTimeStr).getTime();
    if (!isNaN(time)) {
      this.targetDate = time;
      if (title) this.activeEventTitle = title;
      this.updateDisplay();
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="countdown-card glass-panel">
        <div class="countdown-header">
          <div class="badge-mini">
            <span class="pulse-dot"></span>
            <span>TIEMPO PARA NUESTRA CITA</span>
          </div>
          <h2 id="countdown-event-title" class="countdown-title">${this.activeEventTitle}</h2>
          <p id="countdown-quote" class="countdown-quote">"${this.quotes[0]}"</p>
        </div>

        <div class="countdown-grid" id="countdown-grid">
          <div class="countdown-box">
            <span class="countdown-number" id="cd-days">00</span>
            <span class="countdown-label">DÍAS</span>
          </div>
          <div class="countdown-separator">:</div>
          <div class="countdown-box">
            <span class="countdown-number" id="cd-hours">00</span>
            <span class="countdown-label">HORAS</span>
          </div>
          <div class="countdown-separator">:</div>
          <div class="countdown-box">
            <span class="countdown-number" id="cd-minutes">00</span>
            <span class="countdown-label">MINUTOS</span>
          </div>
          <div class="countdown-separator">:</div>
          <div class="countdown-box pulse-box">
            <span class="countdown-number" id="cd-seconds">00</span>
            <span class="countdown-label">SEGUNDOS</span>
          </div>
        </div>

        <div class="countdown-footer">
          <button id="btn-edit-date" class="btn-ghost-sm" title="Ajustar fecha de la cita">
            <span>📅 Ajustar fecha u hora</span>
          </button>
          <div id="countdown-status" class="countdown-status-text">
            <span>✨ Cuenta regresiva en tiempo real</span>
          </div>
        </div>
      </div>
    `;

    // Event listener para ajustar fecha
    const editBtn = this.container.querySelector('#btn-edit-date');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        sounds.playPop();
        this.openDatePickerModal();
      });
    }
  }

  start() {
    this.updateDisplay();
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.updateDisplay(), 1000);

    // Rotar frases románticas
    clearInterval(this.quoteInterval);
    this.quoteInterval = setInterval(() => {
      this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.quotes.length;
      const quoteEl = document.getElementById('countdown-quote');
      if (quoteEl) {
        quoteEl.style.opacity = '0';
        setTimeout(() => {
          quoteEl.textContent = `"${this.quotes[this.currentQuoteIndex]}"`;
          quoteEl.style.opacity = '1';
        }, 300);
      }
    }, 6000);
  }

  updateDisplay() {
    const now = new Date().getTime();
    const distance = (this.targetDate || now) - now;

    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minutesEl = document.getElementById('cd-minutes');
    const secondsEl = document.getElementById('cd-seconds');
    const statusEl = document.getElementById('countdown-status');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    if (distance <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      if (statusEl) {
        statusEl.innerHTML = '<span class="arrived-pulse">🎉 ¡Llegó el día de nuestra cita! A disfrutar cada momento 💖</span>';
      }
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  openDatePickerModal() {
    const modal = document.getElementById('modal-edit-date');
    if (modal) {
      const dateInput = document.getElementById('edit-target-datetime');
      if (dateInput && this.targetDate) {
        const d = new Date(this.targetDate);
        // Formato local YYYY-MM-DDTHH:MM
        const pad = (n) => String(n).padStart(2, '0');
        dateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
    }
  }

  destroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.quoteInterval);
  }
}
