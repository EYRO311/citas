'use client';

import { useEffect, useState } from 'react';
import type { LetterContent } from '@/types/letter';
import { DEFAULT_LETTER } from '@/modules/hero/data/letterRepository';
import { loadLetter, persistLetter, resetLetterEverywhere } from '@/modules/hero/data/letterService';
import { Icon } from '@/shared/icons/Icon';

export default function LetterEditorForm({ onShowToast }: { onShowToast: (message: string) => void }) {
  const [form, setForm] = useState<LetterContent>(DEFAULT_LETTER);

  useEffect(() => {
    loadLetter().then((result) => setForm(result.letter));
  }, []);

  function set<K extends keyof LetterContent>(key: K, value: LetterContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await persistLetter(form);
    onShowToast('¡Carta actualizada exitosamente! 💌');
  }

  async function handleReset() {
    const letter = await resetLetterEverywhere();
    setForm(letter);
    onShowToast('Carta restaurada al texto original 🌻');
  }

  return (
    <section className="admin-form-section">
      <div className="glass-panel admin-form-card">
        <div className="admin-form-header">
          <div className="header-icon">
            <Icon name="envelope" className="ui-icon-lg ui-icon-gold" />
          </div>
          <div>
            <h2 className="admin-section-title">Editar la Carta para Adi</h2>
            <p className="admin-section-subtitle">Cambia el texto que Adi leerá al abrir el sobre</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-event-form">
          <div className="form-group">
            <label className="form-label" htmlFor="letter-peek">
              Saludo en el sobre cerrado
            </label>
            <input
              type="text"
              id="letter-peek"
              className="form-input"
              placeholder="Ej: Para mi niña hermosa, Adi"
              value={form.peekSalutation}
              onChange={(e) => set('peekSalutation', e.target.value)}
            />
            <p className="field-help-text">Es el texto pequeño que se asoma antes de abrir el sobre.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-greeting">
              Saludo principal *
            </label>
            <input
              type="text"
              id="letter-greeting"
              className="form-input"
              required
              value={form.greeting}
              onChange={(e) => set('greeting', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-body">
              Cuerpo de la carta *
            </label>
            <textarea
              id="letter-body"
              className="form-textarea"
              rows={8}
              required
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
            />
            <p className="field-help-text">Deja una línea en blanco entre párrafos para separarlos.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-question">
              Pregunta final *
            </label>
            <input
              type="text"
              id="letter-question"
              className="form-input"
              required
              value={form.question}
              onChange={(e) => set('question', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="letter-ps-label">
                Etiqueta de posdata
              </label>
              <input
                type="text"
                id="letter-ps-label"
                className="form-input"
                placeholder="Ej: P.D."
                value={form.psLabel}
                onChange={(e) => set('psLabel', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="letter-sign-name">
                Firma *
              </label>
              <input
                type="text"
                id="letter-sign-name"
                className="form-input"
                required
                value={form.signName}
                onChange={(e) => set('signName', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-ps-text">
              Texto de la posdata
            </label>
            <textarea
              id="letter-ps-text"
              className="form-textarea"
              rows={2}
              value={form.psText}
              onChange={(e) => set('psText', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-sign-intro">
              Frase antes de la firma
            </label>
            <input
              type="text"
              id="letter-sign-intro"
              className="form-input"
              placeholder="Ej: Siempre tuyo,"
              value={form.signIntro}
              onChange={(e) => set('signIntro', e.target.value)}
            />
          </div>

          <div className="form-actions-group">
            <button type="submit" className="btn-primary">
              <span>
                <Icon name="save" className="ui-icon-white" /> Guardar Carta
              </span>
            </button>
            <button type="button" className="btn-ghost-sm" onClick={handleReset}>
              <span>
                <Icon name="undo" className="ui-icon-blue" /> Restaurar texto original
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
