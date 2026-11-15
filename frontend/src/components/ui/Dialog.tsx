import { Fragment, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

interface DialogContentProps {
  children: ReactNode
  className?: string
}

interface DialogHeaderProps {
  children: ReactNode
  className?: string
}

interface DialogTitleProps {
  children: ReactNode
  className?: string
}

interface DialogDescriptionProps {
  children: ReactNode
  className?: string
}

interface DialogFooterProps {
  children: ReactNode
  className?: string
}

interface DialogTriggerProps {
  children: ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl surface-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          {children}
        </div>
      </div>
    </Fragment>
  )
}

function DialogTrigger({ children }: DialogTriggerProps) {
  return <>{children}</>
}

function DialogContent({ children, className }: DialogContentProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>
}

function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 id="dialog-title" className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h2>
  )
}

function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-500', className)}>{children}</p>
  )
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-2 p-4 border-t border-gray-100', className)}>
      {children}
    </div>
  )
}

export const DialogClose = ({ className, ...props }: { className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className={cn('absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-gray-100', className)}
    {...props}
  >
    <X className="w-4 h-4" />
  </Button>
)

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }