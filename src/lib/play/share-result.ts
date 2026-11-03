/** A cancelled share is intentional; clipboard permissions may also be denied. */
export async function shareResult(data: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(data.text);
    return "copied";
  } catch {
    return "failed";
  }
}
