import useEmblaCarousel from 'embla-carousel-react';
import { Maximize2, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

export type PhotoItem = {
  id: string;
  src: string;
  alt: string;
  label?: string;
};

export function PhotoGallery({ items, compact = false }: { items: readonly PhotoItem[]; compact?: boolean }) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [emblaRef] = useEmblaCarousel({ align: 'start', dragFree: true });
  const slides = useMemo(() => items.map((item) => ({ src: item.src, alt: item.alt })), [items]);

  if (!items.length) return null;

  return (
    <>
      {compact ? (
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y gap-3">
            {items.map((item, index) => (
              <PhotoCard className="min-w-36 flex-[0_0_42%] sm:flex-[0_0_30%]" item={item} key={item.id} onOpen={() => setLightboxIndex(index)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => <PhotoCard item={item} key={item.id} onOpen={() => setLightboxIndex(index)} />)}
        </div>
      )}
      <Lightbox close={() => setLightboxIndex(-1)} index={lightboxIndex} open={lightboxIndex >= 0} plugins={[Zoom]} slides={slides} />
    </>
  );
}

function PhotoCard({ item, onOpen, className }: { item: PhotoItem; onOpen: () => void; className?: string }) {
  return (
    <button className={cn('focus-ring group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface text-left', className)} onClick={onOpen} type="button">
      <img alt={item.alt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" src={item.src} />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-white">
        <span className="truncate text-xs font-medium">{item.label ?? item.alt}</span>
        <Maximize2 className="size-4 shrink-0 opacity-75" />
      </span>
    </button>
  );
}

type CropArea = { x: number; y: number; width: number; height: number };

export function ImageCropper({
  src,
  aspect = 3 / 4,
  onCancel,
  onConfirm,
}: {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (area: CropArea, rotation: number) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pixels, setPixels] = useState<CropArea | null>(null);

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
        <Cropper
          aspect={aspect}
          crop={crop}
          image={src}
          onCropChange={setCrop}
          onCropComplete={(_, area) => setPixels(area)}
          onRotationChange={setRotation}
          onZoomChange={setZoom}
          rotation={rotation}
          zoom={zoom}
        />
      </div>
      <div className="space-y-4 pt-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Масштаб
          <input className="range-control mt-2 block w-full" max={3} min={1} onChange={(event) => setZoom(Number(event.target.value))} step={0.01} type="range" value={zoom} />
        </label>
        <div className="flex items-center gap-2">
          <Button onClick={() => setRotation((value) => value - 90)} size="icon" variant="secondary"><RotateCcw className="size-4" /></Button>
          <span className="min-w-14 text-center text-sm tabular-nums text-muted-foreground">{rotation}°</span>
          <Button onClick={() => setRotation((value) => value + 90)} size="icon" variant="secondary"><RotateCcw className="size-4 scale-x-[-1]" /></Button>
          <div className="flex-1" />
          <Button onClick={onCancel} variant="ghost"><X className="size-4" />Отмена</Button>
          <Button disabled={!pixels} onClick={() => pixels && onConfirm(pixels, rotation)}>Применить</Button>
        </div>
      </div>
    </div>
  );
}
