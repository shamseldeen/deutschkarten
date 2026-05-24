import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useSignIn, useOAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn() as any;
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Sign in incomplete", JSON.stringify(result.status));
      }
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.errors?.[0]?.message ?? e?.message ?? "Try again");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      const { createdSessionId, setActive: setActiveOAuth } = await startOAuthFlow();
      if (createdSessionId && setActiveOAuth) {
        await setActiveOAuth({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Google sign-in failed", e?.message ?? "Try again");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to Ba7r DeutschKarten</Text>

      <Pressable
        onPress={onGoogle}
        style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <Text style={[styles.googleText, { color: colors.foreground }]}>Continue with Google</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.or, { color: colors.mutedForeground }]}>or</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.mutedForeground}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/sign-up" as any)} style={styles.linkRow}>
        <Text style={[styles.link, { color: colors.primary }]}>Don't have an account? Sign up</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.linkRow}>
        <Text style={[styles.link, { color: colors.mutedForeground }]}>Continue without signing in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 64, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, marginBottom: 16 },
  googleBtn: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: "center" },
  googleText: { fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  line: { flex: 1, height: 1 },
  or: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  btn: { borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16, fontFamily: "Inter_700Bold" },
  linkRow: { alignItems: "center", paddingVertical: 8 },
  link: { fontSize: 14, fontWeight: "500" },
});
