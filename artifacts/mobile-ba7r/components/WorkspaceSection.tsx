import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import {
  useWorkspaces,
  useCreateWorkspace,
  useSwitchWorkspace,
  useDeleteWorkspace,
} from "@/lib/hooks";
import type { Workspace } from "@/lib/api";
import { Feather } from "@expo/vector-icons";

const LANGUAGES = [
  { code: "EN", label: "English", flag: "🇬🇧" },
  { code: "ES", label: "Spanish", flag: "🇪🇸" },
  { code: "FR", label: "French", flag: "🇫🇷" },
  { code: "IT", label: "Italian", flag: "🇮🇹" },
  { code: "TR", label: "Turkish", flag: "🇹🇷" },
];

const FLAG: Record<string, string> = {
  AR: "🇸🇦",
  EN: "🇬🇧",
  ES: "🇪🇸",
  FR: "🇫🇷",
  IT: "🇮🇹",
  TR: "🇹🇷",
};

export function WorkspaceSection() {
  const colors = useColors();
  const { data, isLoading } = useWorkspaces();
  const switchMut = useSwitchWorkspace();
  const createMut = useCreateWorkspace();
  const deleteMut = useDeleteWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [newLang, setNewLang] = useState("EN");
  const [newName, setNewName] = useState("");

  if (isLoading || !data) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          🗂️ Workspaces
        </Text>
        <ActivityIndicator style={{ marginTop: 8 }} />
      </View>
    );
  }

  const userCount = data.workspaces.filter((w) => !w.isDefault).length;
  const canCreate = userCount < (data.max ?? 2);

  const onSwitch = (ws: Workspace) => {
    if (ws.isCurrent) return;
    switchMut.mutate(ws.id);
  };

  const onDelete = (ws: Workspace) => {
    Alert.alert(
      "Delete workspace?",
      `"${ws.name}" and its progress will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMut.mutate(ws.id),
        },
      ],
    );
  };

  const onCreate = () => {
    createMut.mutate(
      { secondaryLanguage: newLang, name: newName.trim() || undefined },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewLang("EN");
        },
        onError: (e: any) =>
          Alert.alert("Couldn't create workspace", e?.message ?? "Try again"),
      },
    );
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        🗂️ Workspaces
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}
      >
        Each workspace pairs German with a target language. Cards and progress
        are kept separate.
      </Text>

      {data.workspaces.map((ws) => (
        <View
          key={ws.id}
          style={[
            styles.row,
            {
              borderColor: ws.isCurrent ? colors.primary : colors.border,
              backgroundColor: ws.isCurrent
                ? colors.primary + "12"
                : "transparent",
            },
          ]}
        >
          <Pressable onPress={() => onSwitch(ws)} style={styles.rowMain}>
            <Text style={{ fontSize: 22 }}>
              {FLAG[ws.secondaryLanguage] ?? "🏳️"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.foreground,
                }}
              >
                {ws.name}
              </Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                German → {ws.secondaryLanguage}
                {ws.isDefault ? " · Default" : ""}
              </Text>
            </View>
            {ws.isCurrent && (
              <Feather name="check" size={18} color={colors.primary} />
            )}
          </Pressable>
          {!ws.isDefault && (
            <Pressable
              onPress={() => onDelete(ws)}
              hitSlop={8}
              style={{ paddingHorizontal: 8 }}
            >
              <Feather
                name="trash-2"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
      ))}

      <Pressable
        onPress={() => canCreate && setShowCreate(true)}
        disabled={!canCreate}
        style={[
          styles.addBtn,
          { borderColor: colors.border, opacity: canCreate ? 1 : 0.5 },
        ]}
      >
        <Feather name="plus" size={16} color={colors.foreground} />
        <Text
          style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}
        >
          {canCreate
            ? "New workspace"
            : `Max ${(data.max ?? 2) + 1} workspaces`}
        </Text>
      </Pressable>

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.foreground }]}>
              New workspace
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.mutedForeground,
                marginBottom: 12,
              }}
            >
              Cards, progress and stats stay separate from your other
              workspaces.
            </Text>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              TARGET LANGUAGE
            </Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((l) => {
                const active = l.code === newLang;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => setNewLang(l.code)}
                    style={[
                      styles.langChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active
                          ? colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: active ? "#fff" : colors.foreground,
                      }}
                    >
                      {l.flag} {l.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.label,
                { color: colors.mutedForeground, marginTop: 12 },
              ]}
            >
              NAME (OPTIONAL)
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={
                LANGUAGES.find((l) => l.code === newLang)?.label ?? ""
              }
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.foreground },
              ]}
            />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable
                onPress={() => setShowCreate(false)}
                style={[
                  styles.modalBtn,
                  { borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={onCreate}
                disabled={createMut.isPending}
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary, flex: 1 },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  {createMut.isPending ? "Creating…" : "Create"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
    paddingVertical: 4,
  },
  addBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    borderStyle: "dashed",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 20 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
