import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SelectableChip } from "@/components/SelectableChip";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api-client";
import { REVIEW_TAGS } from "@shared/validation";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  reviewedUserId: string;
  matchId?: string;
  nickname: string;
}

export function ReviewModal({
  visible,
  onClose,
  reviewedUserId,
  matchId,
  nickname,
}: ReviewModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.createReview({
        reviewedUserId,
        matchId,
        rating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", reviewedUserId] });
      queryClient.invalidateQueries({ queryKey: ["reviewStats", reviewedUserId] });
      Alert.alert(t("common.success"), t("reviews.successMessage"));
      handleClose();
    },
    onError: () => {
      Alert.alert(t("common.error"), t("reviews.errorMessage"));
    },
  });

  function handleClose() {
    setRating(0);
    setSelectedTags([]);
    setComment("");
    onClose();
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) return prev;
      return [...prev, tag];
    });
  }

  function handleSubmit() {
    if (rating === 0) {
      Alert.alert(t("common.error"), t("reviews.ratingRequired"));
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.textSecondary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t("reviews.leaveReview")}</ThemedText>
          <View style={styles.closeButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Nickname */}
          <ThemedText style={[styles.nickname, { color: theme.text }]}>{nickname}</ThemedText>

          {/* Star Rating */}
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t("reviews.yourRating")}
          </ThemedText>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Feather
                  name="star"
                  size={40}
                  color={star <= rating ? "#FFB800" : theme.border}
                />
              </Pressable>
            ))}
          </View>

          {/* Tags */}
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t("reviews.tags")}
          </ThemedText>
          <View style={styles.tagsContainer}>
            {REVIEW_TAGS.map((tag) => (
              <SelectableChip
                key={tag}
                label={t(`reviews.tags_${tag}`)}
                selected={selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
                color={theme.primary}
              />
            ))}
          </View>

          {/* Comment */}
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t("reviews.comment")}
          </ThemedText>
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder={t("reviews.commentPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={300}
            value={comment}
            onChangeText={setComment}
          />
          <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>
            {comment.length}/300
          </ThemedText>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.primary, opacity: pressed || mutation.isPending ? 0.7 : 1 },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.submitText}>{t("reviews.submit")}</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  nickname: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    fontSize: 15,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
