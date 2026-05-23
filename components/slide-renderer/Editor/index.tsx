'use client';

import Canvas from './Canvas';
import type { StageMode } from '@/lib/types/stage';
import { ScreenCanvas } from './ScreenCanvas';
import { SlideInsertToolbar } from './SlideInsertToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { TextFormatBar } from './TextFormatBar';

export function SlideEditor({ mode }: { readonly mode: StageMode }) {
  return (
    <div className="flex flex-col h-full">
      {mode === 'autonomous' && <SlideInsertToolbar />}
      {mode === 'autonomous' && <TextFormatBar />}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden min-w-0">
          {mode === 'autonomous' ? <Canvas /> : <ScreenCanvas />}
        </div>
        {mode === 'autonomous' && <PropertiesPanel />}
      </div>
    </div>
  );
}
