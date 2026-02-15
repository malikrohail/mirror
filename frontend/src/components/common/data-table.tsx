import { type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  /** Fixed width class, e.g. "w-20". Omit for flex-1. */
  width?: string;
  /** Alignment: 'left' (default), 'right', 'center' */
  align?: 'left' | 'right' | 'center';
  /** Responsive breakpoint to show column: 'sm', 'md', 'lg'. Always visible if omitted. */
  hideBelow?: 'sm' | 'md' | 'lg';
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyFn: (item: T) => string;
  /** Makes each row a clickable div */
  onRowClick?: (item: T) => void;
  /** Makes each row a <Link>. Takes precedence over onRowClick. */
  hrefFn?: (item: T) => string;
  selectedKey?: string | null;
  emptyMessage?: string;
}

const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const hideCls = { sm: 'hidden sm:block', md: 'hidden md:block', lg: 'hidden lg:block' } as const;

function RowCells<T>({ columns, item }: { columns: DataTableColumn<T>[]; item: T }) {
  return (
    <>
      {columns.map((col) => (
        <span
          key={col.key}
          className={cn(
            col.width ? `shrink-0 ${col.width}` : 'min-w-0 flex-1 truncate',
            alignCls[col.align ?? 'left'],
            col.hideBelow && hideCls[col.hideBelow],
          )}
        >
          {col.render(item)}
        </span>
      ))}
    </>
  );
}

export function DataTable<T>({ columns, data, keyFn, onRowClick, hrefFn, selectedKey, emptyMessage = 'No data' }: DataTableProps<T>) {
  const interactive = !!(hrefFn || onRowClick);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-3 py-2 text-[11px] uppercase tracking-wider font-medium text-foreground/30">
        {columns.map((col) => (
          <span
            key={col.key}
            className={cn(
              col.width ? `shrink-0 ${col.width}` : 'min-w-0 flex-1',
              alignCls[col.align ?? 'left'],
              col.hideBelow && hideCls[col.hideBelow],
            )}
          >
            {col.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      {data.length > 0 ? (
        data.map((item) => {
          const key = keyFn(item);
          const rowCls = cn(
            'flex items-center gap-4 border-b border-border px-3 py-2.5 text-[14px] transition-colors last:border-b-0',
            interactive && 'cursor-pointer hover:bg-muted/50',
            selectedKey === key && 'bg-muted/50',
          );

          if (hrefFn) {
            return (
              <Link key={key} href={hrefFn(item)} className={rowCls}>
                <RowCells columns={columns} item={item} />
              </Link>
            );
          }

          return (
            <div
              key={key}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={rowCls}
            >
              <RowCells columns={columns} item={item} />
            </div>
          );
        })
      ) : (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
