type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
  tagline?: boolean;
};

const brandAsset=(file:string)=>`${import.meta.env.BASE_URL}brand/${file}`;

export function BrandMark({ className = '', inverted = false }: Pick<BrandLogoProps, 'className' | 'inverted'>) {
  return (
    <span
      aria-hidden="true"
      className={`brand-emblem ${inverted ? 'is-inverted' : ''} ${className}`}
    >
      <img className="brand-emblem-image" src={brandAsset('ara-garage-mark-exact.png')} alt="" />
    </span>
  );
}

export function BrandLogo({ className = '', compact = false, inverted = false, tagline = true }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${inverted ? 'is-inverted' : ''} ${compact ? 'is-compact' : ''} ${className}`} aria-label="Ara Garage">
      <BrandMark inverted={inverted} />
      {!compact && (
        <span className="brand-copy">
          <span className="brand-name"><span className="brand-ara">Ara</span><span className="brand-garage">Garage</span></span>
          {tagline && <span className="brand-tagline">Digital Garage Management Platform</span>}
        </span>
      )}
    </span>
  );
}
