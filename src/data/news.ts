import { book } from "@/data/writing";

export type NewsLink = { label: string; href: string };

export type NewsStory = {
  id: string;
  kind: "Book" | "Scholarship" | "Award" | "Research" | "Profile" | "Music";
  title: string;
  blurb: string;
  source: string;
  date: string;
  dateLabel: string;
  href: string;
  linkLabel: string;
  image?: string;
  imageAlt: string;
  credit: string;
  fit?: "cover" | "contain";
  also?: NewsLink[];
};

/** Positive public coverage. Facts and dates come from the linked pages. */
export const newsStories: NewsStory[] = [
  {
    id: "cosmos-book",
    kind: "Book",
    title: "Practical System Design, in the COSMOS corner",
    blurb:
      "On October 25, 2026, COSMOS published a corner on the book. Adewale Obadimu writes about production failures, from connection pools and retries through deployment.",
    source: "COSMOS, UA Little Rock",
    date: "2026-10-25",
    dateLabel: "October 25, 2026",
    href: "https://cosmos.ualr.edu/cosmographer-corner-from-cosmos-to-production-systems-dr-adewale-obadimus-journey/",
    linkLabel: "Read the COSMOS corner",
    image: "/news/cosmos-corner.png",
    imageAlt:
      "COSMOS graphic for From COSMOS to Production Systems, with a portrait of Adewale Obadimu and the Practical System Design cover.",
    credit: "Image from the COSMOS newsletter, October 2026.",
    fit: "cover",
    also: [{ label: "Buy the book", href: book.href }],
  },
  {
    id: "oau-scholarship",
    kind: "Scholarship",
    title: "Annual awards at Obafemi Awolowo University",
    blurb:
      "He funds an annual scholarship for students in the Faculty of Computing Science and Engineering at Obafemi Awolowo University, where he studied computer science. The September 22 note recognizes the 2023/2024 recipients.",
    source: "Adewale Obadimu on LinkedIn",
    date: "2026-09-01",
    dateLabel: "September 1, 2026",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7500649518338756609",
    linkLabel: "Read the announcement",
    image: "/news/oau-recipients.jpg",
    imageAlt:
      "Poster of the 2023/2024 Academic Excellence Scholarship recipients in the Faculty of Computing Science and Engineering at Obafemi Awolowo University.",
    credit: "Graphic from the September 22, 2026 LinkedIn note.",
    fit: "contain",
    also: [
      {
        label: "Recipients note",
        href: "https://www.linkedin.com/posts/obadimu_oau-academicexcellence-scholarship-activity-7508264811906961408-ZI-X",
      },
      {
        label: "Campus listing",
        href: "https://adroittutors.com/opportunity/top-50-scholarship-and-funding-opportunities-on-campsu-that-oau-students-should-know/",
      },
    ],
  },
  {
    id: "queen-tonight",
    kind: "Music",
    title: "Queen Tonight",
    blurb:
      "Queen Tonight is a single released under the name Baodium. Apple Music lists the recording in 2025.",
    source: "Apple Music",
    date: "2025",
    dateLabel: "2025",
    href: "https://music.apple.com/in/album/queen-tonight-single/1827702711",
    linkLabel: "Listen on Apple Music",
    image: "/news/queen-tonight.jpg",
    imageAlt: "Cover art for Queen Tonight, a portrait outdoors in a red hat.",
    credit: "Artwork from Apple Music.",
    fit: "cover",
  },
  {
    id: "cosmos-profile",
    kind: "Profile",
    title: "The COSMOS team page",
    blurb:
      "The page notes a computer science degree from Obafemi Awolowo University in 2013, software work before Little Rock, and research on social bots.",
    source: "COSMOS, UA Little Rock",
    date: "2024-09-05",
    dateLabel: "September 5, 2024",
    href: "https://cosmos.ualr.edu/adewale-obadimu/",
    linkLabel: "Open the team page",
    image: "/news/cosmos-profile.png",
    imageAlt: "Portrait of Adewale Obadimu published on the COSMOS team page.",
    credit: "Photograph from the COSMOS team page.",
    fit: "cover",
  },
  {
    id: "dissertation",
    kind: "Research",
    title: "Assessing the Role of Social Media Platforms in the Propagation of Toxicity",
    blurb:
      "The 2020 PhD in computer science, advised by Nitin Agarwal, studies how toxicity spreads on social platforms.",
    source: "UA Little Rock ScholarWorks",
    date: "2020",
    dateLabel: "2020",
    href: "https://research.ualr.edu/etd/955/",
    linkLabel: "Open the dissertation",
    imageAlt: "",
    credit: "The repository page has no portrait.",
  },
  {
    id: "cosmos-award",
    kind: "Award",
    title: "Outstanding COSMOS Research Award",
    blurb:
      "COSMOS posted the UA Little Rock Open House results. The Outstanding COSMOS Research Award went to Nihal Hussain Muhammad, Adewale Obadimu, and Zachary Stine.",
    source: "COSMOS Research Center",
    date: "2019-05-10",
    dateLabel: "May 10, 2019",
    href: "https://www.linkedin.com/posts/cosmosatualr_our-cosmographers-were-presented-with-numerous-activity-6532601085792706560-FNFZ",
    linkLabel: "Read the COSMOS post",
    image: "/news/cosmos-award.jpg",
    imageAlt:
      "Group photograph from the COSMOS post about the UA Little Rock Open House awards ceremony.",
    credit: "Photograph from the COSMOS Research Center post.",
    fit: "cover",
  },
  {
    id: "lewermark",
    kind: "Scholarship",
    title: "Second place in Make Your Mark",
    blurb:
      "UA Little Rock reported a $1,000 award for his second-place essay in the LewerMark contest. The story also records his software engineering teaching and his research with Nitin Agarwal.",
    source: "UA Little Rock News",
    date: "2017-05-30",
    dateLabel: "May 30, 2017",
    href: "https://ualr.edu/news-archive/2017/05/30/obadimu-scholarship-lewermark/",
    linkLabel: "Read the university story",
    image: "/news/ualr-lewermark.jpg",
    imageAlt: "Portrait of Adewale Obadimu published with the UA Little Rock story.",
    credit: "Photograph from UA Little Rock News, May 30, 2017.",
    fit: "cover",
  },
];
