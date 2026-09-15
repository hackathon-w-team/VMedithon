export function IconStaff() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 9l2 2m0 0l2-2m-2 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBed() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="11" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 13V8a1 1 0 011-1h4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 10h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconRedirect() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 10h12M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 1l1.5 4.5H13L9.5 8l1.5 4.5L7 10 3 12.5 4.5 8 1 5.5h4.5L7 1z" />
    </svg>
  )
}

export function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#22c55e" />
      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 3.5V7l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5S10.5 11.5 10.5 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.8 9.7c1.8.3 3.2 1.9 3.2 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconLogOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 12.5H3a1 1 0 01-1-1v-9a1 1 0 011-1h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 9.5L13 6 9.5 2.5M13 6H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ActionIcon({ type }: { type: 'staff' | 'bed' | 'redirect' }) {
  if (type === 'staff') return <IconStaff />
  if (type === 'bed') return <IconBed />
  return <IconRedirect />
}
