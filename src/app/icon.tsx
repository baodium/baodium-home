import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0c0b0a",
          color: "#f3efe8",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          fontSize: 20,
          paddingBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "2px solid #c4a27a",
          }}
        >
          B
        </div>
      </div>
    ),
    { ...size },
  );
}
