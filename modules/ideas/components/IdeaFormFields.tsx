'use client';

import { useRef } from 'react';
import type { IdeaImageUpload, IdeaItem, IdeaPayload } from '@/types/ideas';
import { compressImage } from '@/modules/gallery/domain/compressImage';
import { Icon } from '@/shared/icons/Icon';
import { isSafeUrl } from '../domain/links';

export interface IdeaFormValue {
  title: string;
  link: string;
  /** URL de imagen ya guardada o pegada a mano. */
  image: string;
  /** Imagen nueva elegida desde el dispositivo (tiene prioridad sobre `image`). */
  imageUpload?: IdeaImageUpload;
}

export const emptyIdeaForm: IdeaFormValue = { title: '', link: '', image: '' };

export function ideaToForm(idea: IdeaItem): IdeaFormValue {
  return { title: idea.title, link: idea.link || '', image: idea.image || '' };
}

export function formToPayload(form: IdeaFormValue): IdeaPayload {
  return form.imageUpload
    ? { title: form.title, link: form.link, imageUpload: form.imageUpload }
    : { title: form.title, link: form.link, image: form.image };
}

// Campos del plan (título, link, imagen) compartidos por la página y el panel admin
export default function IdeaFormFields({
  value,
  onChange,
  idPrefix,
}: {
  value: IdeaFormValue;
  onChange: (next: IdeaFormValue) => void;
  idPrefix: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preview = value.imageUpload?.base64 || (isSafeUrl(value.image) ? value.image : '');

  async function handleFile(file: File) {
    const result = await compressImage(file, 1280, 0.8);
    onChange({ ...value, image: '', imageUpload: { base64: result.dataUrl, mimeType: result.mimeType } });
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-title`}>
          Título *
        </label>
        <input
          id={`${idPrefix}-title`}
          className="form-input"
          placeholder="Ej: Ir a ese café que vimos en TikTok"
          required
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-link`}>
          Link (TikTok, Instagram, YouTube, Maps o cualquier página)
        </label>
        <input
          id={`${idPrefix}-link`}
          type="url"
          className="form-input"
          placeholder="https://..."
          value={value.link}
          onChange={(e) => onChange({ ...value, link: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-image`}>
          Imagen (opcional)
        </label>
        {preview ? (
          <div className="idea-image-preview">
            <img src={preview} alt="Imagen del plan" />
            <button
              type="button"
              className="cover-photo-remove"
              aria-label="Quitar imagen"
              onClick={() => onChange({ ...value, image: '', imageUpload: undefined })}
            >
              &times;
            </button>
          </div>
        ) : (
          <div className="idea-image-inputs">
            <button type="button" className="btn-ghost-sm" onClick={() => fileInputRef.current?.click()}>
              <Icon name="camera" className="ui-icon-blue" /> Subir imagen
            </button>
            <input
              id={`${idPrefix}-image`}
              type="url"
              className="form-input"
              placeholder="o pega el link de una imagen"
              value={value.image}
              onChange={(e) => onChange({ ...value, image: e.target.value, imageUpload: undefined })}
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </>
  );
}
