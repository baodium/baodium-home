import { OgImage, ogContentType, ogSize } from "@/lib/og";

export const alt = "Adewale Obadimu — engineer, builder, and author. Baodium.";
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  return OgImage();
}
