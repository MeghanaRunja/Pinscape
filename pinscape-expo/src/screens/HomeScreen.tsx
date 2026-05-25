import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import CATEGORIES from '../config/categories';
import { Colors, Spacing, Radius } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
const KEYS = ['bedroom','nails','outfit','hair','makeup','living'];

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.logo}>Pinscape</Text>
          <Text style={s.tagline}>turn pins into reality</Text>
        </View>
        <View style={s.hero}>
          <View style={s.badge}><Text style={s.badgeText}>AI-POWERED VISION</Text></View>
          <Text style={s.heroTitle}>{'Your pins,\nbrought to life'}</Text>
          <Text style={s.heroSub}>Connect your Pinterest boards, upload your space or yourself, pick your pins — see them applied to real life.</Text>
        </View>
        <View style={s.grid}>
          {KEYS.map(key => {
            const cat = CATEGORIES[key];
            return (
              <TouchableOpacity key={key} style={s.card} activeOpacity={0.75} onPress={() => nav.navigate('Upload', { categoryKey: key })}>
                <View style={[s.iconWrap, { backgroundColor: cat.bgColor }]}>
                  <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.accentColor} />
                </View>
                <Text style={s.cardLabel}>{cat.label}</Text>
                <Text style={s.cardDesc} numberOfLines={2}>{cat.uploadSubtitle.split('.')[0]}.</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color={Colors.gray400} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  logo: { fontSize: 24, fontWeight: '700', color: Colors.pink600 },
  tagline: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  hero: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, alignItems: 'center' },
  badge: { backgroundColor: Colors.pink50, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginBottom: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.pink800, letterSpacing: 0.5 },
  heroTitle: { fontSize: 30, fontWeight: '700', color: Colors.gray900, textAlign: 'center', lineHeight: 38, marginBottom: 10 },
  heroSub: { fontSize: 14, color: Colors.gray600, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: 10 },
  card: { width: '47%', backgroundColor: Colors.white, borderWidth: 0.5, borderColor: Colors.gray200, borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: Colors.gray900 },
  cardDesc: { fontSize: 11, color: Colors.gray600, lineHeight: 15 },
});
