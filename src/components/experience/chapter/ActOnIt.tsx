export function ActOnIt({
  seen,
  elapsed,
  armed,
}: {
  seen: number;
  elapsed: number | null;
  armed: boolean;
}) {
  if (!armed || elapsed == null) return null;
  return (
    <p className="mt-2 text-sm text-[#241c18]" aria-live="polite">
      {seen} of 8 instances have seen the change · {Math.round(elapsed)} s since you flipped it
    </p>
  );
}
