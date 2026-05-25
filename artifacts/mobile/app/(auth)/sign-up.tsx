import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp() as any;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (e: any) {
      Alert.alert(
        "Sign up failed",
        e?.errors?.[0]?.message ?? e?.message ?? "Try again",
      );
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert(
        "Verification failed",
        e?.errors?.[0]?.message ?? e?.message ?? "Try again",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {pendingVerification ? "Verify your email" : "Create account"}
      </Text>

      {!pendingVerification ? (
        <>
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={[
              styles.btn,
              { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign Up</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enter the code we emailed you.
          </Text>
          <TextInput
            placeholder="Verification code"
            placeholderTextColor={colors.mutedForeground}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          />
          <Pressable
            onPress={onVerify}
            disabled={loading}
            style={[
              styles.btn,
              { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Verify</Text>
            )}
          </Pressable>
        </>
      )}

      <Pressable
        onPress={() => router.push("/(auth)/sign-in" as any)}
        style={styles.linkRow}
      >
        <Text style={[styles.link, { color: colors.primary }]}>
          Already have an account? Sign in
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 64, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  btn: { borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  linkRow: { alignItems: "center", paddingVertical: 8 },
  link: { fontSize: 14, fontWeight: "500" },
});
