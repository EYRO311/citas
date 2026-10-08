'use client';

import { useEvents } from '@/modules/events/hooks/useEvents';
import CountdownTimer from '@/modules/events/components/CountdownTimer';
import EventsInvitations from '@/modules/events/components/EventsInvitations';
import IdeasList from '@/modules/ideas/components/IdeasList';
import Gallery from '@/modules/gallery/components/Gallery';
import PetalsCanvas from '@/modules/petals/components/PetalsCanvas';
import EnvelopeHero from '@/modules/hero/components/EnvelopeHero';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { sounds } from '@/shared/sounds';
import { Icon } from '@/shared/icons/Icon';

export default function Home() {
  const { events, refresh } = useEvents();

  function handleFinalCelebration() {
    sounds.playCelebration();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        triggerGlobalBurst(Math.random() * window.innerWidth, Math.random() * (window.innerHeight * 0.7), 35);
      }, i * 220);
    }
  }

  return (
    <>
      <div className="background-wrapper">
        <div id="bg-painting" className="bg-painting-layer"></div>
        <div className="bg-overlay"></div>
      </div>

      <PetalsCanvas />

      <main className="main-wrapper">
        <EnvelopeHero />

        <section aria-label="Cronómetro para la cita">
          <CountdownTimer events={events} />
        </section>

        <section id="events-section" aria-label="Dos Invitaciones Especiales">
          <header className="events-section-header">
            <h2 className="section-title">
              Nuestras Dos Próximas Citas <Icon name="heart" className="ui-icon-rose" />
            </h2>
            <p className="section-subtitle">
              Elegí dos planes increíbles para nosotros. Elige tu favorito o mejor aún... ¡vayamos a los dos!
            </p>
          </header>
          <EventsInvitations events={events} refresh={refresh} />
        </section>

        <section id="gallery-section" aria-label="Álbum de recuerdos de nuestras citas">
          <Gallery />
        </section>

        <section className="glass-panel" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#b45309', marginBottom: 12 }}>
            Gracias por estar en mi vida, Adi <Icon name="heart" className="ui-icon-rose" />
          </h3>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 18 }}>
            Así como las flores buscan la luz del sol para florecer, cada día a tu lado se llena de alegría y calma.
            No importa a dónde vayamos, el mejor destino siempre será estar contigo.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ maxWidth: 280, margin: '0 auto' }}
            onClick={handleFinalCelebration}
          >
            <span>
              <Icon name="balloon" className="ui-icon-blue" /> Lluvia de globos
            </span>
          </button>
        </section>

        <section id="ideas-section" aria-label="Lista de planes futuros">
          <IdeasList />
        </section>

        <footer className="romantic-footer">
          
        </footer>
      </main>
    </>
  );
}
