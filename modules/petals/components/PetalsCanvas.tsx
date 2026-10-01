'use client';

import { useEffect, useRef } from 'react';
import { PetalsEngine } from '../engine';
import { setActivePetals } from '../registry';

export default function PetalsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new PetalsEngine(canvasRef.current);
    setActivePetals(engine);

    return () => {
      setActivePetals(null);
      engine.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="petals-canvas" aria-hidden="true" />;
}
