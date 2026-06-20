"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import type { EmblaOptionsType } from "embla-carousel";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

interface CarouselProps {
  children: ReactNode[];
  options?: EmblaOptionsType;
  /** autoplay delay in ms; omit to disable */
  autoplayDelay?: number;
  fade?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  /** class applied to each slide wrapper — controls how many show via flex-basis */
  slideClassName?: string;
  className?: string;
  /** class for the arrow buttons */
  arrowClassName?: string;
}

export function Carousel({
  children,
  options,
  autoplayDelay,
  fade = false,
  showArrows = true,
  showDots = false,
  slideClassName,
  className,
  arrowClassName,
}: CarouselProps) {
  const plugins = [];
  if (autoplayDelay) plugins.push(Autoplay({ delay: autoplayDelay, stopOnInteraction: true, stopOnMouseEnter: true }));
  if (fade) plugins.push(Fade());

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", ...options }, plugins);
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(!!autoplayDelay);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const toggleAutoplay = useCallback(() => {
    const ap = emblaApi?.plugins()?.autoplay;
    if (!ap) return;
    if (ap.isPlaying()) ap.stop();
    else ap.play();
    setIsPlaying(ap.isPlaying());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    setSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
    onSelect();

    // Respect prefers-reduced-motion: stop autoplay (embla is JS, CSS can't pause it)
    const ap = emblaApi.plugins()?.autoplay;
    if (ap && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ap.stop();
      setIsPlaying(false);
    }
  }, [emblaApi]);

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {children.map((child, i) => (
            <div key={i} className={cn("min-w-0 shrink-0 grow-0", slideClassName)}>
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={scrollPrev}
            className={cn(
              "focus-ring absolute left-1 top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-brand-text shadow-md transition-all duration-200 hover:bg-brand-orange hover:text-white hover:shadow-lg active:scale-90",
              arrowClassName,
            )}
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={scrollNext}
            className={cn(
              "focus-ring absolute right-1 top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-brand-text shadow-md transition-all duration-200 hover:bg-brand-orange hover:text-white hover:shadow-lg active:scale-90",
              arrowClassName,
            )}
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </>
      )}

      {(showDots || autoplayDelay) && snaps.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {autoplayDelay && (
            <button
              type="button"
              onClick={toggleAutoplay}
              aria-label={isPlaying ? "Pausar carrusel" : "Reanudar carrusel"}
              className="focus-ring mr-1 flex size-6 items-center justify-center rounded-full text-brand-muted transition-colors hover:text-brand-orange"
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
          {showDots &&
            snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === selected}
                onClick={() => scrollTo(i)}
                className="focus-ring flex size-6 items-center justify-center rounded-full"
              >
                <span
                  className={cn(
                    "block h-2.5 rounded-full transition-all",
                    i === selected ? "w-5 bg-brand-orange" : "w-2.5 bg-black/20 hover:bg-black/40",
                  )}
                />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
