export function GoDeeperCard({ url, unavailable = false }: { url: string; unavailable?: boolean }) {
  return (
    <section className="rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-7 text-[#241c18] sm:p-8">
      {unavailable ? (
        <>
          <h2 className="font-serif text-[1.7rem] leading-snug tracking-[-0.02em]">The lab machine is not answering</h2>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-[#6f625a]">
            The health check returned the website&apos;s 404 page, so this page will not start a
            machine here.
            {url
              ? " Start lab opens the Killercoda scenario."
              : " Start lab stays off until the Killercoda address is set."}
          </p>
        </>
      ) : (
        <>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[#b4532a]">The store</p>
          <h2 className="mt-3 font-serif text-[1.7rem] leading-snug tracking-[-0.02em]">Run the same store with real services</h2>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-[#6f625a]">
            About 45 minutes. Real services in your browser, nothing to install.
          </p>
        </>
      )}
      {url ? (
        <a
          href={url}
          className="mt-6 inline-flex rounded-lg bg-[#b4532a] px-4 py-2.5 text-[0.98rem] font-semibold text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          Start lab
          <span className="sr-only"> (opens the Killercoda scenario in a new tab)</span>
        </a>
      ) : (
        <>
          <button
            type="button"
            disabled
            className="mt-6 inline-flex cursor-not-allowed rounded-lg bg-[#b4532a] px-4 py-2.5 text-[0.98rem] font-semibold text-white opacity-50"
          >
            Start lab
          </button>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-[#6f625a]">
            Start lab reads <code>NEXT_PUBLIC_KILLERCODA_URL_CH01</code>. It is empty in this
            build, so the button stays off until that address is set.
          </p>
        </>
      )}
      <h3 className="mt-8 font-serif text-[1.25rem]">On your own machine</h3>
      <p className="mt-2 text-[1.02rem] leading-relaxed text-[#6f625a]">
        Vercel cannot run Docker. From the chapter pack, next to the commerce base:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-[#241c18] p-3 text-sm text-[#f6f1ea]">{`./build-lab.sh ../baodium-commerce-base
./dev-up.sh ../baodium-commerce-base`}</pre>
      <p className="mt-4 text-[1.02rem] leading-relaxed text-[#6f625a]">
        Killercoda ends the session when the learner closes the tab or time runs out. Locally,{" "}
        <code>baodium teardown</code> stops and removes the chapter&apos;s containers and data and
        keeps the learner&apos;s edited files.
      </p>
    </section>
  );
}
