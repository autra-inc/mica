'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-1.5', className)}>{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-gray-500 dark:text-gray-400 w-4 flex-shrink-0 text-center">
      {children}
    </span>
  );
}

export function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <Label>{label}</Label>
      <div className="relative flex-1 min-w-0">
        <input
          type="number"
          value={Math.round(value * 10) / 10}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(n);
          }}
          className={cn(
            'w-full h-6 text-xs border border-gray-200 dark:border-gray-600 rounded',
            'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
            'px-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40',
            unit ? 'pr-4' : '',
          )}
        />
        {unit && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hex = value?.startsWith('#') ? value : '#000000';
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0 cursor-pointer"
        style={{ backgroundColor: hex }}
        title="Pick color"
      />
      <input
        ref={inputRef}
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        maxLength={7}
        className={cn(
          'flex-1 min-w-0 h-6 px-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded',
          'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
          'focus:outline-none focus:ring-1 focus:ring-primary/40',
        )}
      />
    </div>
  );
}

export function OpacityRow({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const pct = Math.round((value ?? 1) * 100);
  return (
    <Row>
      <Label>O</Label>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="flex-1 h-1 accent-primary cursor-pointer"
      />
      <span className="text-[10px] text-gray-500 w-7 text-right">{pct}%</span>
    </Row>
  );
}
