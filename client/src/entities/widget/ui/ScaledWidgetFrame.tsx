import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import styles from '@/entities/widget/ui/ScaledWidgetFrame.module.css';

type ScaledWidgetFrameProps = {
  width: number;
  height: number;
  children: ReactNode;
  /** Drop shadow around the widget. Off for embeds, where it would tint the rounded corners. */
  elevated?: boolean;
  /** Shadow tint, usually the palette accent. */
  accent?: string;
  /** Upper bound for the scale factor; 1 keeps the widget at its real size at most. */
  maxScale?: number;
  className?: string;
};

/**
 * Renders a fixed-size widget and scales it down (never reflows it) to fit the available
 * width, so every surface shows the same layout the SVG export produces.
 */
export const ScaledWidgetFrame = ({
  width,
  height,
  children,
  elevated = false,
  accent,
  maxScale = 1,
  className,
}: ScaledWidgetFrameProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState<number | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setAvailable(host.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const scale = available ? Math.min(maxScale, available / width) : 1;

  return (
    <div ref={hostRef} className={`${styles.host} ${className ?? ''}`}>
      <div
        className={`${styles.frame} ${elevated ? styles.elevated : ''}`}
        style={
          {
            width: width * scale,
            height: height * scale,
            '--widget-shadow': accent,
          } as CSSProperties
        }
      >
        <div
          className={styles.content}
          style={{ width, height, transform: `scale(${scale})` } as CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
