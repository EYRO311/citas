'use client';

import { useEffect, useState } from 'react';
import type { LetterContent, LetterMode } from '@/types/letter';
import { DEFAULT_LETTER, DEFAULT_POEM } from '@/modules/hero/data/letterRepository';
import { loadLetter, persistLetter, resetLetterEverywhere } from '@/modules/hero/data/letterService';
import { Icon } from '@/shared/icons/Icon';

export default function LetterEditorForm({ onShowToast }: { onShowToast: (message: string) => void }) {
  const [form, setForm] = useState<LetterContent>(DEFAULT_LETTER);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadLetter().then((result) => setForm(result.letter));
  }, []);

  function set<K extends keyof LetterContent>(key: K, value: LetterContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleModeChange(mode: LetterMode) {
    set('mode', mode);
  }

  function handleLoadPoemPreset() {
    setForm(DEFAULT_POEM);
    onShowToast('Poema romántico para Adi cargado ✨');
  }

  function handleLoadLetterPreset() {
    setForm(DEFAULT_LETTER);
    onShowToast('Carta romántica tradicional cargada 💌');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await persistLetter(form);
      onShowToast(
        form.mode === 'poem'
          ? '¡Poema guardado exitosamente en Supabase! 📜✨'
          : '¡Carta guardada exitosamente en Supabase! 💌✨'
      );
    } catch {
      onShowToast('Error al guardar en Supabase.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const letter = await resetLetterEverywhere();
    setForm(letter);
    onShowToast('Texto restaurado al original 🌻');
  }

  const isPoem = form.mode === 'poem';
  const previewStanzas = form.body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <section className="admin-form-section">
      <div className="glass-panel admin-form-card">
        <div className="admin-form-header">
          <div className="header-icon">
            <Icon name={isPoem ? 'sparkle' : 'envelope'} className="ui-icon-lg ui-icon-gold" />
          </div>
          <div>
            <h2 className="admin-section-title">
              {isPoem ? 'Editar el Poema para Adi 📜' : 'Editar la Carta para Adi 💌'}
            </h2>
            <p className="admin-section-subtitle">
              {isPoem
                ? 'Ajusta los versos y estrofas líricas que Adi leerá al abrir el sobre'
                : 'Cambia el texto epistolar que Adi leerá al abrir el sobre'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-event-form">
          {/* Selector de Modo: Carta vs Poema */}
          <div className="letter-mode-card">
            <div className="mode-selector-header">
              <span className="mode-selector-title">
                <Icon name={isPoem ? 'sparkle' : 'envelope'} className={isPoem ? 'ui-icon-amber' : 'ui-icon-blue'} />
                Formato de Lectura del Sobre:
              </span>
              <div className="letter-mode-tabs" role="tablist" aria-label="Seleccionar formato de la carta">
                <button
                  type="button"
                  className={`letter-mode-tab ${!isPoem ? 'active' : ''}`}
                  onClick={() => handleModeChange('letter')}
                >
                  <Icon name="envelope" className="ui-icon-sm" />
                  Carta Romántica
                </button>
                <button
                  type="button"
                  className={`letter-mode-tab ${isPoem ? 'active-poem' : ''}`}
                  onClick={() => handleModeChange('poem')}
                >
                  <Icon name="sparkle" className="ui-icon-sm" />
                  Poema de Amor
                </button>
              </div>
            </div>

            <div className="mode-desc-banner">
              <div>
                {isPoem ? (
                  <span>
                    📜 <strong>Modo Poema:</strong> Los versos se centran con métrica lírica en pantalla y las estrofas se separan con ornamentos dorados (❧).
                  </span>
                ) : (
                  <span>
                    💌 <strong>Modo Carta:</strong> Estilo epistolar clásico con párrafos amplios y letra capitular artística.
                  </span>
                )}
              </div>
              <div className="mode-actions-row">
                {isPoem ? (
                  <button type="button" className="btn-mode-preset poem-preset" onClick={handleLoadPoemPreset}>
                    <span>✨ Cargar poema de ejemplo para Adi</span>
                  </button>
                ) : (
                  <button type="button" className="btn-mode-preset" onClick={handleLoadLetterPreset}>
                    <span>💌 Cargar carta original</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-mode-preset"
                  onClick={() => setShowPreview(!showPreview)}
                  title="Previsualizar cómo se verá dentro del sobre"
                >
                  <span>
                    <Icon name="eye" className="ui-icon-blue" />
                    {showPreview ? 'Ocultar vista previa' : 'Vista previa en vivo'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Vista Previa Interactiva */}
          {showPreview && (
            <div className="letter-preview-box">
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', fontWeight: 700 }}>
                  — Vista Previa: {isPoem ? 'Poema de Amor' : 'Carta Romántica'} —
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', color: '#1d4ed8', fontSize: '1.4rem', marginTop: 6, fontStyle: isPoem ? 'italic' : 'normal' }}>
                  {form.greeting || (isPoem ? 'Título del Poema' : 'Para mi hermosa Adi,')}
                </h3>
              </div>

              {isPoem ? (
                <div className="letter-poem-body" style={{ margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.8 }}>
                  {previewStanzas.map((stanza, sIdx) => {
                    const verses = stanza.split('\n').filter((v) => v.trim().length > 0);
                    return (
                      <div key={sIdx} className="letter-poem-stanza" style={{ marginBottom: '1.2em' }}>
                        {verses.map((verse, vIdx) => (
                          <p key={vIdx} className="letter-poem-verse">
                            {verse.trim()}
                          </p>
                        ))}
                        {sIdx < previewStanzas.length - 1 && (
                          <div className="poem-stanza-divider" aria-hidden="true" style={{ margin: '0.8em 0' }}>
                            <span>❧</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="letter-body" style={{ fontSize: '1rem', lineHeight: 1.65 }}>
                  {previewStanzas.map((paragraph, index) => (
                    <p key={index} className={index === 0 ? 'letter-lead' : undefined}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {form.question && (
                <p className={`letter-question ${isPoem ? 'letter-poem-closing' : ''}`} style={{ margin: '18px auto', fontSize: '1.05rem' }}>
                  {form.question}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem', display: 'block' }}>
                    {form.signIntro}
                  </span>
                  <span style={{ fontFamily: 'var(--font-script)', fontSize: '2.4rem', color: '#1d4ed8', display: 'block', lineHeight: 1 }}>
                    {form.signName}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="letter-peek">
              Saludo en el sobre cerrado
            </label>
            <input
              type="text"
              id="letter-peek"
              className="form-input"
              placeholder={isPoem ? 'Ej: Un poema para mi niña hermosa, Adi' : 'Ej: Para mi niña hermosa, Adi'}
              value={form.peekSalutation}
              onChange={(e) => set('peekSalutation', e.target.value)}
            />
            <p className="field-help-text">Es el texto pequeño que se asoma antes de abrir el sobre.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-greeting">
              {isPoem ? 'Título del poema o dedicatoria inicial *' : 'Saludo principal *'}
            </label>
            <input
              type="text"
              id="letter-greeting"
              className="form-input"
              placeholder={isPoem ? 'Ej: Donde florece tu sonrisa' : 'Ej: Para mi hermosa Adi,'}
              required
              value={form.greeting}
              onChange={(e) => set('greeting', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-body">
              {isPoem ? 'Versos y estrofas del poema *' : 'Cuerpo de la carta *'}
            </label>
            <textarea
              id="letter-body"
              className="form-textarea"
              rows={isPoem ? 12 : 8}
              required
              placeholder={
                isPoem
                  ? 'Escribe cada verso en un renglón.\nDeja un renglón en blanco para separar cada estrofa.'
                  : 'Escribe tu mensaje en párrafos.'
              }
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
            />
            <p className="field-help-text">
              {isPoem
                ? '💡 En modo Poema: cada línea será un verso centrado. Deja una línea vacía entre estrofas.'
                : 'Deja una línea en blanco entre párrafos para separarlos.'}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="letter-question">
              {isPoem ? 'Verso de cierre, pensamiento final o pregunta *' : 'Pregunta final *'}
            </label>
            <input
              type="text"
              id="letter-question"
              className="form-input"
              required
              placeholder={
                isPoem
                  ? 'Ej: ¿Me regalas tu tiempo y tu risa para escribir juntos nuestras próximas historias?'
                  : 'Ej: ¿Me concederías el honor más bonito de acompañarme a estas dos aventuras?'
              }
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
              {isPoem ? 'Pensamiento o posdata poética' : 'Texto de la posdata'}
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
              placeholder="Ej: Siempre tuyo, / Con todo mi amor,"
              value={form.signIntro}
              onChange={(e) => set('signIntro', e.target.value)}
            />
          </div>

          <div className="form-actions-group">
            <button type="submit" className="btn-primary" disabled={saving}>
              <span>
                <Icon name="save" className="ui-icon-white" />
                {saving
                  ? 'Guardando...'
                  : isPoem
                  ? 'Guardar Poema para Adi'
                  : 'Guardar Carta para Adi'}
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
