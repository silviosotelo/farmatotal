import Image from "next/image";
import type { FooterConfig } from "@/lib/api";

const DEFAULT_COPYRIGHT =
  "Copyright 2023 © Defensores S.A. Todos los derechos reservados.";
const DEFAULT_PARTNER = {
  href: "https://www.century.com.py/",
  image: "/brand/century.webp",
  alt: "Century — medios de pago",
};

export default function Footer({
  copyright = DEFAULT_COPYRIGHT,
  partner = DEFAULT_PARTNER,
}: Partial<FooterConfig> = {}) {
  return (
    <footer className="bg-white border-t border-[#ededf1] mt-10 py-6">
      <div className="ft-container flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left flex">
        <p className="text-brand-text text-[14px]">{copyright}</p>
        {partner && (
          <a
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${partner.alt} (se abre en una pestaña nueva)`}
            className="focus-ring inline-flex rounded-sm mx-auto md:mx-0"
          >
            <Image
              src={partner.image}
              width={120}
              height={30}
              alt={partner.alt}
              unoptimized
            />
          </a>
        )}
      </div>
    </footer>
  );
}
