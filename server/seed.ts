import { db } from "./db";
import {
  users,
  profiles,
  games,
  userGames,
  matches,
  messages,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

const DEMO_USERS = [
  {
    email: "alex@demo.com",
    password: "demo123",
    profile: {
      nickname: "AlexGamer",
      bio: "Competitive Valorant player, looking for teammates for ranked. Diamond 2.",
      region: "eu",
      languages: ["en", "ru"],
      micEnabled: true,
      discordTag: "alexgamer#1234",
      age: 22,
    },
    games: [
      {
        gameId: "valorant",
        rank: "Diamond 2",
        roles: ["Duelist", "Initiator"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "cs2",
        rank: "Global Elite",
        roles: ["Entry", "AWP"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: false,
      },
    ],
  },
  {
    email: "maria@demo.com",
    password: "demo123",
    profile: {
      nickname: "MariaPlays",
      bio: "Casual gamer, love Fortnite and chill vibes. No toxicity please!",
      region: "na",
      languages: ["en", "es"],
      micEnabled: true,
      discordTag: "mariaplays#5678",
      age: 19,
    },
    games: [
      {
        gameId: "fortnite",
        rank: "Champion",
        roles: ["Builder", "Support"],
        playstyle: "casual",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "lol",
        rank: "Platinum 3",
        roles: ["Support", "ADC"],
        playstyle: "casual",
        platform: "PC",
        isPrimary: false,
      },
    ],
  },
  {
    email: "dmitry@demo.com",
    password: "demo123",
    profile: {
      nickname: "DmitryPro",
      bio: "Semi-pro Dota 2 player. 7k MMR. Looking for stack.",
      region: "eu",
      languages: ["ru", "en"],
      micEnabled: true,
      discordTag: "dmitrypro#9012",
      age: 25,
    },
    games: [
      {
        gameId: "dota2",
        rank: "Divine 5",
        roles: ["Pos 1", "Pos 2"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
    ],
  },
  {
    email: "sarah@demo.com",
    password: "demo123",
    profile: {
      nickname: "SarahLOL",
      bio: "League addict. One trick Jinx. Let's duo!",
      region: "na",
      languages: ["en"],
      micEnabled: false,
      discordTag: "sarahlol#3456",
      age: 21,
    },
    games: [
      {
        gameId: "lol",
        rank: "Diamond 1",
        roles: ["ADC"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
      {
        gameId: "valorant",
        rank: "Platinum 2",
        roles: ["Sentinel"],
        playstyle: "casual",
        platform: "PC",
        isPrimary: false,
      },
    ],
  },
  {
    email: "mike@demo.com",
    password: "demo123",
    profile: {
      nickname: "MikeTheSniper",
      bio: "CS2 veteran. 15 years of experience. Teaching new players!",
      region: "eu",
      languages: ["en", "de"],
      micEnabled: true,
      discordTag: "mikesniper#7890",
      age: 30,
    },
    games: [
      {
        gameId: "cs2",
        rank: "Global Elite",
        roles: ["AWP", "IGL"],
        playstyle: "competitive",
        platform: "PC",
        isPrimary: true,
      },
    ],
  },
  // NEW TEST USERS
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

async function seedDatabase() {
  console.log("🌱 Starting database seed...");

  // Check if games exist, seed if not
  const existingGames = await db.select().from(games);
  if (existingGames.length === 0) {
    console.log("📎 Seeding games...");
    await db.insert(games).values([
      { id: "valorant", name: "Valorant", icon: "valorant" },
      { id: "cs2", name: "CS2", icon: "cs2" },
      { id: "dota2", name: "Dota 2", icon: "dota2" },
      { id: "fortnite", name: "Fortnite", icon: "fortnite" },
      { id: "lol", name: "League of Legends", icon: "lol" },
      { id: "wot", name: "World of Tanks", icon: "wot" },
      { id: "apex", name: "Apex Legends", icon: "apex" },
    ]);
  }

  // Check if demo users exist
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, "alex@demo.com"));
  if (existingUser.length > 0) {
    console.log("⚠️  Demo users already exist, skipping user seed.");
    return;
  }

  const createdUserIds: string[] = [];

  // Create users and profiles
  for (const userData of DEMO_USERS) {
    console.log(`👤 Creating user: ${userData.email}`);

    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
      })
      .returning();

    createdUserIds.push(user.id);

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
  }

  // Create some matches between users
  console.log("💕 Creating demo matches...");

  if (createdUserIds.length >= 4) {
    // Match: Alex + Maria
    const [match1] = await db
      .insert(matches)
      .values({
        user1Id: createdUserIds[0],
        user2Id: createdUserIds[1],
      })
      .returning();

    // Add some messages to the match
    await db.insert(messages).values([
      {
        matchId: match1.id,
        senderId: createdUserIds[0],
        content: "Hey! Saw you play Fortnite, wanna team up sometime?",
      },
      {
        matchId: match1.id,
        senderId: createdUserIds[1],
        content: "Sure! I'm usually online in the evenings 🎮",
      },
      {
        matchId: match1.id,
        senderId: createdUserIds[0],
        content: "Perfect, I'll add you on Discord!",
      },
    ]);

    // Match: Dmitry + Mike
    const [match2] = await db
      .insert(matches)
      .values({
        user1Id: createdUserIds[2],
        user2Id: createdUserIds[4],
      })
      .returning();

    await db.insert(messages).values([
      {
        matchId: match2.id,
        senderId: createdUserIds[2],
        content: "Nice profile! Do you ever play Dota?",
      },
      {
        matchId: match2.id,
        senderId: createdUserIds[4],
        content: "Rarely, but I'm willing to learn from a pro!",
      },
    ]);

    // Match: Sarah + Maria
    await db.insert(matches).values({
      user1Id: createdUserIds[3],
      user2Id: createdUserIds[1],
    });
  }

  console.log("✅ Database seed completed!");
  console.log(`   - ${DEMO_USERS.length} users created`);
  console.log(`   - Profiles and games configured`);
  console.log(`   - Demo matches with messages created`);
  console.log("");
  console.log("📧 Demo accounts (password: demo123):");
  DEMO_USERS.forEach((u) => console.log(`   - ${u.email}`));
}

// Run if called directly
seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
