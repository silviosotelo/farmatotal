import Image from "next/image";
import Link from "next/link";
import type { PromoBanner as PromoBannerType } from "@/types";

export function PromoBanner({ banner }: { banner: PromoBannerType }) {
  return (
    <div className="ft-container mt-6">
      <Link href={banner.href} className="block overflow-hidden rounded-[10px]">
        <Image
          src={banner.image}
          alt={banner.alt}
          width={1536}
          height={198}
          sizes="(max-width: 1200px) 100vw, 1170px"
          className="h-auto w-full"
        />
      </Link>
    </div>
  );
}
