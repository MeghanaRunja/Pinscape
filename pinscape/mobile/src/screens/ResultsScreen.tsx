import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Share, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import CATEGORIES from '../config/categories';
import { Colors, Spacing, Radius } from '../theme';
import { AnalysisResult } from '../services/api';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Results'>;

const RESULT_COLORS = [
  { badge: Colors.pink400,   bg: Colors.pink50   },
  { badge: Colors.purple400, bg: Colors.purple50 },
  { badge: Colors.teal400,   bg: Colors.teal50   },
];

const SAVED_RESULTS_KEY = 'pinscape_saved_results';

export default function ResultsScreen() {
  const nav                   = useNavigation<Nav>();
  const { params }            = useRoute<Route>();
  const cat                   = CATEGORIES[params.categoryKey];
  const results: AnalysisResult[] = params.results ?? [];
  const [picked, setPicked]   = useState<number | null>(null);
  const [saving, setSaving]   = useState(false);

  const saveResults = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Load existing saved results, prepend this batch, keep last 20.
      const existing = await AsyncStorage.getItem(SAVED_RESULTS_KEY);
      const saved: Array<{ savedAt: string; category: string; results: AnalysisResult[] }> =
        existing ? JSON.parse(existing) : [];

      const entry = {
        savedAt:  new Date().toISOString(),
        category: params.categoryKey,
        results,
      };

      const updated = [entry, ...saved].slice(0, 20);
      await AsyncStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(updated));
      Alert.alert('Saved!', 'Your results have been saved and can be viewed offline.');
    } catch {
      Alert.alert('Save failed', 'Could not save results. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!results.length) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😕</Text>
          <Text style={s.errTitle}>Analysis failed</Text>
          <Text style={s.errSub}>
            Something went wrong. Check your backend is running and try again.
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => nav.goBack()}>
            <Text style={s.retryTxt}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.popToTop()} style={s.homeBtn}>
          <MaterialCommunityIcons name="home-outline" size={22} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Your results</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>3 looks for your {cat.label.toLowerCase()}</Text>
        <Text style={s.sub}>Tap a result to select it, then share or save.</Text>

        {results.map((r, i) => {
          const c       = RESULT_COLORS[i] ?? RESULT_COLORS[0];
          const isPicked = picked === i;
          return (
            <TouchableOpacity
              key={i}
              style={[s.card, isPicked && s.cardPicked]}
              activeOpacity={0.85}
              onPress={() => setPicked(i)}
            >
              <View style={[s.vis, { backgroundColor: c.bg }]}>
                <View style={[s.badge, { backgroundColor: c.badge }]}>
                  <Text style={s.badgeTxt}>{r.badge}</Text>
                </View>
                <Text style={{ fontSize: 44 }}>✨</Text>
              </View>

              <View style={s.body}>
                <Text style={s.cardTitle}>{r.title}</Text>
                <Text style={s.cardDesc}>{r.description}</Text>
                {!!r.reasoning && (
                  <Text style={s.reasoning}>💡 {r.reasoning}</Text>
                )}
                <View style={s.tags}>
                  {r.tags.map(t => (
                    <View key={t} style={s.tag}>
                      <Text style={s.tagTxt}>{t}</Text>
                    </View>
                  ))}
                </View>

                {isPicked && (
                  <TouchableOpacity
                    style={s.shareBtn}
                    onPress={() =>
                      Share.share({
                        message: `${r.title}\n\n${r.description}\n\nCreated with Pinscape`,
                      })
                    }
                  >
                    <MaterialCommunityIcons name="share-outline" size={15} color={Colors.pink600} />
                    <Text style={s.shareTxt}>Share this look</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.bar}>
        <TouchableOpacity style={s.barBtn} onPress={() => nav.goBack()}>
          <MaterialCommunityIcons name="refresh" size={16} color={Colors.gray600} />
          <Text style={s.barTxt}>Refine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.barBtn}
          onPress={() =>
            Alert.alert(
              'Shopping list',
              'Generates a shopping list for your selected look — coming soon!',
            )
          }
        >
          <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={Colors.gray600} />
          <Text style={s.barTxt}>Shopping list</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={saveResults} disabled={saving}>
          <MaterialCommunityIcons name="download-outline" size={16} color={Colors.white} />
          <Text style={s.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.white },
  hdr:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderColor: Colors.gray200 },
  homeBtn:   { padding: 4 },
  hdrTitle:  { fontSize: 15, fontWeight: '600' },
  scroll:    { paddingBottom: 100 },
  title:     { fontSize: 20, fontWeight: '700', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 4, color: Colors.gray900 },
  sub:       { fontSize: 13, color: Colors.gray600, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  card:      { marginHorizontal: Spacing.lg, marginBottom: 12, borderWidth: 0.5, borderColor: Colors.gray200, borderRadius: Radius.md, overflow: 'hidden' },
  cardPicked: { borderWidth: 2, borderColor: Colors.pink400 },
  vis:       { height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge:     { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt:  { color: Colors.white, fontSize: 11, fontWeight: '600' },
  body:      { padding: Spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 5 },
  cardDesc:  { fontSize: 13, color: Colors.gray600, lineHeight: 19, marginBottom: 8 },
  reasoning: { fontSize: 12, color: Colors.gray500, fontStyle: 'italic', marginBottom: 8, lineHeight: 17 },
  tags:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag:       { backgroundColor: Colors.gray100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  tagTxt:    { fontSize: 11, color: Colors.gray600 },
  shareBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderColor: Colors.gray200 },
  shareTxt:  { fontSize: 13, color: Colors.pink600, fontWeight: '500' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errTitle:  { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  errSub:    { fontSize: 14, color: Colors.gray600, textAlign: 'center', marginBottom: 24 },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.pink400 },
  retryTxt:  { color: Colors.white, fontWeight: '600' },
  bar:       { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, padding: Spacing.lg, paddingBottom: 28, backgroundColor: Colors.white, borderTopWidth: 0.5, borderColor: Colors.gray200 },
  barBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: Radius.sm, borderWidth: 0.5, borderColor: Colors.gray200 },
  barTxt:    { fontSize: 12, fontWeight: '500', color: Colors.gray600 },
  saveBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: Radius.sm, backgroundColor: Colors.pink400 },
  saveTxt:   { fontSize: 12, fontWeight: '500', color: Colors.white },
});
