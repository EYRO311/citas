'use client';

import { useRef } from 'react';
import type { IdeaItem } from '@/types/ideas';
import { useIdeas } from '../hooks/useIdeas';
import { removeIdea } from '../data/ideasService';
import { isImageUrl, isSafeUrl, linkLabel } from '../domain/links';
import { Icon } from '@/shared/icons/Icon';
import IdeaEditorModal, { IdeaEditorModalHandle } from './IdeaEditorModal';

export default function IdeasList() {
  const { ideas, connected, loading, refresh } = useIdeas();
  const editorRef = useRef<IdeaEditorModalHandle>(null);

  async function handleDelete(idea: IdeaItem) {
    if (!confirm(`¿Eliminar "${idea.title}" de la lista?`)) return;
    await removeIdea(idea.id);
    refresh();
  }

  return (
    <div id="ideas-container">
      <h2 className="section-title">
        Nuestra Lista de Planes <Icon name="sparkle" className="ui-icon-gold" />
      </h2>
      <p className="section-subtitle">
        Ideas que quiero que hagamos juntos, inspiradas en cosas que vi por ahí y me recordaron a ti.
      </p>

      <div className="ideas-actions-bar">
        {ideas.length > 0 && (
          <div className={`drive-badge ${connected ? 'drive-connected' : 'drive-local'}`} onClick={refresh}>
            {loading ? (
              <>
                <span className="status-dot yellow"></span>
                <span>Sincronizando...</span>
              </>
            ) : connected ? (
              <>
                <span className="status-dot green"></span>
                <span>
                  Lista en la nube <Icon name="cloud" className="ui-icon-blue" />
                </span>
              </>
            ) : (
              <>
                <span className="status-dot green"></span>
                <span>Lista guardada en este dispositivo</span>
              </>
            )}
          </div>
        )}
        <button type="button" className="btn-primary" onClick={() => editorRef.current?.open()}>
          <span>
            <Icon name="plus" className="ui-icon-white" /> Añadir plan
          </span>
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="empty-gallery-card glass-panel">
          <span className="empty-icon">
            <Icon name="sparkle" className="ui-icon-gold ui-icon-xl" />
          </span>
          <h3>Aún no hay planes en la lista</h3>
          <p>Toca &quot;Añadir plan&quot; para guardar ideas de cosas que queremos hacer juntos.</p>
        </div>
      ) : (
        <div className="memories-grid">
          {ideas.map((idea) => {
            const linkIsImage = isImageUrl(idea.link);
            const image = idea.image || (linkIsImage ? idea.link : '');
            return (
              <div key={idea.id} className="glass-panel idea-card">
                {image && (
                  <div className="idea-card-image">
                    <img
                      src={image}
                      alt={idea.title}
                      loading="lazy"
                      onError={(e) => {
                        if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="idea-card-body">
                  <h4 className="idea-card-title">{idea.title}</h4>
                  {isSafeUrl(idea.link) && !linkIsImage && (
                    <a href={idea.link} target="_blank" rel="noopener noreferrer" className="btn-calendar">
                      <Icon name="arrowRight" className="ui-icon-blue" /> {linkLabel(idea.link)}
                    </a>
                  )}
                  <div className="idea-card-actions">
                    <button type="button" className="btn-ghost-sm" onClick={() => editorRef.current?.open(idea)}>
                      <Icon name="edit" className="ui-icon-blue" /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={() => handleDelete(idea)}
                    >
                      <Icon name="trash" className="ui-icon-rose" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <IdeaEditorModal ref={editorRef} onSaved={refresh} />
    </div>
  );
}
