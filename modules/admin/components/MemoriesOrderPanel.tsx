'use client';

import type { Memory, MemoriesSortMode } from '@/types/memories';
import { useMemories } from '@/modules/gallery/hooks/useMemories';
import { useMemoriesSettings } from '@/modules/gallery/hooks/useMemoriesSettings';
import { memoryKey, sortMemories } from '@/modules/gallery/domain/sortMemories';
import { Icon } from '@/shared/icons/Icon';

const FALLBACK_IMG = '/img/fondo.jpg';

const SORT_OPTIONS: { mode: MemoriesSortMode; label: string; hint: string }[] = [
  { mode: 'date', label: 'Por fecha', hint: 'De la fecha más antigua a la más reciente' },
  { mode: 'manual', label: 'Orden manual', hint: 'El orden que acomodes aquí abajo' },
  { mode: 'created', label: 'Fecha de creación', hint: 'En el orden en que se subieron' },
];

function thumbOf(memory: Memory): string {
  return ('imageBase64' in memory && memory.imageBase64) || ('thumbUrl' in memory && memory.thumbUrl) || memory.imageUrl || FALLBACK_IMG;
}

export default function MemoriesOrderPanel({ onShowToast }: { onShowToast: (msg: string) => void }) {
  const { memories } = useMemories();
  const { settings, update, loading } = useMemoriesSettings();

  const ordered = sortMemories(memories, settings);
  const unmovable = ordered.filter((m) => !memoryKey(m));
  const movable = ordered.filter((m) => memoryKey(m));

  async function chooseMode(mode: MemoriesSortMode) {
    if (mode === settings.sortMode) return;
    const manualOrder = mode === 'manual' && settings.manualOrder.length === 0 ? movable.map((m) => memoryKey(m) as string) : settings.manualOrder;
    await update({ sortMode: mode, manualOrder });
    onShowToast('Orden del libro actualizado 📖');
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= movable.length) return;
    const keys = movable.map((m) => memoryKey(m) as string);
    [keys[index], keys[target]] = [keys[target], keys[index]];
    await update({ sortMode: 'manual', manualOrder: keys });
  }

  if (loading) return null;

  return (
    <div className="glass-panel admin-form-card" style={{ marginBottom: 20 }}>
      <div className="admin-form-header">
        <div className="header-icon">
          <Icon name="book" className="ui-icon-lg ui-icon-gold" />
        </div>
        <div>
          <h2 className="admin-section-title">Orden de los recuerdos en el libro</h2>
          <p className="admin-section-subtitle">Elige cómo se van a ir pegando las páginas del álbum dentro del libro.</p>
        </div>
      </div>

      <div className="form-actions-group" role="radiogroup" aria-label="Orden de los recuerdos" style={{ flexWrap: 'wrap' }}>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={settings.sortMode === opt.mode}
            className={settings.sortMode === opt.mode ? 'btn-primary' : 'btn-ghost-sm'}
            onClick={() => chooseMode(opt.mode)}
            title={opt.hint}
            style={{ width: 'auto' }}
          >
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {settings.sortMode === 'manual' && (
        <div className="admin-cards-grid" style={{ marginTop: 16 }}>
          {movable.length === 0 ? (
            <p className="admin-section-subtitle">Aún no hay recuerdos para ordenar.</p>
          ) : (
            movable.map((memory, i) => (
              <div key={memoryKey(memory)} className="admin-event-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={thumbOf(memory)}
                  alt=""
                  loading="lazy"
                  style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="admin-card-title" style={{ margin: 0 }}>
                    {memory.title || 'Recuerdo de nuestra salida'}
                  </h3>
                  <p className="admin-card-desc" style={{ margin: 0 }}>
                    {memory.date || 'sin fecha'}
                  </p>
                </div>
                <div className="admin-card-actions" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn-action-icon"
                    disabled={i === 0}
                    aria-label={`Mover "${memory.title}" antes`}
                    onClick={() => move(i, -1)}
                  >
                    <Icon name="arrowUp" className="ui-icon-blue" />
                  </button>
                  <button
                    type="button"
                    className="btn-action-icon"
                    disabled={i === movable.length - 1}
                    aria-label={`Mover "${memory.title}" después`}
                    onClick={() => move(i, 1)}
                  >
                    <Icon name="arrowDown" className="ui-icon-blue" />
                  </button>
                </div>
              </div>
            ))
          )}
          {unmovable.length > 0 && (
            <p className="admin-section-subtitle">
              {unmovable.length === 1 ? 'Hay 1 recuerdo' : `Hay ${unmovable.length} recuerdos`} que aún se está(n) sincronizando con la nube; cuando
              termine podrás acomodarlo(s) aquí.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
