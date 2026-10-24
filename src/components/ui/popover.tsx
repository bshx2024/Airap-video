'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  container,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'> & {
    /** Mount inside this element (e.g. the open Dialog) so its focus trap allows input. */
    container?: PopoverPrimitive.Portal.Props['container'];
  }) {
  return (
    <PopoverPrimitive.Portal container={container}>
      {/* z above Dialog (z-80) so it works inside dialogs */}
      <PopoverPrimitive.Positioner
        className="isolate z-[90] outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'bg-popover text-popover-foreground ring-foreground/10 max-h-(--available-height) origin-(--transform-origin) overflow-y-auto rounded-lg p-3 shadow-md ring-1 outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
