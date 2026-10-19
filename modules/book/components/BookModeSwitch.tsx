'use client';

import { Icon } from '@/shared/icons/Icon';
import './book.css';

// Botón redondo (solo ícono) para cambiar entre la vista normal y el libro.
export default function BookModeSwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  const label = checked ? 'Salir del modo libro' : 'Ver como libro';
  return (
    <button
      type="button"
      className={`book-switch ${checked ? 'is-on' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
    >
      <Icon name="book" />
    </button>
  );
}
