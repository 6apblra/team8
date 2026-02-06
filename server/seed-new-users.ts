import { db } from "./db";
import { users, profiles, games, userGames } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

const NEW_USERS = [
  {
    email: "tanker@demo.com",
    password: "demo123",
    profile: {
      nickname: "TankMaster",
      bio: "World of Tanks pro. Heavy tank specialist. Looking for platoon!",
      region: "eu",
      languages: ["ru", "en"],
      micEnabled: true,
      discordTag: "tankmaster#1111",
      age: 28,
    },
    games: [
      {
        gameId: "wot",
        rank: "Super Unicum",
        roles: ["Heavy", "TD"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
    ],
  },
  {
    email: "legend@demo.com",
    password: "demo123",
    profile: {
      nickname: "ApexLegend",
      bio: "Apex Predator. Main Wraith & Octane. Fast paced aggressive playstyle!",
      region: "na",
      languages: ["en"],
      micEnabled: true,
      discordTag: "apexlegend#2222",
      age: 24,
    },
    games: [
      {
        gameId: "apex",
        rank: "Predator",
        roles: ["Wraith", "Octane"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "valorant",
        rank: "Immortal 1",
        roles: ["Duelist"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: false,
      },
    ],
  },
  {
    email: "chill@demo.com",
    password: "demo123",
    profile: {
      nickname: "ChillGamer99",
      bio: "Just here to have fun! Play multiple games casually. No rage pls :)",
      region: "eu",
      languages: ["en", "fr"],
      micEnabled: false,
      discordTag: "chillgamer#3333",
      age: 20,
    },
    games: [
      {
        gameId: "fortnite",
        rank: "Diamond",
        roles: ["Builder"],
        playstyle: "casual",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "apex",
        rank: "Platinum",
        roles: ["Lifeline", "Gibraltar"],
        playstyle: "casual",
        platform: "Console",
        isPrimary: false,
      },
    ],
  },
  {
    email: "nina@demo.com",
    password: "demo123",
    profile: {
      nickname: "NinaCS",
      bio: "Female CS2 player. FACEIT Level 10. Looking for serious team.",
      region: "eu",
      languages: ["en", "pl"],
      micEnabled: true,
      discordTag: "ninacs#4444",
      age: 23,
    },
    games: [
      {
        gameId: "cs2",
        rank: "Global Elite",
        roles: ["Rifle", "Support"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "valorant",
        rank: "Ascendant 3",
        roles: ["Controller", "Sentinel"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: false,
      },
    ],
  },
  {
    email: "john@demo.com",
    password: "demo123",
    profile: {
      nickname: "JohnDota",
      bio: "Ancient player trying to reach Divine. Pos 3/4 player. EU West.",
      region: "eu",
      languages: ["en"],
      micEnabled: true,
      discordTag: "johndota#5555",
      age: 26,
    },
    games: [
      {
        gameId: "dota2",
        rank: "Ancient 3",
        roles: ["Pos 3", "Pos 4"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "wot",
        rank: "Unicum",
        roles: ["Medium", "Light"],
        playstyle: "casual",
        platform: "PC",
        isPrimary: false,
      },
    ],
  },
];

async function seedNewUsers() {
  console.log("🌱 Adding new test users...");

  // Ensure new games exist
  const existingGames = await db.select().from(games);
  const existingIds = new Set(existingGames.map((g) => g.id));

  const newGames = [
    { id: "wot", name: "World of Tanks", icon: "wot" },
    { id: "apex", name: "Apex Legends", icon: "apex" },
  ];

  for (const game of newGames) {
    if (!existingIds.has(game.id)) {
      console.log(`📎 Adding game: ${game.name}`);
      await db.insert(games).values(game);
    }
  }

  let created = 0;
  let skipped = 0;

  // Create new users
  for (const userData of NEW_USERS) {
    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email));

    if (existing.length > 0) {
      console.log(`⏭️  Skipping ${userData.email} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`👤 Creating user: ${userData.email}`);

    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
      })
      .returning();

    // Create profile
    await db.insert(profiles).values({
      userId: user.id,
      nickname: userData.profile.nickname,
      bio: userData.profile.bio,
      region: userData.profile.region,
      languages: userData.profile.languages,
      micEnabled: userData.profile.micEnabled,
      discordTag: userData.profile.discordTag,
      age: userData.profile.age,
    });

    // Create user games
    for (const game of userData.games) {
      await db.insert(userGames).values({
        userId: user.id,
        gameId: game.gameId,
        rank: game.rank,
        roles: game.roles,
        playstyle: game.playstyle,
        platform: game.platform,
        isPrimary: game.isPrimary,
      });
    }

    created++;
  }

  console.log("");
  console.log("✅ Done!");
  console.log(`   - ${created} new users created`);
  console.log(`   - ${skipped} users skipped (already existed)`);
  console.log("");
  console.log("📧 New accounts (password: demo123):");
  NEW_USERS.forEach((u) =>
    console.log(`   - ${u.email} (${u.profile.nickname})`),
  );
}

// Run
seedNewUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
