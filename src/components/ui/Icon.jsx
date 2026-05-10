import { cn } from './classNames.js';

const paths = {
  arrowDown: <path d="M12 5v14m0 0l-5-5m5 5l5-5" />,
  arrowLeft: <path d="M19 12H5m0 0l5-5m-5 5l5 5" />,
  arrowRight: <path d="M5 12h14m0 0l-5-5m5 5l-5 5" />,
  arrowUp: <path d="M12 19V5m0 0l-5 5m5-5l5 5" />,
  back: <path d="M15 18l-6-6 6-6" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="9.2" cy="9.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="9.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.6" cy="13.7" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M5 5h14v14H5z" />
      <path d="M8 15l2.5-3 2 2 3.5-5" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 13l4 4L19 7" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  device: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M14 7l3 3" />
    </>
  ),
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 5v5h5" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 14l2.5-2.5L14 15l2-2 3 3" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  memo: (
    <>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </>
  ),
  tools: (
    <>
      <path d="M14 6l4 4" />
      <path d="M5 19l7.5-7.5" />
      <path d="M13 5l6 6-2.5 2.5-6-6z" />
      <path d="M4 7l3-3 3 3-3 3z" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" />
      <path d="M10.5 11v5" />
      <path d="M13.5 11v5" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </>
  ),
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 2 }) {
  if (!paths[name]) return null;

  return (
    <svg
      aria-hidden="true"
      className={cn('shrink-0', className)}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
