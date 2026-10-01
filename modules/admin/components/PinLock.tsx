'use client';

import { useRef, useState } from 'react';
import { getAdminPIN } from '../domain/adminAuth';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { sounds } from '@/shared/sounds';
import { Icon } from '@/shared/icons/Icon';

export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entered = pin.trim();
    const actual = getAdminPIN();

    if (entered === actual) {
      sounds.playCelebration();
      setError(false);
      setPin('');
      triggerGlobalBurst(window.innerWidth / 2, window.innerHeight / 2, 45);
      onUnlock();
    } else {
      sounds.playPop();
      setError(true);
      setPin('');
      inputRef.current?.focus();
    }
  }

  return (
    <div id="admin-pin-lock" className="admin-lock-overlay">
      <div className="glass-panel admin-lock-card">
        <div className="lock-icon-badge">
          <Icon name="lock" className="ui-icon-xl ui-icon-amber" />
        </div>
        <h2 className="admin-lock-title">Acceso de Creador</h2>
        <p className="admin-lock-desc">
          Ingresa tu PIN personal para gestionar las citas y preparar sorpresas secretas para Adi.
        </p>

        <form onSubmit={handleSubmit} className="admin-pin-form">
          <div className="pin-input-group">
            <input
              ref={inputRef}
              type="password"
              className="form-input pin-field"
              maxLength={8}
              placeholder="••••"
              autoComplete="current-password"
              autoFocus
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          {error && <div className="pin-error-msg">PIN incorrecto. Vuelve a intentarlo.</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            <span>
              <Icon name="key" className="ui-icon-white" /> Desbloquear panel
            </span>
          </button>
        </form>

        <div className="admin-lock-footer">
          <span className="pin-default-hint">
            PIN predeterminado: <strong>1234</strong>
          </span>
          <a href="/" className="admin-lock-return-link">
            ← Regresar a la invitación
          </a>
        </div>
      </div>
    </div>
  );
}
