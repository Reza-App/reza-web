'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export interface AuthSlide {
  src: string;
  position: string;
  alt: string;
  title: string;
  text: string;
}

export const PRO_SLIDES: AuthSlide[] = [
  {
    src: '/Images/auth/Salon Selia1.png',
    /** Wide photo: the caption sits top left, so frame the chairs and mirrors. */
    position: 'object-[85%_50%]',
    alt: 'Salon de coiffure Selia, accueil en marbre et fauteuils',
    title: 'Gérez votre salon, librement.',
    text: 'Votre agenda et celui de votre équipe, en temps réel.',
  },
  {
    src: '/Images/auth/selia2.png',
    position: 'object-center',
    alt: 'Cabine de soin Selia',
    title: 'Chaque client, à sa juste place.',
    text: 'Fichier client, avis et fidélité au même endroit.',
  },
  {
    src: '/Images/auth/SELIA3.png',
    position: 'object-center',
    alt: "Application Selia sur un téléphone : réservez votre salon en quelques clics",
    title: 'Vos clients réservent en ligne.',
    text: 'Caisse, factures et statistiques suivent sans effort.',
  },
];

/** Same photos, told to the people who book. */
export const CLIENT_SLIDES: AuthSlide[] = [
  { ...PRO_SLIDES[0]!, title: 'Votre salon, en quelques clics.', text: 'Trouvez un salon près de chez vous et réservez à toute heure.' },
  { ...PRO_SLIDES[1]!, title: 'Un moment rien que pour vous.', text: 'Choisissez la prestation, le professionnel et le créneau.' },
  { ...PRO_SLIDES[2]!, title: 'Tous vos rendez vous au même endroit.', text: 'Modifiez, annulez, réservez pour vos proches.' },
];

const INTERVAL_MS = 6000;

/** Brand photos of the sign in page, cross fading on their own. */
export function AuthCarousel({ slides = PRO_SLIDES }: { slides?: AuthSlide[] }) {
  const SLIDES = slides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section
      className="relative hidden h-[calc(100vh-2.5rem)] overflow-hidden rounded-[28px] bg-neutral-100 lg:m-5 lg:block"
      aria-roledescription="carrousel"
      aria-label="Selia"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={i !== index}
        >
          <Image src={encodeURI(slide.src)} alt={slide.alt} fill priority={i === 0} sizes="55vw" quality={90} className={`object-cover ${slide.position}`} />
        </div>
      ))}

      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-14 pb-40 pt-14 text-white">
        <div aria-live="polite">
          <h2 className="text-3xl font-semibold leading-tight xl:text-4xl">{SLIDES[index].title}</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">{SLIDES[index].text}</p>
        </div>
        <div className="mt-7 flex gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1} sur ${SLIDES.length}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
