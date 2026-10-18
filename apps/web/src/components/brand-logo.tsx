import Image from 'next/image';

export function BrandLogo({ label }: { label: string }) {
  return (
    <Image
      className="brand-logo"
      src="/basa-logo.png"
      alt={label}
      width={1000}
      height={1089}
      priority
      unoptimized
    />
  );
}
