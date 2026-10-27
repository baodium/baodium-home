export const site = {
  name: "Adewale Obadimu",
  credit: "Adewale Obadimu, PhD",
  brand: "BAODIUM",
  url: "https://baodium.com",
  title: "Baodium — products and technical publishing",
  description:
    "Baodium is Adewale Obadimu’s home for products and technical publishing — reliability, infrastructure, and AI.",
  // Real profile URLs. Leave a value blank until it exists — the footer does not render empty links.
  github: "",
  linkedin: "https://www.linkedin.com/in/obadimu",
  scholar: "https://scholar.google.com/citations?user=qcbM1kAAAAAJ&hl=en",
  scholarCitations: "333",
  email: "mailto:baodium@gmail.com",
  emailLabel: "baodium@gmail.com",
  personal: "https://obadimu.com",
  dissertation: "https://research.ualr.edu/etd/955/",
} as const;

/**
 * Culture / elsewhere — Scholar lives only on the founder bridge.
 * Keep light; don’t compete with Projects.
 */
export const alsoLinks = [
  {
    group: "listen" as const,
    label: "Mami Say Boom Boom",
    href: "https://www.qobuz.com/dk-en/album/mami-say-boom-boom-baodium/tmx24bb4ca64a",
    note: "Qobuz",
  },
  {
    group: "listen" as const,
    label: "One Hi",
    href: "https://music.apple.com/us/album/one-hi-single/1831748739",
    note: "Apple Music",
  },
  {
    group: "elsewhere" as const,
    label: "LinkedIn",
    href: site.linkedin,
  },
  {
    group: "elsewhere" as const,
    label: "Dissertation",
    href: site.dissertation,
    note: "UALR",
  },
] as const;
