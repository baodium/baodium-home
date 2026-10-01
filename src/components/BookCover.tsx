import Image from "next/image";

export function BookCover() {
  return (
    <div className="book-scene mx-auto w-full max-w-[26rem] lg:mx-0 lg:max-w-none">
      <div className="book-stand">
        <div className="book-pages" aria-hidden="true" />
        <Image
          src="/projects/practical-system-design.png"
          alt=""
          width={994}
          height={1500}
          className="relative block h-auto w-full bg-white"
        />
      </div>
    </div>
  );
}
