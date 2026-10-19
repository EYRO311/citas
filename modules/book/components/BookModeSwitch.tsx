'use client';

import './book.css';

export default function BookModeSwitch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className={`book-switch ${checked ? 'is-on' : ''}`} htmlFor="book-mode-toggle" title="Cambiar entre la vista normal y el libro">
      <svg className="book-switch-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M18 2H8C6.34 2 5 3.34 5 5v14c0 1.66 1.34 3 3 3h11v-2H8c-.55 0-1-.45-1-1s.45-1 1-1h11V4c0-1.1-.9-2-2-2zm-1 10l-2.5-1.5L12 12V4h5v8z"
        />
      </svg>
      <span className="book-switch-label">Modo libro</span>
      <input
        id="book-mode-toggle"
        type="checkbox"
        role="switch"
        className="book-switch-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="book-switch-track" aria-hidden="true">
        <span className="book-switch-thumb" />
      </span>
    </label>
  );
}
