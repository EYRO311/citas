'use client';

import { useState } from 'react';
import type { IdeaItem } from '@/types/ideas';
import { createIdea, editIdea, removeIdea } from '@/modules/ideas/data/ideasService';
import { useIdeas } from '@/modules/ideas/hooks/useIdeas';
import { Icon } from '@/shared/icons/Icon';

const emptyForm = { title: '', link: '' };

export default function IdeasAdminPanel({ onShowToast }: { onShowToast: (msg: string) => void }) {
  const { ideas, connected, refresh } = useIdeas();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function startEdit(idea: IdeaItem) {
    setEditingId(idea.id);
    setForm({ title: idea.title, link: idea.link });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;

    setSubmitting(true);
    if (editingId !== null) {
      await editIdea(editingId, form);
      onShowToast('¡Plan actualizado! ✨');
    } else {
      await createIdea(form);
      onShowToast('¡Nuevo plan añadido a la lista! 💡');
    }
    setSubmitting(false);
    cancelEdit();
    refresh();
  }

  async function handleDelete(idea: IdeaItem) {
    if (!confirm(`¿Eliminar "${idea.title}" de la lista?`)) return;
    await removeIdea(idea.id);
    onShowToast('Plan eliminado de la lista 🗑️');
    refresh();
  }

  return (
    <div className="admin-workspace-grid">
      <section className="admin-form-section">
        <div className="glass-panel admin-form-card">
          <div className="admin-form-header">
            <div className="header-icon">
              <Icon name={editingId !== null ? 'edit' : 'sparkle'} className="ui-icon-lg ui-icon-gold" />
            </div>
            <div>
              <h2 className="admin-section-title">{editingId !== null ? 'Editar Plan' : 'Añadir Plan a la Lista'}</h2>
              <p className="admin-section-subtitle">Ideas de citas o actividades que quieres hacer juntos</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="idea-title">
                Título *
              </label>
              <input
                id="idea-title"
                className="form-input"
                placeholder="Ej: Ir a ese café que vimos en TikTok"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="idea-link">
                Link de TikTok o Instagram
              </label>
              <input
                id="idea-link"
                type="url"
                className="form-input"
                placeholder="https://www.tiktok.com/..."
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              />
            </div>

            <div className="form-actions-group">
              <button type="submit" className="btn-primary" disabled={submitting}>
                <span>
                  <Icon name="save" className="ui-icon-white" /> {submitting ? 'Guardando...' : editingId !== null ? 'Actualizar' : 'Añadir a la lista'}
                </span>
              </button>
              {editingId !== null && (
                <button type="button" className="btn-ghost-sm" onClick={cancelEdit}>
                  <span>Cancelar edición</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="admin-list-section">
        <div className="glass-panel admin-list-card">
          <div className="list-header-bar">
            <div>
              <h2 className="admin-section-title">Lista de Planes</h2>
              <p className="admin-section-subtitle">
                {ideas.length} {ideas.length === 1 ? 'plan guardado' : 'planes guardados'}
                {' · '}
                {connected ? 'Sincronizado en la nube ☁️' : 'Guardado solo en este navegador'}
              </p>
            </div>
          </div>

          <div className="admin-cards-grid">
            {ideas.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-icon">
                  <Icon name="sparkle" className="ui-icon-gold ui-icon-xl" />
                </div>
                <h3>Aún no hay planes</h3>
                <p>Usa el formulario para añadir ideas que quieras hacer juntos.</p>
              </div>
            ) : (
              ideas.map((idea) => (
                <div key={idea.id} className="admin-event-card">
                  <h3 className="admin-card-title">{idea.title}</h3>
                  {idea.link && (
                    <a
                      href={idea.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-card-desc"
                      style={{ display: 'inline-block', wordBreak: 'break-all' }}
                    >
                      {idea.link}
                    </a>
                  )}
                  <div className="admin-card-actions">
                    <button type="button" className="btn-action-icon btn-edit-event" onClick={() => startEdit(idea)}>
                      <span>
                        <Icon name="edit" className="ui-icon-blue" /> Editar
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-action-icon btn-action-delete btn-delete-event"
                      onClick={() => handleDelete(idea)}
                    >
                      <span>
                        <Icon name="trash" className="ui-icon-rose" /> Eliminar
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
