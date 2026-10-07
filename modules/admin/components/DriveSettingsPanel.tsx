'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchCloudMemories, fetchDriveStatus, uploadMemoryToCloud } from '@/modules/gallery/data/memoriesApiClient';
import type { DriveStatusResponse } from '@/types/drive';
import { CODE_GS_CONTENT } from '../codeGs';
import { Icon } from '@/shared/icons/Icon';

const FALLBACK_IMG = '/img/fondo.jpg';

export default function DriveSettingsPanel({ onShowToast }: { onShowToast: (msg: string) => void }) {
  const [status, setStatus] = useState<DriveStatusResponse>({ connected: false, mode: 'local', memories: [] });
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; color: string } | null>(null);
  const testFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWebhookUrl((localStorage.getItem('propuesta_drive_webhook_url') || '').trim());
    setFolderId((localStorage.getItem('propuesta_drive_folder_id') || '').trim());
    checkStatus();
  }, []);

  async function checkStatus(showToast = false) {
    setChecking(true);
    const [driveData, memoriesData] = await Promise.all([fetchDriveStatus(), fetchCloudMemories()]);
    setStatus(driveData);
    setSupabaseConnected(memoriesData.connected);
    setChecking(false);
    if (showToast) {
      onShowToast(
        memoriesData.connected
          ? `¡Fotos guardándose en la nube (Supabase)! ${memoriesData.memories.length} recuerdos encontrados.`
          : driveData.connected
            ? `¡Conexión con Drive verificada! ${driveData.memories.length} fotos encontradas.`
            : 'Operando en modo local (sin nube conectada).'
      );
    }
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    let folderVal = folderId.trim();
    const folderMatch = folderVal.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) folderVal = folderMatch[1];

    if (webhookUrl.trim()) {
      localStorage.setItem('propuesta_drive_webhook_url', webhookUrl.trim());
    } else {
      localStorage.removeItem('propuesta_drive_webhook_url');
    }
    if (folderVal) {
      localStorage.setItem('propuesta_drive_folder_id', folderVal);
      setFolderId(folderVal);
    } else {
      localStorage.removeItem('propuesta_drive_folder_id');
    }

    onShowToast('Configuración de Google Drive guardada 💾');
    checkStatus(true);
  }

  function handleClearDrive() {
    if (!confirm('¿Deseas desconectar Google Drive? La app volverá al modo de álbum local.')) return;
    localStorage.removeItem('propuesta_drive_webhook_url');
    localStorage.removeItem('propuesta_drive_folder_id');
    setWebhookUrl('');
    setFolderId('');
    onShowToast('Google Drive desconectado. Modo local activo.');
    checkStatus(true);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(CODE_GS_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
      onShowToast('¡Código copiado al portapapeles! 📋✨');
    } catch {
      alert('No se pudo copiar automáticamente. Por favor selecciónalo desde la vista previa de abajo.');
    }
  }

  async function handleTestUpload(file: File) {
    setTestStatus({ text: '⏳ Subiendo foto de prueba a Drive...', color: '#2563eb' });
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const data = await uploadMemoryToCloud({
          images: [{ base64, mimeType: file.type || 'image/jpeg', name: file.name }],
          coverIndex: 0,
          title: 'Foto de prueba admin',
          date: new Date().toISOString().split('T')[0],
          location: 'Panel Admin',
          caption: 'Prueba de sincronización desde el panel de creador',
          webhookUrl: localStorage.getItem('propuesta_drive_webhook_url') || undefined,
          folderId: localStorage.getItem('propuesta_drive_folder_id') || undefined,
        });

        setTestStatus({
          text: data.mode === 'supabase' ? '✅ ¡Foto subida exitosamente a Supabase!' : '✅ ¡Foto subida exitosamente a Google Drive!',
          color: '#16a34a',
        });
        onShowToast(data.mode === 'supabase' ? '¡Foto de prueba subida a Supabase! ✨' : '¡Foto de prueba subida a Google Drive! ✨');
        setTimeout(() => checkStatus(false), 800);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setTestStatus({ text: `❌ Error: ${(err as Error).message}`, color: '#dc2626' });
    }
  }

  const cloudConnected = supabaseConnected || status.connected;
  const bannerClass = checking
    ? 'drive-status-box'
    : cloudConnected
      ? 'drive-status-box drive-status-connected'
      : 'drive-status-box drive-status-local';

  return (
    <div id="section-drive-container" className="admin-tab-section">
      <div className="admin-drive-grid">
        <div className="glass-panel admin-drive-card">
          <div className="admin-form-header">
            <div className="header-icon">
              <Icon name="cloud" className="ui-icon-lg ui-icon-blue" />
            </div>
            <div>
              <h2 className="admin-section-title">Conexión con Google Drive</h2>
              <p className="admin-section-subtitle">Sincroniza las fotos de sus salidas en una carpeta compartida</p>
            </div>
          </div>

          <div className={bannerClass}>
            <div className="status-header-row">
              <div className="status-indicator-wrap">
                <span className={`status-dot ${checking ? 'yellow' : cloudConnected ? 'green' : 'yellow'}`}></span>
                <strong>
                  {checking
                    ? 'Verificando conexión con la nube...'
                    : supabaseConnected
                      ? '¡Fotos Guardándose en la Nube (Supabase)! ☁️✨'
                      : status.connected
                        ? '¡Google Drive Conectado y Sincronizado! ☁️✨'
                        : 'Álbum en Modo Local (Sin Nube)'}
                </strong>
              </div>
              <span className="status-badge-public">
                {checking ? '...' : supabaseConnected ? 'Modo supabase' : status.connected ? `Modo ${status.mode}` : 'Sin nube conectada'}
              </span>
            </div>
            <p className="status-detail-text">
              {supabaseConnected
                ? 'Las fotos que suban se guardan automáticamente en Supabase, sin necesidad de configurar Google Drive. Lo de abajo es opcional, solo si además quieres respaldarlas en una carpeta de Drive.'
                : status.connected
                  ? `Conexión exitosa. Se detectaron ${status.memories.length} fotos en tu carpeta de Drive listas para el álbum.`
                  : status.message ||
                    'Las fotos se guardan en el navegador. Sigue los pasos de la derecha para conectar tu carpeta de Google Drive.'}
            </p>
            {!checking && !cloudConnected && status.error && (
              <p className="status-detail-text" style={{ color: '#b91c1c', fontWeight: 600, marginTop: 6 }}>
                Detalle del error: {status.error}
              </p>
            )}
            <div className="status-actions-row">
              <button type="button" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.88rem' }} onClick={() => checkStatus(true)}>
                <span>
                  <Icon name="bolt" className="ui-icon-white" /> Probar Conexión Ahora
                </span>
              </button>
              {folderId && (
                <a href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noopener noreferrer" className="btn-ghost-sm">
                  <span>Abrir Carpeta en Drive</span>
                </a>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="drive-settings-form" style={{ marginTop: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="drive-webhook-input">
                <span>URL de la App Web (Webhook de Google Apps Script)</span>
                <span className="label-hint">(Recomendado)</span>
              </label>
              <input
                type="url"
                id="drive-webhook-input"
                className="form-input"
                placeholder="https://script.google.com/macros/s/.../exec"
                autoComplete="off"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="field-help-text">
                Pega la URL terminada en <code>/exec</code> generada al desplegar el script de la derecha.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="drive-folder-input">
                <span>ID o Enlace de la Carpeta de Google Drive (Opcional)</span>
              </label>
              <input
                type="text"
                id="drive-folder-input"
                className="form-input"
                placeholder="Ej: 1A2b3C4d5E... o el enlace completo de la carpeta"
                autoComplete="off"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              />
              <p className="field-help-text">Sirve para abrir la carpeta directamente desde el panel o como respaldo de lectura pública.</p>
            </div>

            <div className="form-actions-group">
              <button type="submit" className="btn-primary">
                <span>
                  <Icon name="save" className="ui-icon-white" /> Guardar y Conectar
                </span>
              </button>
              <button type="button" className="btn-ghost-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={handleClearDrive}>
                <span>
                  <Icon name="disconnect" className="ui-icon-rose" /> Desconectar
                </span>
              </button>
            </div>
          </form>

          <div className="drive-test-upload-card" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1rem', color: '#1e3a8a', marginBottom: 6 }}>
              <Icon name="camera" className="ui-icon-blue" /> Probar subida a Google Drive
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
              Sube una foto de prueba para verificar que se guarde en tu carpeta de Drive.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={testFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleTestUpload(e.target.files[0]);
                }}
              />
              <button type="button" className="btn-ghost-sm" onClick={() => testFileInputRef.current?.click()}>
                <span>Seleccionar foto de prueba</span>
              </button>
              {testStatus && <span style={{ fontSize: '0.85rem', color: testStatus.color }}>{testStatus.text}</span>}
            </div>
          </div>
        </div>

        <div className="glass-panel admin-drive-card">
          <div className="admin-form-header">
            <div className="header-icon">📖</div>
            <div>
              <h2 className="admin-section-title">Instrucciones de Conexión (5 minutos)</h2>
              <p className="admin-section-subtitle">Sin configuraciones difíciles de Google Cloud</p>
            </div>
          </div>

          <div className="drive-guide-steps">
            <div className="guide-step">
              <div className="step-num">1</div>
              <div className="step-content">
                <strong>Crea la carpeta en Google Drive</strong>
                <p>
                  Crea una carpeta llamada <em>&quot;Nuestras Salidas&quot;</em> en{' '}
                  <a href="https://drive.google.com" target="_blank" rel="noopener">
                    drive.google.com
                  </a>
                  . Clic derecho en ella → <em>Compartir</em> → cambia el acceso general a{' '}
                  <strong>&quot;Cualquier persona con el enlace · Lector&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="guide-step">
              <div className="step-num">2</div>
              <div className="step-content">
                <strong>Crea el proyecto en Google Apps Script</strong>
                <p>
                  Entra a{' '}
                  <a href="https://script.google.com/home/start" target="_blank" rel="noopener">
                    script.google.com
                  </a>{' '}
                  y haz clic en <em>&quot;Nuevo proyecto&quot;</em>. Borra lo que tenga y pega el código de abajo.
                </p>
              </div>
            </div>

            <div className="guide-step">
              <div className="step-num">3</div>
              <div className="step-content">
                <strong>Coloca el ID de tu carpeta en el código</strong>
                <p>
                  En la línea <code>const FOLDER_ID = &apos;...&apos;;</code>, pega el ID de tu carpeta de Drive (lo
                  que va después de <code>/folders/</code> en la URL).
                </p>
              </div>
            </div>

            <div className="guide-step">
              <div className="step-num">4</div>
              <div className="step-content">
                <strong>Implementa como App Web</strong>
                <p>
                  Arriba a la derecha pulsa <em>Implementar → Nueva implementación</em>. Selecciona{' '}
                  <strong>App web</strong> (ícono engranaje) con estos ajustes:
                </p>
                <ul className="guide-sublist">
                  <li>
                    <strong>Ejecutar como:</strong> Yo (tu cuenta)
                  </li>
                  <li>
                    <strong>Quién tiene acceso:</strong> Cualquier persona
                  </li>
                </ul>
                <p style={{ marginTop: 4 }}>
                  Pulsa <em>Implementar</em>, autoriza los permisos y copia la URL terminada en <code>/exec</code>.
                </p>
              </div>
            </div>

            <div className="guide-step">
              <div className="step-num">5</div>
              <div className="step-content">
                <strong>Pégala en el campo de la izquierda</strong>
                <p>
                  Pega la URL en el formulario de la izquierda y haz clic en <strong>Guardar y Conectar</strong>.
                  ¡Listo! Cualquier foto que se suba aparecerá en el álbum.
                </p>
              </div>
            </div>
          </div>

          <div className="code-action-box" style={{ marginTop: 20 }}>
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={handleCopyCode}>
              <span>📋 Copiar Código de Code.gs al Portapapeles</span>
            </button>
            {copied && (
              <p className="copy-feedback-msg" style={{ color: '#16a34a', fontWeight: 600, textAlign: 'center', marginTop: 8 }}>
                ¡Código copiado con éxito! Ahora pégalo en script.google.com ✨
              </p>
            )}
          </div>

          <details className="code-details-fold" style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1e40af', fontSize: '0.9rem' }}>
              👁️ Ver código completo de Google Apps Script (Code.gs)
            </summary>
            <pre className="code-block-preview">{CODE_GS_CONTENT}</pre>
          </details>
        </div>
      </div>

      <div className="glass-panel admin-drive-photos-card" style={{ marginTop: 24, padding: 24, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 className="admin-section-title" style={{ fontSize: '1.2rem' }}>
              Fotos Detectadas en Google Drive
            </h3>
            <p className="admin-section-subtitle">Estas son las fotos que Adi y tú pueden ver actualmente en el álbum</p>
          </div>
          <span className="badge-event">{status.memories.length} fotos encontradas</span>
        </div>
        <div className="admin-drive-gallery-grid">
          {status.memories.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>📷</span>
              <p style={{ fontWeight: 600 }}>No hay fotos sincronizadas de Google Drive por el momento</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Las fotos que subas a la carpeta de Drive o mediante el formulario aparecerán aquí.</p>
            </div>
          ) : (
            status.memories.map((m) => (
              <div key={m.id} className="admin-drive-photo-item">
                <img
                  src={m.thumbUrl || m.imageUrl || FALLBACK_IMG}
                  alt={m.title || 'Foto de recuerdo'}
                  className="admin-drive-photo-thumb"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                />
                <div className="admin-drive-photo-info">
                  <div className="admin-drive-photo-title" title={m.title}>
                    {m.title}
                  </div>
                  <div className="admin-drive-photo-meta">
                    <span>{m.date || 'Sin fecha'}</span>
                    {m.driveUrl && (
                      <a href={m.driveUrl} target="_blank" rel="noopener" className="admin-drive-photo-link">
                        Ver en Drive ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
