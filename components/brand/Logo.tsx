import Image from 'next/image';

type LogoVariant = 'pro' | 'black' | 'white';

const SOURCES: Record<LogoVariant, { src: string; width: number; height: number; alt: string }> = {
  pro: { src: '/brand/selia-pro.svg', width: 391, height: 207, alt: 'Selia Pro' },
  black: { src: '/brand/selia.svg', width: 334, height: 221, alt: 'Selia, la liberté de choisir' },
  white: { src: '/brand/selia-white.svg', width: 334, height: 221, alt: 'Selia, la liberté de choisir' },
};

/** Official Selia wordmark (vector, from the brand book). */
export function Logo({
  variant = 'pro',
  height = 32,
  className,
  priority,
}: {
  variant?: LogoVariant;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const source = SOURCES[variant];
  const width = Math.round((source.width / source.height) * height);
  return (
    <Image
      src={source.src}
      alt={source.alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      unoptimized
    />
  );
}
