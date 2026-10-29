// Small brand marks drawn inline, since the icon set has no brand logos.
type P = { className?: string };

export const YoutubeIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
  </svg>
);
export const FacebookIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4A21 21 0 0 0 14.3 4c-2.3 0-3.8 1.4-3.8 3.9v2.6H8v3h2.5V21h3Z" />
  </svg>
);
export const InstagramIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);
export const LinkedinIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M5 9h3v10H5V9Zm1.5-5a1.7 1.7 0 1 1 0 3.5 1.7 1.7 0 0 1 0-3.5ZM10 9h2.9v1.4c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V19h-3v-4.8c0-1.2 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V19h-3V9Z" />
  </svg>
);
export const TwitterIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M21 6.5c-.7.3-1.4.5-2.1.6.8-.5 1.3-1.2 1.6-2-.7.4-1.5.7-2.3.9a3.6 3.6 0 0 0-6.2 3.3A10.3 10.3 0 0 1 4.5 5.5a3.6 3.6 0 0 0 1.1 4.8c-.6 0-1.1-.2-1.6-.4 0 1.7 1.2 3.2 2.9 3.6-.5.1-1.1.2-1.6.1.5 1.4 1.8 2.5 3.4 2.5A7.3 7.3 0 0 1 3 17.6 10.3 10.3 0 0 0 8.6 19.2c6.6 0 10.3-5.5 10.3-10.3v-.5c.8-.5 1.5-1.2 2.1-1.9Z" />
  </svg>
);
export const TiktokIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6a6.4 6.4 0 0 1-3.8-1.2v5.6c0 3.5-2.4 6.2-6 6.2a5.7 5.7 0 0 1-5.7-5.8c0-3.6 3.1-6.1 6.7-5.6v2.8c-1.8-.4-3.6.8-3.6 2.8 0 1.6 1.2 2.9 2.8 2.9 1.8 0 2.9-1.2 2.9-3.3V3h2.8Z" />
  </svg>
);
export const AppleIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6a4.4 4.4 0 0 0-3.4-1.9c-1.5-.1-2.8.9-3.5.9s-1.8-.9-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3s1.6-.8 3-.8 1.8.8 3 .7 2-1.1 2.8-2.3a10 10 0 0 0 1.2-2.6 4 4 0 0 1-2.4-3.5ZM14.1 5.5a4 4 0 0 0 .9-2.9 4 4 0 0 0-2.6 1.4 3.8 3.8 0 0 0-1 2.8 3.4 3.4 0 0 0 2.7-1.3Z" />
  </svg>
);
export const PlayIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M4 3.2v17.6c0 .3.1.5.3.7L13.6 12 4.3 2.5c-.2.2-.3.4-.3.7Z" fill="#00d7fe" />
    <path d="m16.7 15.1-3.1-3.1-9.3 9.5c.3.3.8.3 1.3.1l11.1-6.5Z" fill="#f83b4f" />
    <path d="M16.7 8.9 5.6 2.4c-.5-.3-1-.2-1.3.1l9.3 9.5 3.1-3.1Z" fill="#00f076" />
    <path d="m20.4 11-3.7-2.1-3.1 3.1 3.1 3.1 3.7-2.1c.8-.5.8-1.5 0-2Z" fill="#ffc900" />
  </svg>
);
