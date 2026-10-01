import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a2e28",
          color: "#fbf7f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 96,
          borderBottom: "12px solid #e23b16",
        }}
      >
        B
      </div>
    ),
    { ...size },
  );
}
