import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { setApiBaseUrl, setAuthTokenGetter } from "@/lib/api";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installGlobalErrorHandlers, reportError } from "@/lib/errorReporter";
import { configureNotificationHandler } from "@/lib/notifications";

installGlobalErrorHandlers();
configureNotificationHandler();

const PROD_API = process.env.EXPO_PUBLIC_API_BASE_URL;
const DEV_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
setApiBaseUrl(PROD_API ?? (DEV_DOMAIN ? `https://${DEV_DOMAIN}` : ""));

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="study/[level]" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="(auth)/sign-up" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — running without auth");
    return (
      <SafeAreaProvider>
        <ErrorBoundary onError={(err, stack) => reportError(err, { componentStack: stack })}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <ErrorBoundary onError={(err, stack) => reportError(err, { componentStack: stack })}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <AuthBridge />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
