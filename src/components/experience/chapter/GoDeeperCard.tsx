export function GoDeeperCard({ url }: { url: string }) {
  return (
    <section className="rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-5 text-[#241c18]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b4532a]">Live lab</p>
      <h2 className="mt-2 text-xl">Run the same store with real services</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#6f625a]">
        About 45 minutes. Real services in your browser, nothing to install.
      </p>
      {url ? (
        <a
          href={url}
          className="mt-4 inline-flex rounded-lg bg-[#b4532a] px-3.5 py-2 text-sm font-semibold text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the Killercoda lab
        </a>
      ) : (
        <p className="mt-4 text-sm">
          The launch link reads <code>NEXT_PUBLIC_KILLERCODA_URL_CH01</code>. It is empty in this
          build, so the button stays off until that address is set.
        </p>
      )}
      <h3 className="mt-6 text-base">On your own machine</h3>
      <p className="mt-1 text-sm leading-relaxed text-[#6f625a]">
        Vercel cannot run Docker. From the chapter pack, next to the commerce base:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-[#241c18] p-3 text-sm text-[#f6f1ea]">{`./build-lab.sh ../baodium-commerce-base
./dev-up.sh ../baodium-commerce-base`}</pre>
      <p className="mt-3 text-sm leading-relaxed text-[#6f625a]">
        Killercoda ends the session when the learner closes the tab or time runs out. Locally,{" "}
        <code>baodium teardown</code> stops and removes the chapter&apos;s containers and data and
        keeps the learner&apos;s edited files.
      </p>
    </section>
  );
}
