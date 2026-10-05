"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "motion/react";

const W = 340;
const H = Math.round((W * 1500) / 994);
const D = 34;

export function Book3D({
  rotateX,
  rotateY,
  sheen,
}: {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  sheen: MotionValue<number>;
}) {
  const sheenPos = useTransform(sheen, (v) => `${v}% 0%`);
  const shadowX = useTransform(rotateY, (v) => v * -1.6);
  const shadowScale = useTransform(rotateY, (v) => 1 - Math.abs(v) / 120);

  return (
    <div className="relative mx-auto flex w-full items-center justify-center [perspective:1800px]">
      <motion.div
        aria-hidden="true"
        style={{ x: shadowX, scaleX: shadowScale }}
        className="absolute bottom-[-6%] left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-[#2a1612]/75 blur-2xl"
      />
      <div className="relative transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cover:-translate-y-3 group-focus-visible/cover:-translate-y-3">
        <motion.div
          style={{
            rotateX,
            rotateY,
            aspectRatio: `${W} / ${H}`,
            transformStyle: "preserve-3d",
          }}
          className="relative w-[min(340px,64vw)] md:w-[min(340px,34vw)]"
        >
          {/* Back */}
          <div
            className="absolute inset-0 rounded-[3px] bg-[#e9e3d8]"
            style={{ transform: `translateZ(${-D}px)` }}
          />
          {/* Spine */}
          <div
            className="absolute inset-y-0 left-0 flex origin-left items-center justify-center overflow-hidden bg-gradient-to-r from-[#d9d3c8] via-white to-[#e2dcd1]"
            style={{ width: D, transform: "rotateY(90deg)" }}
          >
            <span className="-scale-x-100 whitespace-nowrap text-[10px] font-black tracking-[0.12em] text-black [writing-mode:vertical-rl]">
              PRACTICAL <span className="text-[#ad4f36]">SYSTEM</span> DESIGN
              <span className="ml-4 font-semibold text-black/60">ADEWALE OBADIMU</span>
            </span>
          </div>
          {/* Page block */}
          <div
            className="absolute inset-y-[4px] right-0 origin-right"
            style={{
              width: D - 2,
              transform: "rotateY(-90deg)",
              background: "repeating-linear-gradient(90deg, #f7f2ea 0 1px, #d9d0c2 1px 2px, #efe8dc 2px 3px)",
            }}
          />
          {/* Cover */}
          <div className="absolute inset-0 overflow-hidden rounded-r-[4px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <Image
              src="/projects/practical-system-design.png"
              alt=""
              fill
              sizes="(min-width: 768px) 340px, 64vw"
              className="object-cover"
            />
            <div className="absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/25 via-black/5 to-transparent" />
            <div className="absolute inset-y-0 left-[3.2%] w-px bg-black/10" />
            <motion.div
              style={{ backgroundPosition: sheenPos }}
              className="absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.55)_45%,rgba(255,255,255,0.1)_52%,transparent_62%)] bg-[length:300%_100%] mix-blend-soft-light"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/15" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
