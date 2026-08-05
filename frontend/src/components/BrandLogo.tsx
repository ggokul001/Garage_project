type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
  tagline?: boolean;
};

const originalLogoUrl = `${import.meta.env.BASE_URL}brand/ara-garage-original.jpeg`;

export function BrandMark({ className = '', inverted = false }: Pick<BrandLogoProps, 'className' | 'inverted'>) {
  return (
    <span
      aria-hidden="true"
      className={`brand-source-mark ${inverted ? 'is-inverted' : ''} ${className}`}
    >
      <img src={originalLogoUrl} alt="" />
    </span>
  );
}

export function BrandLogo({ className = '', compact = false, inverted = false, tagline = true }: BrandLogoProps) {
  // The compact view only crops the original image at display time. The source file is never altered.
  if (compact) return <BrandMark className={className} inverted={inverted} />;

  return (
    <span
      className={`brand-logo ${inverted ? 'is-inverted' : ''} ${className}`}
      aria-label={tagline ? 'Ara Garage — Digital Garage Management Platform' : 'Ara Garage'}
    >
      <img
        className="brand-source-full"
        src={originalLogoUrl}
        alt={tagline ? 'Ara Garage — Digital Garage Management Platform' : 'Ara Garage'}
      />
    </span>
  );
}
