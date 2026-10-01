'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { getAdminPIN, setAdminPIN } from '../domain/adminAuth';

export interface ChangePinModalHandle {
  open: () => void;
}

const ChangePinModal = forwardRef<ChangePinModalHandle>(function ChangePinModal(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({
    open: () => {
      setError('');
      dialogRef.current?.showModal();
    },
  }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const current = (form.elements.namedItem('current') as HTMLInputElement).value.trim();
    const next = (form.elements.namedItem('next') as HTMLInputElement).value.trim();
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value.trim();

    if (current !== getAdminPIN()) {
      setError('El PIN actual no es correcto.');
      return;
    }
    if (next.length < 4) {
      setError('El nuevo PIN debe tener al menos 4 caracteres.');
      return;
    }
    if (next !== confirm) {
      setError('La confirmación del PIN no coincide.');
      return;
    }

    setAdminPIN(next);
    alert('🎉 ¡PIN de seguridad actualizado con éxito!');
    dialogRef.current?.close();
  }

  return (
    <dialog ref={dialogRef} id="modal-change-pin">
      <div className="modal-card">
        <button className="modal-close-btn" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}>
          &times;
        </button>
        <div className="modal-header-styled">
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🔑</div>
          <h3 className="modal-title-styled">Cambiar PIN de Acceso</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Elige un nuevo código para mantener en secreto las sorpresas.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="pin-current">
              PIN actual
            </label>
            <input type="password" id="pin-current" name="current" className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pin-new">
              Nuevo PIN (mínimo 4 caracteres)
            </label>
            <input type="password" id="pin-new" name="next" className="form-input" minLength={4} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pin-confirm">
              Confirmar nuevo PIN
            </label>
            <input type="password" id="pin-confirm" name="confirm" className="form-input" minLength={4} required />
          </div>
          {error && <div className="pin-error-msg" style={{ marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            <span>Actualizar PIN 🔑</span>
          </button>
        </form>
      </div>
    </dialog>
  );
});

export default ChangePinModal;
