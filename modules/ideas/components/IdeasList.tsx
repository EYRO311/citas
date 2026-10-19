'use client';

import { useIdeas } from '../hooks/useIdeas';
import { isImageUrl, isSafeUrl, linkLabel } from '../domain/links';
import { Icon } from '@/shared/icons/Icon';

export default function IdeasList() {
  const { ideas, connected, loading, refresh } = useIdeas();

  return (
    <div id="ideas-container">
      <h2 className="section-title">
        Nuestra Lista de Planes <Icon name="sparkle" className="ui-icon-gold" />
      </h2>
      <p className="section-subtitle">
        Ideas que quiero que hagamos juntos, inspiradas en cosas que vi por ahí y me recordaron a ti.
      </p>

      {ideas.length > 0 && (
        <div className={`drive-badge ${connected ? 'drive-connected' : 'drive-local'}`} onClick={refresh} style={{ margin: '0 auto 20px' }}>
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

      {ideas.length === 0 ? (
        <div className="empty-gallery-card glass-panel">
          <span className="empty-icon">
            <Icon name="sparkle" className="ui-icon-gold ui-icon-xl" />
          </span>
          <h3>Aún no hay planes en la lista</h3>
          <p>Pronto iré añadiendo ideas de cosas que quiero que hagamos juntos.</p>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
