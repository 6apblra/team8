import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SuperLikePack {
  id: string;
  count: number;
  price: string;
  badge?: string;
}

const SUPER_LIKE_PACKS: SuperLikePack[] = [
  { id: "sl_3",  count: 3,  price: "$0.99" },
  { id: "sl_10", count: 10, price: "$2.49", badge: "popular" },
  { id: "sl_25", count: 25, price: "$4.99", badge: "best_value" },
];

function PackCard({
  pack,
  onPress,
  theme,
  t,
}: {
  pack: SuperLikePack;
  onPress: () => void;
  theme: any;
  t: any;
}) {
  const isPopular = pack.badge === "popular";
  const isBest   = pack.badge === "best_value";
  const highlighted = isPopular || isBest;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.packCard,
          {
            backgroundColor: highlighted ? theme.backgroundSecondary : theme.backgroundDefault,
            borderColor: highlighted ? theme.secondary : theme.border,
            borderWidth: highlighted ? 2 : 1,
          },
        ]}
      >
        {pack.badge && (
          <View
            style={[
              styles.packBadge,
              { backgroundColor: isBest ? theme.warning : theme.secondary },
            ]}
          >
            <ThemedText style={styles.packBadgeText}>
              {t(`store.${pack.badge}`)}
            </ThemedText>
          </View>
        )}

        {/* Icon + count */}
        <View style={styles.packIconRow}>
          <ThemedText style={styles.superLikeEmoji}>⚡</ThemedText>
          <ThemedText style={[styles.packCount, { color: theme.secondary }]}>
            ×{pack.count}
          </ThemedText>
        </View>

        <ThemedText style={[styles.packLabel, { color: theme.text }]}>
          {t("store.superLikes", { count: pack.count })}
        </ThemedText>

        {/* Price button */}
        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.priceButton}
        >
          <ThemedText style={styles.priceText}>{pack.price}</ThemedText>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

export default function StoreScreen() {
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handleBuy = (pack: SuperLikePack) => {
    setPurchasing(pack.id);
    // Placeholder: show confirmation (no real payment in this demo)
    Alert.alert(
      t("store.purchaseTitle"),
      t("store.purchaseMessage", { count: pack.count, price: pack.price }),
      [
        { text: t("common.cancel"), style: "cancel", onPress: () => setPurchasing(null) },
        {
          text: t("store.confirm"),
          onPress: () => {
            setPurchasing(null);
            Alert.alert(t("store.thankYou"), t("store.thankYouMessage", { count: pack.count }));
          },
        },
      ],
    );
  };

  const handlePremium = () => {
    Alert.alert(t("store.premiumTitle"), t("store.premiumComingSoon"));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[`${theme.secondary}22`, `${theme.primary}11`]}
          style={[styles.hero, { borderColor: `${theme.secondary}44` }]}
        >
          <ThemedText style={styles.heroEmoji}>⚡</ThemedText>
          <ThemedText style={[styles.heroTitle, { color: theme.text }]}>
            {t("store.heroTitle")}
          </ThemedText>
          <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            {t("store.heroSubtitle")}
          </ThemedText>
        </LinearGradient>

        {/* Super Likes packs */}
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t("store.superLikePacksTitle")}
        </ThemedText>

        <View style={styles.packsGrid}>
          {SUPER_LIKE_PACKS.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onPress={() => handleBuy(pack)}
              theme={theme}
              t={t}
            />
          ))}
        </View>

        {/* Premium banner */}
        <Pressable
          onPress={handlePremium}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={[theme.secondary, theme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumContent}>
              <View>
                <ThemedText style={styles.premiumTitle}>
                  {t("store.premiumTitle")}
                </ThemedText>
                <ThemedText style={styles.premiumSubtitle}>
                  {t("store.premiumSubtitle")}
                </ThemedText>
                <View style={styles.premiumBullets}>
                  {["premiumBullet1", "premiumBullet2", "premiumBullet3"].map((key) => (
                    <View key={key} style={styles.bulletRow}>
                      <Feather name="check-circle" size={14} color="#fff" />
                      <ThemedText style={styles.bulletText}>{t(`store.${key}`)}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.premiumPriceWrap}>
                <ThemedText style={styles.premiumPrice}>$9.99</ThemedText>
                <ThemedText style={styles.premiumPeriod}>{t("store.perMonth")}</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <ThemedText style={[styles.disclaimer, { color: theme.textSecondary }]}>
          {t("store.disclaimer")}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["5xl"],
    gap: Spacing.lg,
  },
  hero: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heroEmoji: { fontSize: 48, lineHeight: 56 },
  heroTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  heroSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: -Spacing.xs,
  },
  packsGrid: { gap: Spacing.md },
  packCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  packBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderBottomLeftRadius: BorderRadius.sm,
    borderTopRightRadius: BorderRadius.md,
  },
  packBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  packIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  superLikeEmoji: { fontSize: 28 },
  packCount: { fontSize: 28, fontWeight: "800" },
  packLabel: { fontSize: 15, fontWeight: "500" },
  priceButton: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  priceText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  premiumCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.sm,
  },
  premiumContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  premiumTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  premiumSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2, marginBottom: Spacing.sm },
  premiumBullets: { gap: 6 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bulletText: { fontSize: 13, color: "#fff" },
  premiumPriceWrap: { alignItems: "flex-end" },
  premiumPrice: { fontSize: 26, fontWeight: "800", color: "#fff" },
  premiumPeriod: { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  disclaimer: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: Spacing.sm,
  },
});
