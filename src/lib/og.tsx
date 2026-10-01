import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4efe6",
          color: "#1c1915",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            letterSpacing: "0.28em",
            fontSize: 18,
            color: "#e23b16",
          }}
        >
          BAODIUM
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.18em",
              color: "#1b5c40",
            }}
          >
            ADEWALE OBADIMU
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              lineHeight: 0.95,
              marginTop: 24,
            }}
          >
            <div style={{ display: "flex" }}>Engineer.</div>
            <div style={{ display: "flex" }}>Builder.</div>
            <div style={{ display: "flex" }}>Author.</div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
