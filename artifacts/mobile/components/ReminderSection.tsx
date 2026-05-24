import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Switch, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useReminderPrefs } from "@/lib/reminderPrefs";

type Colors = {
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  muted: string;
};

const TIMES: { label: string; hour: number; minute: number }[] = [
  { label: "8:00 AM", hour: 8, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
  { label: "7:00 PM", hour: 19, minute: 0 },
  { label: "8:00 PM", hour: 20, minute: 0 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

export function ReminderSection({ colors }: { colors: Colors }) {
  const { prefs, save } = useReminderPrefs();
  const [busy, setBusy] = useState(false);

  const onToggle = async (next: boolean) => {
    setBusy(true);
    try {
      const r = await save({ ...prefs, enabled: next });
      if (!r.ok && r.reason === "permission-denied") {
        Alert.alert(
          "Notifications blocked",
          Platform.OS === "ios"
            ? "Open Settings → Notifications → Ba7r DeutschKarten and allow notifications."
            : "Open system settings and allow notifications for this app.",
        );
      } else if (!r.ok) {
        Alert.alert("Couldn't save reminder", "Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onPickTime = async (hour: number, minute: number) => {
    if (!prefs.enabled) return;
    setBusy(true);
    try {
      const r = await save({ ...prefs, hour, minute });
      if (!r.ok) Alert.alert("Couldn't update time", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Feather name="bell" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Daily Reminder</Text>
        </View>
        <Switch value={prefs.enabled} onValueChange={onToggle} disabled={busy} />
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Get a daily nudge to keep your streak alive.
      </Text>
      {prefs.enabled && (
        <View style={styles.chips}>
          {TIMES.map((t) => {
            const active = prefs.hour === t.hour && prefs.minute === t.minute;
            return (
              <Pressable
                key={t.label}
                onPress={() => onPickTime(t.hour, t.minute)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.muted,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? "#fff" : colors.foreground,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, marginBottom: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
