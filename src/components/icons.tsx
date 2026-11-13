import type { Delivery, Status } from '../domain/types';

/* Inline SVG icons. Sizes come from the surrounding CSS. */

const truckPaths = (
  <>
    <path d="M2 6h12v10H2zM14 10h4.5l3.5 3.5V16h-8z" />
    <circle cx="6.5" cy="17.5" r="1.8" fill="currentColor" />
    <circle cx="17.5" cy="17.5" r="1.8" fill="currentColor" />
  </>
);
const boxPaths = (
  <>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" strokeLinecap="round" />
  </>
);

export const StatusIcon = ({ status }: { status: Status }) => {
  switch (status) {
    case 'todo':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case 'looking':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      );
    case 'bought':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      );
  }
};

export const DeliveryIcon = ({ delivery }: { delivery: Delivery }) => {
  switch (delivery) {
    case 'pending':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'shipped':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
          {truckPaths}
        </svg>
      );
    case 'delivered':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          {boxPaths}
        </svg>
      );
  }
};

export const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
    {truckPaths}
  </svg>
);

export const DeliveredIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
    {boxPaths}
  </svg>
);

export const NoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 4h14v16H5zM9 9h6M9 13h6" />
  </svg>
);

export const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const BringFrontIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="3.5" y="9.5" width="11" height="11" rx="2" strokeDasharray="2.6 2.2" />
    <rect x="9.5" y="3.5" width="11" height="11" rx="2" fill="currentColor" fillOpacity=".25" />
  </svg>
);

export const SendBackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="9.5" y="3.5" width="11" height="11" rx="2" strokeDasharray="2.6 2.2" />
    <rect x="3.5" y="9.5" width="11" height="11" rx="2" fill="currentColor" fillOpacity=".25" />
  </svg>
);

export const FlipIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" strokeDasharray="2 2.4" />
    <path d="M9 6 3 18h6zM15 6l6 12h-6z" />
  </svg>
);

export const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5" />
  </svg>
);
