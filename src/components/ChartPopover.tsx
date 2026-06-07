import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/* ── TradingView Mini Chart (free, public, no API key) ───────────────── */

interface ChartPopoverProps {
  symbol: string;
  exchange?: string;
  onClose: () => void;
}

const WIDGET_ID = 'tv-mini-chart';

export function ChartPopover({ symbol, exchange = 'NASDAQ', onClose }: ChartPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeKey = useRef(0);

  useEffect(() => {
    iframeKey.current += 1;
  }, [symbol]);

  // TradingView Lightweight chart embed via iframe
  const tvSymbol = `${exchange}:${symbol}`;
  const theme = 'light';
  const locale = 'en';
  const width = 340;
  const height = 220;

  const iframeSrc = `https://www.tradingview-widget.com/embed-widget/mini-symbol-overview/?locale=${locale}&` +
    `symbol=${encodeURIComponent(tvSymbol)}&` +
    `width=${width}&height=${height}&` +
    `colorTheme=${theme}&trendLineColor=%23268bd2&underLineColor=%23268bd220&` +
    `fontColor=%23073642&gridLineColor=%23eee8d5&` +
    `isTransparent=false&autosize=false&largeChartUrl=`;

  return (
    <div
      ref={containerRef}
      className="solar-card absolute z-50 overflow-hidden"
      style={{ width, minHeight: height + 40 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-solar-base02 bg-solar-base02/30">
        <span className="text-xs font-bold text-solar-base2">{symbol}</span>
        <button onClick={onClose} className="text-solar-base1 hover:text-solar-base2 p-0.5">
          <X size={14} />
        </button>
      </div>
      <iframe
        key={iframeKey.current}
        src={iframeSrc}
        width={width}
        height={height}
        frameBorder="0"
        allowTransparency
        scrolling="no"
        title={`${symbol} chart`}
        style={{ display: 'block', border: 'none' }}
        loading="eager"
      />
      <div className="px-3 py-1.5 border-t border-solar-base02 bg-solar-base03/40">
        <a
          href={`https://www.tradingview.com/symbols/${exchange}-${symbol}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-medium text-solar-base1/50 hover:text-solar-accent transition-colors uppercase tracking-wider"
        >
          Data: TradingView →
        </a>
      </div>
    </div>
  );
}

/* ── Inline mini spark bar (no iframe, pure DOM, used where iframe feels heavy) ── */

interface MiniBarProps {
  data: number[];
  color?: string;
  height?: number;
}
export function MiniBar({ data, color = '#268bd2', height = 32 }: MiniBarProps) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const barW = 3;
  const pad = 1;
  const w = data.length * (barW + pad);

  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'inline-block' }}>
      {data.map((v, i) => {
        const h = ((v - min) / range) * (height - 4) + 2;
        const y = height - h;
        return <rect key={i} x={i * (barW + pad)} y={y} width={barW} height={h} rx={1} fill={color} fillOpacity={0.7} />;
      })}
    </svg>
  );
}
