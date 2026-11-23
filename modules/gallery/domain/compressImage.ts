// Reduce la foto antes de subirla: las fotos del celular suelen pasar del
// límite de 4.5 MB por petición de Vercel. Si el navegador no puede leerla
// (p. ej. HEIC fuera de Safari), se envía tal cual.
//
// Bug conocido de WebKit/Safari: con algunas fotos HEIC, <img>.onload dispara
// bien (las dimensiones son correctas) pero canvas.drawImage() no pinta nada,
// dejando el canvas transparente. Como el JPEG no soporta transparencia, eso
// se exporta como una foto 100% negra. `isCanvasBlank` detecta ese caso para
// no subir una foto negra silenciosamente.
function isCanvasBlank(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  if (!width || !height) return true;
  const points: [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), Math.floor(height / 2)],
    [Math.floor(width / 4), Math.floor(height / 4)],
    [Math.floor((3 * width) / 4), Math.floor((3 * height) / 4)],
  ];
  return points.every(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] === 0);
}

export function compressImage(
  file: File,
  maxSide = 2000,
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string; degraded?: boolean }> {
  const readRaw = () =>
    new Promise<{ dataUrl: string; mimeType: string; degraded: boolean }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        resolve({ dataUrl: e.target?.result as string, mimeType: file.type || 'image/jpeg', degraded: true });
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
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (ctx && isCanvasBlank(ctx, canvas.width, canvas.height)) {
        readRaw().then(resolve);
        return;
      }
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      readRaw().then(resolve);
    };
    img.src = url;
  });
}
