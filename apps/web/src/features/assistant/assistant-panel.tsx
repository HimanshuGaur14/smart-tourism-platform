import { ExternalLink, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { cn } from '../../lib/cn';
import { CHAT_URL, DOUBLE_CLICK_MS, POPUP_FEATURES } from './config';

/**
 * Right-edge "AI Assistant" tab. Single click toggles a slide-out panel with the chat in an
 * iframe; double click (or the header button) opens the chat in a popup window instead, and
 * collapses the panel so only one chat is visible at a time.
 */
export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  // The iframe is created the first time the panel opens, then kept so the chat survives toggling.
  const [loaded, setLoaded] = useState(false);
  const clickTimer = useRef<number | undefined>(undefined);
  const tabRef = useRef<HTMLButtonElement>(null);

  const setPanel = (next: boolean) => {
    if (next) setLoaded(true);
    setOpen(next);
  };

  const openPopup = () => {
    window.clearTimeout(clickTimer.current);
    setOpen(false);
    window.open(CHAT_URL, 'chat', POPUP_FEATURES);
  };

  useEffect(() => () => window.clearTimeout(clickTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      tabRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onTabClick = (event: MouseEvent<HTMLButtonElement>) => {
    // detail 0 = activated from the keyboard, which has no double click: toggle at once.
    if (event.detail === 0) return setPanel(!open);
    if (event.detail > 1) return; // the second click of a double click; dblclick handles it
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => setPanel(!open), DOUBLE_CLICK_MS);
  };

  // window.open must run directly in this handler, not in a timeout, or browsers block the popup.
  const onTabDoubleClick = () => openPopup();

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={tabRef}
        type="button"
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={open}
        aria-controls="assistant-panel"
        title="Click to open. Double-click to open in a new window."
        onClick={onTabClick}
        onDoubleClick={onTabDoubleClick}
        onKeyDown={onTabKeyDown}
        className={cn(
          'fixed top-1/2 right-0 z-[60] flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-lg bg-forest-700 px-2 py-4 text-ivory-50 shadow-raised',
          'hover:bg-forest-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-terracotta-500',
          'transition-[right] duration-300 ease-out motion-reduce:transition-none',
          open && 'min-[480px]:right-[380px]',
        )}
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <MessageCircle className="size-5" aria-hidden />
        )}
        <span className="text-sm font-medium [writing-mode:vertical-rl]" aria-hidden>
          AI Assistant
        </span>
      </button>

      <section
        id="assistant-panel"
        aria-label="AI travel assistant"
        inert={!open}
        className={cn(
          'fixed z-[60] flex flex-col overflow-hidden bg-white shadow-raised',
          'inset-0 min-[480px]:inset-auto min-[480px]:top-1/2 min-[480px]:right-0 min-[480px]:h-[600px] min-[480px]:max-h-[calc(100vh-40px)] min-[480px]:w-[380px] min-[480px]:-translate-y-1/2 min-[480px]:rounded-l-card',
          'transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none',
          open
            ? 'visible translate-x-0'
            : 'invisible translate-x-full min-[480px]:translate-x-[calc(100%+1px)]',
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-charcoal-100 bg-forest-700 px-4 py-2.5 text-ivory-50">
          <h2 className="font-sans text-sm font-semibold text-ivory-50">AI Assistant</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openPopup}
              aria-label="Open chat in a new window"
              title="Open in a new window"
              className="rounded-md p-1.5 hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-ivory-50"
            >
              <ExternalLink className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                tabRef.current?.focus();
              }}
              aria-label="Close AI Assistant"
              className="rounded-md p-1.5 hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-ivory-50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-950">
          Prototype: crowd figures in this chat come from a model trained on sample data and are not
          real predictions.
        </p>
        {loaded && (
          <iframe
            src={CHAT_URL}
            title="AI travel assistant chat"
            className="w-full flex-1 border-0"
          />
        )}
      </section>
    </>
  );
}
