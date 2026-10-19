'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { IdeaItem } from '@/types/ideas';
import { Icon } from '@/shared/icons/Icon';
import { createIdea, editIdea } from '../data/ideasService';
import IdeaFormFields, { emptyIdeaForm, formToPayload, ideaToForm, IdeaFormValue } from './IdeaFormFields';

export interface IdeaEditorModalHandle {
  /** Sin idea abre el formulario vacío para añadir un plan nuevo. */
  open: (idea?: IdeaItem) => void;
}

const IdeaEditorModal = forwardRef<IdeaEditorModalHandle, { onSaved: () => void }>(function IdeaEditorModal(
  { onSaved },
  ref
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<IdeaFormValue>(emptyIdeaForm);
  const [submitting, setSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (idea) => {
      setEditingId(idea ? idea.id : null);
      setForm(idea ? ideaToForm(idea) : emptyIdeaForm);
      dialogRef.current?.showModal();
    },
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;

    setSubmitting(true);
    const payload = formToPayload(form);
    if (editingId !== null) await editIdea(editingId, payload);
    else await createIdea(payload);
    setSubmitting(false);
    dialogRef.current?.close();
    onSaved();
  }

  return (
    <dialog ref={dialogRef} id="modal-idea-editor">
      <div className="modal-card">
        <button type="button" className="modal-close-btn" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}>
          &times;
        </button>
        <div className="modal-header-styled">
          <h3 className="modal-title-styled">
            {editingId !== null ? 'Editar plan' : 'Añadir plan a la lista'} <Icon name="sparkle" className="ui-icon-gold" />
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Pon el link de donde lo viste (cualquier red) y, si quieres, una imagen.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <IdeaFormFields value={form} onChange={setForm} idPrefix="idea-modal" />
          <div className="form-actions-group">
            <button type="submit" className="btn-primary" disabled={submitting}>
              <span>
                <Icon name="save" className="ui-icon-white" />{' '}
                {submitting ? 'Guardando...' : editingId !== null ? 'Guardar cambios' : 'Añadir a la lista'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
});

export default IdeaEditorModal;
