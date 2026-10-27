"use client";

import React from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";

export interface ResponsiveGridInnerProps {
  layouts: ResponsiveLayouts<string>;
  onLayoutChange: (layout: Layout, layouts: ResponsiveLayouts<string>) => void;
  isDraggable: boolean;
  isResizable: boolean;
  children: React.ReactNode;
}

export default function ResponsiveGridInner({
  layouts,
  onLayoutChange,
  isDraggable,
  isResizable,
  children,
}: ResponsiveGridInnerProps) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <ResponsiveGridLayout
        width={width}
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 800, sm: 0 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={85}
        dragConfig={{
          enabled: isDraggable,
          handle: ".drag-handle",
        }}
        resizeConfig={{
          enabled: isResizable,
        }}
        onLayoutChange={onLayoutChange}
        margin={[16, 16] as const}
        containerPadding={[0, 0] as const}
      >
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}
