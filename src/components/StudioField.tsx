export function StudioField() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="studio-arc absolute -right-[18vw] -top-[22vh] h-[78vh] w-[78vh] text-line"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="210" cy="190" r="168" stroke="currentColor" />
        <circle cx="210" cy="190" r="112" stroke="currentColor" />
        <path d="M40 300 H360" stroke="currentColor" />
      </svg>
    </div>
  );
}
