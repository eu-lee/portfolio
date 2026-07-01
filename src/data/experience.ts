// Content for the /experience route: the left panel stacks these categories and
// their entries, the right CONTENTS rail scroll-spies between them. Each category
// gets a colored dot (matched to the LEGO palette) that reads in both places.

export type ExperienceEntry = {
  title: string;
  sub: string;
  meta: string;
  // Highlights an award/placement so the meta reads in the accent yellow.
  win?: boolean;
};

export type ExperienceCategory = {
  key: string;
  label: string;
  color: string;
  entries: ExperienceEntry[];
};

export const experience: ExperienceCategory[] = [
  {
    key: "work",
    label: "Work",
    color: "#68C3E2",
    entries: [
      {
        title: "Eureka DevSecOps",
        sub: "Software Engineer — Security Agents",
        meta: "2025 — PRESENT"
      }
    ]
  },
  {
    key: "teams",
    label: "Design Teams",
    color: "#E06A6A",
    entries: [
      {
        title: "WATonomous · Autonomy",
        sub: "Perception & Autonomy Stack — ROS2, CUDA",
        meta: "2024 — PRESENT"
      },
      {
        title: "WATonomous · Humanoid",
        sub: "Vision — dexterous manipulation",
        meta: "2025 — PRESENT"
      }
    ]
  },
  {
    key: "hackathons",
    label: "Hackathons",
    color: "#FAC80A",
    entries: [
      { title: "Motion", sub: "Modular notes app", meta: "🥇 1ST · YVRHACKS", win: true },
      {
        title: "PlantHopper",
        sub: "Automated plant-watering turret",
        meta: "🥇 1ST · HACK THE VALLEY X",
        win: true
      },
      { title: "Adify", sub: "Turns b-roll into polished ads", meta: "TRACK WIN · LISTENHACKS", win: true }
    ]
  },
  {
    key: "hardware",
    label: "Hardware",
    color: "#8b9296",
    entries: [
      { title: "Muon Watcher", sub: "Muon detector filmed at 30km altitude", meta: "BUILT" },
      { title: "PlantHopper", sub: "Soil-tracking water-gun turret", meta: "BUILT" }
    ]
  }
];
