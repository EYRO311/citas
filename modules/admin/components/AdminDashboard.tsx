'use client';

import { useEffect, useRef, useState } from 'react';
import { useEvents } from '@/modules/events/hooks/useEvents';
import PetalsCanvas from '@/modules/petals/components/PetalsCanvas';
import { Icon } from '@/shared/icons/Icon';
import PinLock from './PinLock';
import EventEditorForm from './EventEditorForm';
import EventsAdminList from './EventsAdminList';
import DriveSettingsPanel from './DriveSettingsPanel';
import LetterEditorForm from './LetterEditorForm';
import ChangePinModal, { ChangePinModalHandle } from './ChangePinModal';

type Tab = 'events' | 'letter' | 'drive';

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [tab, setTab] = useState<Tab>('events');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const changePinRef = useRef<ChangePinModalHandle>(null);
  const { events, refresh } = useEvents();

  useEffect(() => {
    setAuthenticated(sessionStorage.getItem('admin_authenticated') === 'true');
    setCheckedAuth(true);
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_authenticated');
    setAuthenticated(false);
  }

  function handleUnlock() {
    sessionStorage.setItem('admin_authenticated', 'true');
    setAuthenticated(true);
  }

  const editingEvent = editingEventId !== null ? events.find((e) => e.id === editingEventId) || null : null;

  return (
    <>
      <div className="background-wrapper" aria-hidden="true">
        <div className="bg-painting-layer"></div>
        <div className="bg-vignette-overlay"></div>
        <div className="bg-radial-glow"></div>
      </div>
      <PetalsCanvas />

      {checkedAuth && !authenticated && <PinLock onUnlock={handleUnlock} />}

      {checkedAuth && authenticated && (
        <main className="admin-container">
          <header className="admin-topbar glass-panel">
            <div className="topbar-left">
              <a href="/" className="btn-ghost-sm topbar-back-btn" title="Volver a la vista principal de la propuesta">
                <span>← Volver a la Invitación</span>
              </a>
            </div>
            <div className="topbar-center">
              <h1 className="admin-brand-title">Gestión de Citas & Sorpresas</h1>
              <p className="admin-brand-subtitle">Planifica momentos mágicos y citas secretas para Adi (A + E)</p>
            </div>
            <div className="topbar-right">
              <button type="button" className="btn-ghost-sm" title="Cambiar tu PIN de seguridad" onClick={() => changePinRef.current?.open()}>
                <span>
                  <Icon name="key" className="ui-icon-amber" /> Cambiar PIN
                </span>
              </button>
              <button type="button" className="btn-ghost-sm" title="Cerrar sesión de creador" onClick={handleLogout}>
                <span>
                  <Icon name="lock" className="ui-icon-blue" /> Bloquear
                </span>
              </button>
            </div>
          </header>

          <nav className="admin-nav-tabs glass-panel" aria-label="Secciones del panel de administración">
            <button type="button" className={`admin-nav-btn ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
              <span>
                <Icon name="calendar" className="ui-icon-blue" /> Citas & Eventos Ocultos
              </span>
            </button>
            <button type="button" className={`admin-nav-btn ${tab === 'letter' ? 'active' : ''}`} onClick={() => setTab('letter')}>
              <span>
                <Icon name="envelope" className="ui-icon-blue" /> Carta para Adi
              </span>
            </button>
            <button type="button" className={`admin-nav-btn ${tab === 'drive' ? 'active' : ''}`} onClick={() => setTab('drive')}>
              <span>
                <Icon name="cloud" className="ui-icon-blue" /> Conectar Google Drive
              </span>
            </button>
          </nav>

          {tab === 'events' && (
            <div className="admin-tab-section">
              <div className="admin-workspace-grid">
                <EventEditorForm editingEvent={editingEvent} onCancelEdit={() => setEditingEventId(null)} onSaved={showToast} />
                <EventsAdminList
                  events={events}
                  onEdit={setEditingEventId}
                  refresh={refresh}
                  onShowToast={showToast}
                  driveLabel="Ver estado"
                  onDriveClick={() => setTab('drive')}
                />
              </div>
            </div>
          )}

          {tab === 'letter' && (
            <div className="admin-tab-section">
              <LetterEditorForm onShowToast={showToast} />
            </div>
          )}

          {tab === 'drive' && <DriveSettingsPanel onShowToast={showToast} />}

          <footer className="romantic-footer" style={{ marginTop: 40 }}>
            <p>
              Panel secreto de <strong>Eyro</strong> para <strong>Adi</strong> (A + E) 🌻✨
            </p>
            <div style={{ marginTop: 8 }}>
              <a href="/" className="btn-ghost-sm">
                Ver la invitación como la ve Adi 💌
              </a>
            </div>
          </footer>
        </main>
      )}

      <ChangePinModal ref={changePinRef} />

      {toast && <div className="admin-toast-banner show">{toast}</div>}
    </>
  );
}
