'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PaintBucket, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSceneSelector } from '@/lib/contexts/scene-context';
import { useCanvasOperations } from '@/lib/hooks/use-canvas-operations';
import { useHistorySnapshot } from '@/lib/hooks/use-history-snapshot';
import type { SlideContent } from '@/lib/types/stage';
import type { SlideBackground, SlideBackgroundImageSize, Slide } from '@/lib/types/slides';

const GRADIENT_ANGLES = [
  { label: '→', value: 90 },
  { label: '↘', value: 135 },
  { label: '↓', value: 180 },
  { label: '↙', value: 225 },
];

type Tab = 'solid' | 'gradient' | 'image';

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0"
        style={{ backgroundColor: value }}
      />
      <input ref={ref} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" tabIndex={-1} />
      <input
        type="text"
        value={value}
        onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
        maxLength={7}
        className="flex-1 h-7 px-2 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
    </div>
  );
}

export function BackgroundPickerPopover() {
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('solid');

  const currentSlide = useSceneSelector<SlideContent, Slide>((c) => c.canvas);
  const bg = currentSlide.background;

  const { updateBackground } = useCanvasOperations();
  const { addHistorySnapshot } = useHistorySnapshot();

  // Derived state with defaults
  const solidColor = bg?.type === 'solid' ? (bg.color ?? '#ffffff') : '#ffffff';
  const gradFrom = bg?.type === 'gradient' ? (bg.gradient?.colors[0]?.color ?? '#5b5ea6') : '#5b5ea6';
  const gradTo = bg?.type === 'gradient' ? (bg.gradient?.colors[1]?.color ?? '#ffffff') : '#ffffff';
  const gradAngle = bg?.type === 'gradient' ? (bg.gradient?.rotate ?? 90) : 90;
  const imgSize: SlideBackgroundImageSize = bg?.type === 'image' ? (bg.image?.size ?? 'cover') : 'cover';

  // Sync tab to current background type on open
  useEffect(() => {
    if (open && bg?.type) setTab(bg.type);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const apply = useCallback((bg: SlideBackground) => {
    updateBackground(bg);
    addHistorySnapshot();
  }, [updateBackground, addHistorySnapshot]);

  const handleSolidChange = (color: string) => {
    apply({ type: 'solid', color });
  };

  const handleGradientChange = (from: string, to: string, rotate: number) => {
    apply({
      type: 'gradient',
      gradient: {
        type: 'linear',
        rotate,
        colors: [
          { pos: 0, color: from },
          { pos: 100, color: to },
        ],
      },
    });
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      apply({ type: 'image', image: { src, size: imgSize } });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageSize = (size: SlideBackgroundImageSize) => {
    if (bg?.type === 'image' && bg.image) {
      apply({ type: 'image', image: { ...bg.image, size } });
    }
  };

  // Button swatch reflects current background
  const btnSwatch = (() => {
    if (!bg || bg.type === 'solid') return { backgroundColor: bg?.color ?? '#ffffff' };
    if (bg.type === 'gradient' && bg.gradient) {
      const { colors, rotate } = bg.gradient;
      const stops = colors.map((c) => `${c.color} ${c.pos}%`).join(',');
      return { backgroundImage: `linear-gradient(${rotate}deg, ${stops})` };
    }
    if (bg.type === 'image') return { backgroundImage: `url(${bg.image?.src})`, backgroundSize: 'cover' };
    return { backgroundColor: '#ffffff' };
  })();

  const TABS: { key: Tab; label: string }[] = [
    { key: 'solid', label: 'Color' },
    { key: 'gradient', label: 'Gradient' },
    { key: 'image', label: 'Image' },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
          'text-gray-700 dark:text-gray-200',
          'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95',
          'transition-all duration-100 cursor-pointer select-none',
          open && 'bg-primary/10 text-primary dark:text-primary',
        )}
        title="Slide background"
      >
        <span className="w-3.5 h-3.5 rounded-sm border border-gray-300 flex-shrink-0" style={btnSwatch} />
        <span>Background</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-1 pt-1 gap-0.5">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-t-md transition-colors cursor-pointer',
                  tab === key
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-3 flex flex-col gap-3">
            {tab === 'solid' && (
              <ColorSwatch value={solidColor} onChange={handleSolidChange} />
            )}

            {tab === 'gradient' && (
              <>
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-gray-500">From</p>
                  <ColorSwatch value={gradFrom} onChange={(v) => handleGradientChange(v, gradTo, gradAngle)} />
                  <p className="text-[10px] text-gray-500">To</p>
                  <ColorSwatch value={gradTo} onChange={(v) => handleGradientChange(gradFrom, v, gradAngle)} />
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-gray-500 w-14">Direction</p>
                  <div className="flex gap-1">
                    {GRADIENT_ANGLES.map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => handleGradientChange(gradFrom, gradTo, value)}
                        className={cn(
                          'w-7 h-7 text-sm rounded border cursor-pointer transition-colors',
                          gradAngle === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gradient preview */}
                <div
                  className="h-6 rounded border border-gray-200 dark:border-gray-600"
                  style={{ backgroundImage: `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})` }}
                />
              </>
            )}

            {tab === 'image' && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 text-xs border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  {bg?.type === 'image' ? 'Replace image' : '+ Upload image'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

                {bg?.type === 'image' && (
                  <>
                    <div
                      className="h-16 rounded border border-gray-200 dark:border-gray-600 bg-cover bg-center"
                      style={{ backgroundImage: `url(${bg.image?.src})` }}
                    />
                    <div className="flex gap-1">
                      {(['cover', 'contain', 'repeat'] as SlideBackgroundImageSize[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleImageSize(s)}
                          className={cn(
                            'flex-1 py-1 text-[10px] rounded border cursor-pointer capitalize transition-colors',
                            imgSize === s
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => { apply({ type: 'solid', color: '#ffffff' }); setOpen(false); }}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Reset to white
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
