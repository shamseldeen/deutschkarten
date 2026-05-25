import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const PAYPAL_BASE = "https://paypal.me/shamseldeen2050";

export function DonationCard() {
  const colors = useColors();

  const open = (amount: number) => {
    Linking.openURL(`${PAYPAL_BASE}/${amount}`).catch(() => {});
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}
        >
          <Feather name="heart" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Support Ba7r DeutschKarten
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            This app is free. Donations keep it running and make it faster.
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => open(5)}
          style={[
            styles.btn,
            { backgroundColor: "#ec489915", borderColor: "#ec489950" },
          ]}
        >
          <View style={styles.btnHead}>
            <Feather name="heart" size={14} color="#ec4899" />
            <Text style={[styles.btnTitle, { color: colors.foreground }]}>
              Support Creator
            </Text>
          </View>
          <Text style={[styles.btnDesc, { color: colors.mutedForeground }]}>
            Thank the developer.
          </Text>
          <Text style={[styles.btnCta, { color: "#ec4899" }]}>
            Donate via PayPal →
          </Text>
        </Pressable>

        <Pressable
          onPress={() => open(10)}
          style={[
            styles.btn,
            { backgroundColor: "#3b82f615", borderColor: "#3b82f650" },
          ]}
        >
          <View style={styles.btnHead}>
            <Feather name="server" size={14} color="#3b82f6" />
            <Text style={[styles.btnTitle, { color: colors.foreground }]}>
              Upgrade AI & Servers
            </Text>
          </View>
          <Text style={[styles.btnDesc, { color: colors.mutedForeground }]}>
            Faster AI, more storage.
          </Text>
          <Text style={[styles.btnCta, { color: "#3b82f6" }]}>
            Donate via PayPal →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  row: { gap: 10 },
  btn: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  btnHead: { flexDirection: "row", gap: 6, alignItems: "center" },
  btnTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  btnDesc: { fontSize: 11 },
  btnCta: { fontSize: 12, fontWeight: "700", marginTop: 4 },
});
