import { GameColors } from "@/constants/theme";

export const GAMES = [
  { id: "valorant", name: "Valorant", icon: "valorant" },
  { id: "cs2", name: "CS2", icon: "cs2" },
  { id: "dota2", name: "Dota 2", icon: "dota2" },
  { id: "fortnite", name: "Fortnite", icon: "fortnite" },
  { id: "lol", name: "League of Legends", icon: "lol" },
  { id: "wot", name: "World of Tanks", icon: "wot" },
  { id: "apex", name: "Apex Legends", icon: "apex" },
];

export const RANKS = {
  valorant: [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Ascendant",
    "Immortal",
    "Radiant",
  ],
  cs2: [
    "Silver",
    "Gold Nova",
    "Master Guardian",
    "Distinguished",
    "Legendary Eagle",
    "Supreme",
    "Global Elite",
  ],
  dota2: [
    "Herald",
    "Guardian",
    "Crusader",
    "Archon",
    "Legend",
    "Ancient",
    "Divine",
    "Immortal",
  ],
  fortnite: ["Open", "Contender", "Champion", "Unreal"],
  lol: [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
  ],
  wot: [
    "Beginner",
    "Average",
    "Good",
    "Very Good",
    "Great",
    "Unicum",
    "Super Unicum",
  ],
  apex: [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
    "Apex Predator",
  ],
};

export const ROLES = {
  valorant: ["Duelist", "Controller", "Initiator", "Sentinel"],
  cs2: ["Entry", "AWPer", "Support", "Lurker", "IGL"],
  dota2: ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"],
  fortnite: ["Fragger", "Support", "IGL"],
  lol: ["Top", "Jungle", "Mid", "ADC", "Support"],
  wot: ["Heavy", "Medium", "Light", "TD", "SPG"],
  apex: ["Assault", "Skirmisher", "Recon", "Controller", "Support"],
};

export const PLAYSTYLES = [
  { id: "competitive", label: "Competitive", icon: "target" },
  { id: "flex", label: "Flex", icon: "zap" },
  { id: "casual", label: "Casual", icon: "smile" },
];

export const PLATFORMS = [
  { id: "pc", label: "PC" },
  { id: "ps5", label: "PlayStation" },
  { id: "xbox", label: "Xbox" },
  { id: "mobile", label: "Mobile" },
];

export const REGIONS = [
  { id: "na", label: "North America" },
  { id: "eu", label: "Europe" },
  { id: "asia", label: "Asia" },
  { id: "oce", label: "Oceania" },
  { id: "latam", label: "Latin America" },
  { id: "mena", label: "Middle East" },
];

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "pt", label: "Portuguese" },
  { id: "ru", label: "Russian" },
  { id: "de", label: "German" },
  { id: "fr", label: "French" },
  { id: "ko", label: "Korean" },
  { id: "ja", label: "Japanese" },
  { id: "zh", label: "Chinese" },
];

export const DAYS_OF_WEEK = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

export const TIME_SLOTS = [
  { id: "morning", label: "Morning", start: "06:00", end: "12:00" },
  { id: "afternoon", label: "Afternoon", start: "12:00", end: "18:00" },
  { id: "evening", label: "Evening", start: "18:00", end: "00:00" },
  { id: "night", label: "Night", start: "00:00", end: "06:00" },
];

export const QUICK_MESSAGES = [
  "Ready to play?",
  "What role do you need?",
  "Got time for a few games?",
  "Add me on Discord!",
  "Want to team up later?",
];

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment" },
  { id: "spam", label: "Spam" },
  { id: "fake", label: "Fake Profile" },
  { id: "inappropriate", label: "Inappropriate Content" },
  { id: "other", label: "Other" },
];

export function getGameColor(gameIcon: string): string {
  return GameColors[gameIcon] || "#00D9FF";
}
