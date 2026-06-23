"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import type { EmblaOptionsType } from "embla-carousel";
import { Button } from "@platform/ui";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

interface CarouselProps {
  children: ReactNode[];
  options?: EmblaOptionsType;
  autoplayDelay?: number;
  fade?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  slideClassName?: string;
  className?: string;
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
          <Button
            type="button"
            variant="default"
            shape="circle"
            aria-label="Anterior"
            onClick={scrollPrev}
            className={cn(
              "absolute left-1 top-1/2 z-10 size-9 -translate-y-1/2 bg-white text-brand-text shadow-md transition-all duration-200 hover:bg-brand-orange hover:text-white hover:shadow-lg active:scale-90",
              arrowClassName,
            )}
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
          <Button
            type="button"
            variant="default"
            shape="circle"
            aria-label="Siguiente"
            onClick={scrollNext}
            className={cn(
              "absolute right-1 top-1/2 z-10 size-9 -translate-y-1/2 bg-white text-brand-text shadow-md transition-all duration-200 hover:bg-brand-orange hover:text-white hover:shadow-lg active:scale-90",
              arrowClassName,
            )}
          >
            <ChevronRightIcon className="size-5" />
          </Button>
        </>
      )}

      {(showDots || autoplayDelay) && snaps.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {autoplayDelay && (
            <Button
              type="button"
              variant="plain"
              shape="circle"
              onClick={toggleAutoplay}
              aria-label={isPlaying ? "Pausar carrusel" : "Reanudar carrusel"}
              className="mr-1 size-6 text-brand-muted hover:text-brand-orange"
              size="md"
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
            </Button>
          )}
          {showDots &&
            snaps.map((_, i) => (
              <Button
                key={i}
                type="button"
                variant="plain"
                shape="circle"
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === selected}
                onClick={() => scrollTo(i)}
                className="size-6"
                size="md"
              >
                <span
                  className={cn(
                    "block h-2.5 rounded-full transition-all",
                    i === selected ? "w-5 bg-brand-orange" : "w-2.5 bg-black/20 hover:bg-black/40",
                  )}
                />
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
