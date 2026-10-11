import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function HandleSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  const startY = useRef(0)
  const [drag, setDrag] = useState(0)

  useEffect(() => {
    if (!open) setDrag(0)
  }, [open])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    startY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setDrag(Math.max(0, event.clientY - startY.current))
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.clientY - startY.current > 96) onOpenChange(false)
    setDrag(0)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-label={title}
        className="max-h-[min(88dvh,720px)] gap-0 overflow-hidden rounded-t-3xl border-border bg-background p-0"
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{title}</SheetDescription>
        </SheetHeader>
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(0)}
        >
          <span className="h-1.5 w-10 rounded-full bg-foreground/30" />
          <span className="sr-only">{title}</span>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
