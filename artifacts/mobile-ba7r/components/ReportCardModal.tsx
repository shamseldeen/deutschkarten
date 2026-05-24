import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

const REASONS: { value: string; label: string }[] = [
  { value: "incorrect_translation", label: "Wrong translation" },
  { value: "offensive", label: "Offensive" },
  { value: "duplicate", label: "Duplicate" },
  { value: "low_quality_image", label: "Bad image" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  cardId: number;
  word: string;
};

export function ReportCardModal({ visible, onClose, cardId, word }: Props) {
  const c = useColors();
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | "ok" | "err" | "auth">(null);

  function close() {
    setReason("");
    setNote("");
    setStatus(null);
    onClose();
  }

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/ba7r-api/flashcards/${cardId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      });
      if (r.status === 401) { setStatus("auth"); return; }
      if (!r.ok) { setStatus("err"); return; }
      setStatus("ok");
      setTimeout(close, 1200);
    } catch {
      setStatus("err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: c.foreground }]}>Report card</Text>
            <TouchableOpacity onPress={close} hitSlop={10}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]} numberOfLines={2}>
            What&apos;s wrong with &quot;{word}&quot;?
          </Text>

          {status === "ok" ? (
            <Text style={[styles.statusOk, { color: "#16a34a" }]}>Thanks — we&apos;ll review it.</Text>
          ) : status === "auth" ? (
            <Text style={[styles.subtitle, { color: c.mutedForeground, marginTop: 16 }]}>
              Please sign in to report cards.
            </Text>
          ) : (
            <>
              <View style={styles.chips}>
                {REASONS.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setReason(r.value)}
                      style={[
                        styles.chip,
                        { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary + "22" : "transparent" },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: c.foreground }]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={note}
                onChangeText={(t) => setNote(t.slice(0, 500))}
                placeholder="Note (optional)"
                placeholderTextColor={c.mutedForeground}
                multiline
                style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.background }]}
              />
              {status === "err" && (
                <Text style={styles.errText}>Couldn&apos;t submit. Try again.</Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity onPress={close} style={[styles.btn, { backgroundColor: c.muted }]}>
                  <Text style={[styles.btnText, { color: c.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submit}
                  disabled={!reason || busy}
                  style={[styles.btn, { backgroundColor: reason && !busy ? c.primary : c.muted, opacity: reason && !busy ? 1 : 0.6 }]}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: "#fff" }]}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  sheet: { borderRadius: 18, borderWidth: 1, padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  input: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: "top", fontSize: 14 },
  errText: { color: "#dc2626", fontSize: 13, marginTop: 8 },
  statusOk: { fontSize: 14, fontWeight: "600", marginTop: 16, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
});
