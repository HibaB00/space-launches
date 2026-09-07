import type { Launch } from './launches'

type Props = {
  image: Launch['image']
  alt: string
  className?: string
  thumb?: boolean
  eager?: boolean
  width: number
  height: number
}

/** A launch photo, or a hatched placeholder when LL2 has none. Never a broken image. */
export function Photo({ image, alt, className = '', thumb = false, eager = false, width, height }: Props) {
  if (!image) {
    return (
      <div
        aria-hidden="true"
        className={`bg-[repeating-linear-gradient(135deg,transparent_0_8px,var(--border)_8px_9px)] ${className}`}
        style={{ aspectRatio: `${width} / ${height}` }}
      />
    )
  }
  return (
    <img
      src={thumb ? image.thumb : image.url}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  )
}
