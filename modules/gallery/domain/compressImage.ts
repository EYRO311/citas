// Reduce la foto antes de subirla: las fotos del celular suelen pasar del
// límite de 4.5 MB por petición de Vercel. Si el navegador no puede leerla
// (p. ej. HEIC fuera de Safari), se envía tal cual.
export function compressImage(
  file: File,
  maxSide = 2000,
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string }> {
  const readRaw = () =>
    new Promise<{ dataUrl: string; mimeType: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ dataUrl: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
      reader.readAsDataURL(file);
    });

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      readRaw().then(resolve);
    };
    img.src = url;
  });
}
