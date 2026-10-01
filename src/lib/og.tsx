import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export async function OgImage() {
  const portrait = await readFile(path.join(process.cwd(), "public/images/adewale-hero-poster.jpg"));
  const src = `data:image/jpeg;base64,${portrait.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f4efe6",
          color: "#1c1915",
        }}
      >
        <div
          style={{
            width: 680,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 16, height: 16, background: "#e23b16", display: "flex" }} />
            <div style={{ display: "flex", letterSpacing: "0.22em", fontSize: 20 }}>BAODIUM</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 26, color: "#5e564c" }}>Adewale Obadimu</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 68,
                lineHeight: 0.94,
                marginTop: 16,
                letterSpacing: "-0.04em",
              }}
            >
              <div style={{ display: "flex" }}>Engineer.</div>
              <div style={{ display: "flex" }}>Builder.</div>
              <div style={{ display: "flex" }}>Author.</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", width: 520, height: 630, overflow: "hidden" }}>
          {/* ImageResponse only accepts an img element, not next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            width={900}
            height={630}
            style={{
              width: 900,
              height: 630,
              objectFit: "cover",
              objectPosition: "86% 42%",
            }}
          />
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
