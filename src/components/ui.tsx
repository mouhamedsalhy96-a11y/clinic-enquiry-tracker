import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  inbox: <><path d="M4 4h16v16H4z" /><path d="M4 13h5l2 3h2l2-3h5" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  external: <><path d="M14 4h6v6m0-6L10 14" /><path d="M11 4H4v16h16v-7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  phone: <path d="M6 3h4l1 5-2 2a15 15 0 0 0 5 5l2-2 5 1v4a3 3 0 0 1-3 3C10 20 4 14 3 6a3 3 0 0 1 3-3Z" />,
  note: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" /></>,
  reset: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>,
  filter: <><path d="M4 7h16M7 12h10M10 17h4"/><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
};
export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Brand() {
  return <span className="brand"><span className="brand-symbol" aria-hidden="true"><span /><span /></span>enquiry<span className="brand-period">.</span></span>;
}
export function DemoNotice() {
  return <div className="demo-notice"><span className="demo-dot" /><strong>Portfolio demo</strong><span>Fictional data only · No medical care or urgent requests.</span></div>;
}

