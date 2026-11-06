export function GoDeeperCard({ url, unavailable = false }: { url: string; unavailable?: boolean }) {
  return (
    <section className="rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-8 text-[#241c18] sm:p-10">
      <h2 className="font-serif text-[1.85rem] leading-snug tracking-[-0.02em]">
        {unavailable ? "The lab machine is not answering" : "Start the store"}
      </h2>
      <p className="mt-4 max-w-[42rem] text-lg leading-relaxed text-[#3d322c]">
        {unavailable
          ? "This page will not start a machine here. Start the store on your own machine. The product page still calls Recommendation Service, and that call still waits on the pool of 40."
          : "The product page calls Recommendation Service. Each lookup borrows one of 40 connections. Start the store and turn the flag on."}
      </p>
      {url ? (
        <a
          href={url}
          className="mt-8 inline-flex rounded-lg bg-[#b4532a] px-4 py-2.5 text-base font-semibold text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          Start lab
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
      <h3 className="mt-10 font-serif text-[1.35rem]">On your own machine</h3>
      <p className="mt-3 text-lg leading-relaxed text-[#3d322c]">
        From the chapter pack, next to the commerce base:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-[#241c18] p-4 text-base text-[#f6f1ea]">{`./build-lab.sh ../baodium-commerce-base
./dev-up.sh ../baodium-commerce-base`}</pre>
      <p className="mt-4 text-lg leading-relaxed text-[#3d322c]">
        When you are done, <code>baodium teardown</code> stops and removes the chapter&apos;s
        containers and data and keeps the files you edited.
      </p>
    </section>
  );
}
