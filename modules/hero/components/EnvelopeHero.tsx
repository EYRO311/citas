'use client';

import { useRef } from 'react';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { sounds } from '@/shared/sounds';
import { Icon } from '@/shared/icons/Icon';

export default function EnvelopeHero() {
  const envelopeRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openLetter(e: React.MouseEvent | React.KeyboardEvent) {
    sounds.playSparkle();
    envelopeRef.current?.classList.add('envelope-opened');

    const rect = envelopeRef.current?.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : undefined;
    const clientY = 'clientY' in e ? e.clientY : undefined;
    const burstX = clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    const burstY = clientY || (rect ? rect.top + rect.height / 2 : window.innerHeight / 2);

    triggerGlobalBurst(burstX, burstY, 45);

    setTimeout(() => {
      dialogRef.current?.showModal();
    }, 180);
  }

  function closeLetter() {
    dialogRef.current?.close();
    envelopeRef.current?.classList.remove('envelope-opened');
  }

  return (
    <>
      <section className="hero-section">
        <h1 className="hero-title">
          Tengo una sorpresa especial para ti, <span className="highlight-name">Adi</span>{' '}
          <Icon name="flower" className="ui-icon-gold ui-icon-lg" />
        </h1>

        <p className="hero-subtitle">
          Guardé aquí dos invitaciones que soñé para nosotros, un cronómetro para esperar nuestro próximo instante y
          un lugar donde atesorar cada recuerdo juntos.
        </p>

        <div
          id="envelope-trigger"
          className="envelope-interactive-container"
          role="button"
          tabIndex={0}
          aria-label="Abrir carta de amor para Adi"
          title="Toca para abrir la carta de amor"
          onClick={openLetter}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openLetter(e);
            }
          }}
        >
          <div className="envelope-stage">
            <div className="envelope-ambient-shadow"></div>

            <div ref={envelopeRef} className="envelope-widget">
              <div className="envelope-interior-lining" aria-hidden="true">
                <div className="lining-pattern"></div>
              </div>

              <div className="envelope-letter-peek" aria-hidden="true">
                <div className="peek-card-sheet">
                  <div className="peek-gold-filigree"></div>
                  <div className="peek-header">
                    <span className="peek-salutation">Para mi niña hermosa, Adi</span>
                  </div>
                  <div className="peek-lines">
                    <div className="peek-line"></div>
                    <div className="peek-line short"></div>
                  </div>
                  <div className="peek-callout">
                    <Icon name="heart" className="ui-icon-rose peek-heart" />
                    <span>Toca para desplegar la carta</span>
                  </div>
                </div>
              </div>

              <div className="envelope-pocket-front" aria-hidden="true">
                <svg className="envelope-folds-svg" viewBox="0 0 380 230" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="foldLeftGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="60%" stopColor="#FAF5EC" />
                      <stop offset="100%" stopColor="#EDE2CF" />
                    </linearGradient>
                    <linearGradient id="foldRightGrad" x1="100%" y1="0%" x2="0%" y2="80%">
                      <stop offset="0%" stopColor="#FBF7F0" />
                      <stop offset="60%" stopColor="#F4ECE0" />
                      <stop offset="100%" stopColor="#E8DCB7" />
                    </linearGradient>
                    <linearGradient id="foldBottomGrad" x1="50%" y1="100%" x2="50%" y2="0%">
                      <stop offset="0%" stopColor="#F5EFE3" />
                      <stop offset="35%" stopColor="#FAF7F1" />
                      <stop offset="85%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#FCFAF5" />
                    </linearGradient>
                    <linearGradient id="bottomGoldFoil" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(197, 160, 89, 0.2)" />
                      <stop offset="30%" stopColor="rgba(212, 175, 55, 0.75)" />
                      <stop offset="50%" stopColor="rgba(255, 235, 160, 0.95)" />
                      <stop offset="70%" stopColor="rgba(212, 175, 55, 0.75)" />
                      <stop offset="100%" stopColor="rgba(197, 160, 89, 0.2)" />
                    </linearGradient>
                    <filter id="bottomFoldDropShadow" x="-10%" y="-15%" width="120%" height="135%">
                      <feDropShadow dx="0" dy="-4" stdDeviation="4.5" floodColor="#0C2340" floodOpacity="0.14" />
                    </filter>
                    <filter id="sideFoldsDropShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#0C2340" floodOpacity="0.08" />
                    </filter>
                  </defs>

                  <polygon
                    points="0,0 190,135 0,230"
                    fill="url(#foldLeftGrad)"
                    stroke="#E5D9C4"
                    strokeWidth="0.8"
                    filter="url(#sideFoldsDropShadow)"
                  />
                  <polygon
                    points="380,0 190,135 380,230"
                    fill="url(#foldRightGrad)"
                    stroke="#E2D4BD"
                    strokeWidth="0.8"
                    filter="url(#sideFoldsDropShadow)"
                  />
                  <polygon
                    points="0,230 190,110 380,230"
                    fill="url(#foldBottomGrad)"
                    stroke="#D8C8AF"
                    strokeWidth="1"
                    filter="url(#bottomFoldDropShadow)"
                  />
                  <polyline points="0,230 190,110 380,230" fill="none" stroke="url(#bottomGoldFoil)" strokeWidth="1.6" />
                </svg>
              </div>

              <div className="envelope-flap-top" aria-hidden="true">
                <svg className="flap-svg" viewBox="0 0 380 145" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="flapGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="50%" stopColor="#FAF6EE" />
                      <stop offset="100%" stopColor="#F1E7D5" />
                    </linearGradient>
                    <linearGradient id="flapGoldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(197, 160, 89, 0.4)" />
                      <stop offset="35%" stopColor="rgba(245, 208, 115, 0.95)" />
                      <stop offset="50%" stopColor="rgba(255, 245, 200, 1)" />
                      <stop offset="65%" stopColor="rgba(245, 208, 115, 0.95)" />
                      <stop offset="100%" stopColor="rgba(197, 160, 89, 0.4)" />
                    </linearGradient>
                    <filter id="flapShadow" x="-10%" y="0%" width="120%" height="150%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0C2340" floodOpacity="0.24" />
                    </filter>
                  </defs>
                  <polygon points="0,0 380,0 190,140" fill="url(#flapGrad)" filter="url(#flapShadow)" />
                  <polyline points="0,0 190,140 380,0" fill="none" stroke="url(#flapGoldTrim)" strokeWidth="2.5" />
                </svg>
              </div>

              <div className="envelope-dedication-tag" aria-hidden="true">
                <div className="tag-pin"></div>
                <div className="tag-body">
                  <span className="tag-label">Para:</span>
                  <span className="tag-recipient">Adi</span>
                  <Icon name="heart" className="ui-icon-rose tag-heart" />
                </div>
              </div>

              <div className="envelope-wax-seal" aria-hidden="true">
                <div className="wax-seal-outer-rim">
                  <div className="wax-seal-depression">
                    <div className="wax-beaded-border"></div>
                    <div className="wax-stamp-core">
                      <span className="seal-initials">A &amp; E</span>
                      <span className="seal-heart-mark">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="wax-gloss-sheen"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="envelope-prompt">
            <span className="prompt-pill">
              <Icon name="envelope" className="ui-icon-gold prompt-icon-left" />
              <span className="prompt-text">Toca el sobre sellado para leer tu carta</span>
              <Icon name="heart" className="ui-icon-rose prompt-icon-right" />
            </span>
          </div>
        </div>
      </section>

      <dialog ref={dialogRef} id="modal-letter" className="letter-dialog" aria-labelledby="letter-greeting" onClose={closeLetter}>
        <button className="letter-close" aria-label="Cerrar carta" onClick={closeLetter}>
          &times;
        </button>

        <div className="letter-paper">
          <article className="letter-inner" tabIndex={-1}>
            <header className="letter-head">
              <div className="letter-postage" aria-hidden="true">
                <svg className="letter-stamp" viewBox="0 0 60 72" role="presentation">
                  <rect x="1" y="1" width="58" height="70" fill="#FFF6DA" />
                  <g fill="#FBF7EE">
                    <circle cx="1" cy="6" r="2.4" /><circle cx="1" cy="16" r="2.4" /><circle cx="1" cy="26" r="2.4" />
                    <circle cx="1" cy="36" r="2.4" /><circle cx="1" cy="46" r="2.4" /><circle cx="1" cy="56" r="2.4" />
                    <circle cx="1" cy="66" r="2.4" />
                    <circle cx="59" cy="6" r="2.4" /><circle cx="59" cy="16" r="2.4" /><circle cx="59" cy="26" r="2.4" />
                    <circle cx="59" cy="36" r="2.4" /><circle cx="59" cy="46" r="2.4" /><circle cx="59" cy="56" r="2.4" />
                    <circle cx="59" cy="66" r="2.4" />
                    <circle cx="6" cy="1" r="2.4" /><circle cx="16" cy="1" r="2.4" /><circle cx="26" cy="1" r="2.4" />
                    <circle cx="36" cy="1" r="2.4" /><circle cx="46" cy="1" r="2.4" /><circle cx="56" cy="1" r="2.4" />
                    <circle cx="6" cy="71" r="2.4" /><circle cx="16" cy="71" r="2.4" /><circle cx="26" cy="71" r="2.4" />
                    <circle cx="36" cy="71" r="2.4" /><circle cx="46" cy="71" r="2.4" /><circle cx="56" cy="71" r="2.4" />
                  </g>
                  <rect x="6.5" y="6.5" width="47" height="59" fill="none" stroke="#C5A059" strokeWidth="0.8" />
                  <g transform="translate(30 30)">
                    <g fill="#F2B53A">
                      <ellipse rx="2.6" ry="7" cy="-8.5" /><ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(30)" />
                      <ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(60)" /><ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(90)" />
                      <ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(120)" /><ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(150)" />
                      <ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(180)" /><ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(210)" />
                      <ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(240)" /><ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(270)" />
                      <ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(300)" /><ellipse rx="2.6" ry="7" cy="-8.5" transform="rotate(330)" />
                    </g>
                    <circle r="5.2" fill="#7A4A1E" />
                    <circle r="5.2" fill="none" stroke="#5A3413" strokeWidth="0.6" strokeDasharray="0.8 1.2" />
                  </g>
                  <text x="30" y="57" textAnchor="middle" fontFamily="Georgia, serif" fontSize="6.4" fontWeight={700} letterSpacing="1.2" fill="#8A5A1F">
                    AMOR
                  </text>
                  <text x="49" y="14" textAnchor="end" fontFamily="Georgia, serif" fontSize="5.4" fontStyle="italic" fill="#B45309">
                    25¢
                  </text>
                </svg>

                <svg className="letter-postmark" viewBox="0 0 132 64" role="presentation">
                  <defs>
                    <path id="postmark-arc" d="M 32 32 m -22 0 a 22 22 0 1 1 44 0 a 22 22 0 1 1 -44 0" />
                  </defs>
                  <g fill="none" stroke="#1D4ED8" strokeLinecap="round">
                    <circle cx="32" cy="32" r="29" strokeWidth="1.4" />
                    <circle cx="32" cy="32" r="16" strokeWidth="0.8" />
                    <path d="M66 20 q 7 -5 14 0 t 14 0 t 14 0 t 14 0" strokeWidth="1.3" />
                    <path d="M66 32 q 7 -5 14 0 t 14 0 t 14 0 t 14 0" strokeWidth="1.3" />
                    <path d="M66 44 q 7 -5 14 0 t 14 0 t 14 0 t 14 0" strokeWidth="1.3" />
                  </g>
                  <text fontFamily="Georgia, serif" fontSize="6.2" letterSpacing="1.6" fill="#1D4ED8">
                    <textPath href="#postmark-arc">CORREO DEL CORAZÓN · 2026 ·</textPath>
                  </text>
                  <text x="32" y="35.5" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize="10" fontStyle="italic" fontWeight={700} fill="#1D4ED8">
                    A+E
                  </text>
                </svg>
              </div>

              <div className="letter-meta">
                <span className="letter-meta-label">Correspondencia privada</span>
                <span className="letter-meta-date">Septiembre · con todo mi amor</span>
              </div>
            </header>

            <h2 id="letter-greeting" className="letter-greeting">
              Para mi hermosa Adi,
            </h2>
            <div className="letter-ornament" aria-hidden="true">
              <span className="letter-ornament-line"></span>
              <svg viewBox="0 0 24 24" className="letter-ornament-flower">
                <g transform="translate(12 12)" fill="#C5A059">
                  <ellipse rx="2" ry="4.6" cy="-5.6" /><ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(45)" />
                  <ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(90)" /><ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(135)" />
                  <ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(180)" /><ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(225)" />
                  <ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(270)" /><ellipse rx="2" ry="4.6" cy="-5.6" transform="rotate(315)" />
                </g>
                <circle cx="12" cy="12" r="3" fill="#1D4ED8" />
              </svg>
              <span className="letter-ornament-line"></span>
            </div>

            <div className="letter-body">
              <p className="letter-lead">
                Hoy quise crear un rincón que fuera tan especial y luminoso como tú. Elegí los colores de estas
                flores al óleo porque tienen esa misma calidez y magia con la que llegas a iluminar mis días. Cada
                instante a tu lado se convierte en mi recuerdo favorito.
              </p>
              <p>
                Tengo preparadas dos citas para nosotros dos. Dos momentos pensados para detener el tiempo, mirarte a
                los ojos, reírnos de todo y seguir escribiendo nuestra historia paso a paso. Quiero que cada una de
                nuestras salidas quede guardada para siempre en nuestro álbum.
              </p>
            </div>

            <p className="letter-question">¿Me concederías el honor más bonito de acompañarme a estas dos aventuras?</p>

            <p className="letter-ps">
              <span className="letter-ps-label">P.D.</span> Cada flor de este lienzo guarda una razón por la que eres
              y siempre serás mi persona favorita en el universo entero. 🌻
            </p>

            <footer className="letter-sign">
              <div className="letter-sign-text">
                <span className="letter-sign-intro">Siempre tuyo,</span>
                <span className="letter-sign-name">Eyro</span>
              </div>
              <span className="letter-seal" aria-hidden="true">
                <span>A+E</span>
              </span>
            </footer>

            <div className="letter-cta">
              <button className="btn-primary letter-cta-btn" onClick={closeLetter}>
                <span>Ver nuestras dos citas especiales</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </div>
      </dialog>
    </>
  );
}
