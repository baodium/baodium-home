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
          background: "#0c0b0a",
          color: "#f3efe8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 96,
          borderBottom: "10px solid #c4a27a",
        }}
      >
        B
      </div>
    ),
    { ...size },
  );
}
