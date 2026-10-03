import type { PageContext, Vector2, ViewportState } from '../core/types';

interface CursorState extends Vector2 {
  active: boolean;
}

export class BrowserContext {
  private cursor: CursorState = { x: 0, y: 0, active: false };

  private pageContext: PageContext = {
    hasForm: false,
    formPosition: { x: 0, y: 0 },
    inactiveTime: 0,
    lastActivity: Date.now(),
  };

  private destroyers: Array<() => void> = [];

  private scanTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupListeners();
      this.startPageScanner();
    }
  }

  private setupListeners(): void {
    const onMove = (event: MouseEvent) => {
      this.cursor.x = event.clientX;
      this.cursor.y = event.clientY;
      this.cursor.active = true;
      this.pageContext.lastActivity = Date.now();
    };

    const onScroll = () => {
      this.pageContext.lastActivity = Date.now();
    };

    const onKey = () => {
      this.pageContext.lastActivity = Date.now();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);

    this.destroyers.push(() => window.removeEventListener('mousemove', onMove));
    this.destroyers.push(() => window.removeEventListener('scroll', onScroll));
    this.destroyers.push(() => window.removeEventListener('keydown', onKey));
  }

  private startPageScanner(): void {
    this.scanTimer = window.setInterval(() => {
      const interactive = document.querySelector('form, input, textarea, select, button');
      if (interactive) {
        const rect = interactive.getBoundingClientRect();
        this.pageContext.hasForm = true;
        this.pageContext.formPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      } else {
        this.pageContext.hasForm = false;
      }

      this.pageContext.inactiveTime = Date.now() - this.pageContext.lastActivity;
    }, 1000);

    this.destroyers.push(() => {
      if (this.scanTimer !== null) {
        window.clearInterval(this.scanTimer);
      }
    });
  }

  getCursorState(): CursorState {
    return { ...this.cursor };
  }

  getViewport(): ViewportState {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  getPageContext(): PageContext {
    return { ...this.pageContext, formPosition: { ...this.pageContext.formPosition } };
  }

  destroy(): void {
    this.destroyers.forEach((fn) => fn());
    this.destroyers = [];
  }
}
