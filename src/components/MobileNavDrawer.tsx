/*
 * MobileNavDrawer — accessible slide-out nav for <768px (client:load island).
 *
 * Hamburger toggles a right-side drawer holding the same primary links + auth.
 * a11y: aria-expanded, focus trap, Esc to close, click-outside, body-scroll
 * lock, focus returned to the trigger on close. Foil active underline mirrors
 * the desktop nav. prefers-reduced-motion disables the slide transition.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'

interface NavItem {
  href: string
  label: string
}

export default function MobileNavDrawer({
  links,
  current,
}: {
  links: NavItem[]
  current: string
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerId = useId()

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = 'hidden'

    const firstLink = panelRef.current?.querySelector<HTMLElement>('a, button')
    firstLink?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const isActive = (href: string) =>
    href === '/' ? current === '/' : current.startsWith(href)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mnav-trigger"
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mnav-bars" data-open={open} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <div className="mnav-overlay" onClick={close} aria-hidden="true" />
      )}

      <div
        id={drawerId}
        ref={panelRef}
        className="mnav-panel"
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        hidden={!open}
      >
        <nav className="mnav-links" aria-label="Primary">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="mnav-link"
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mnav-foot">
          <a className="auth-btn" href="/account/">
            Sign in
          </a>
        </div>
      </div>
    </>
  )
}
