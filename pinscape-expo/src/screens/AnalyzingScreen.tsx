import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import CATEGORIES from '../config/categories';
import { Colors, Spacing } from '../theme';
import { analyzeRequest } from '../services/api';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Analyzing'>;

export default function AnalyzingScreen() {
  const nav  = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const cat  = CATEGORIES[params.categoryKey];
  const [step, setStep] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ])).start();

    const iv = setInterval(() => setStep(s => Math.min(s + 1, cat.analyzeSteps.length - 1)), 1800);

    analyzeRequest({ category: params.categoryKey, photo_keys: params.photoKeys, pin_image_urls: params.pinImageUrls, angles_covered: params.anglesCovered })
      .then(({ data }) => { clearInterval(iv); nav.replace('Results', { categoryKey: params.categoryKey, results: data.results }); })
      .catch(()        => { clearInterval(iv); nav.replace('Results', { categoryKey: params.categoryKey, results: [] }); });

    return () => clearInterval(iv);
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Animated.View style={[s.ring, { transform: [{ scale: pulse }] }]}>
          <Text style={{ fontSize: 36 }}>🧠</Text>
        </Animated.View>
        <Text style={s.title}>{cat.analyzeTitle}</Text>
        <Text style={s.sub}>Usually 15–30 seconds</Text>
        <View style={s.steps}>
          {cat.analyzeSteps.map((st, i) => (
            <View key={st} style={s.stepRow}>
              <View style={[s.dot, i < step && s.dotDone, i === step && s.dotActive]} />
              <Text style={[s.stTxt, i < step && s.stDone, i === step && s.stActive]}>{st}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.white },
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  ring:  { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pink50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: Colors.gray900 },
  sub:   { fontSize: 13, color: Colors.gray400, marginBottom: 32 },
  steps: { alignSelf: 'stretch', gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gray200 },
  dotDone:   { backgroundColor: Colors.teal400 },
  dotActive: { backgroundColor: Colors.pink400 },
  stTxt:  { fontSize: 13, color: Colors.gray400 },
  stDone:   { color: Colors.teal600 },
  stActive: { color: Colors.gray900, fontWeight: '600' },
});
