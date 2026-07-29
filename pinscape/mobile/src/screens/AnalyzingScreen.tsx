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
  const nav         = useNavigation<Nav>();
  const { params }  = useRoute<Route>();
  const cat         = CATEGORIES[params.categoryKey];
  const totalSteps  = cat.analyzeSteps.length;

  const [step, setStep]       = useState(0);
  const [looping, setLooping] = useState(false);   // true once we've cycled through all steps
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation runs for the duration of the screen regardless of step state
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    ).start();

    // Advance one step every 1800 ms. Once all steps are shown, keep cycling
    // through them so the UI never looks frozen during a long API call (Claude
    // vision can take 15-30s, but the step animation would finish in ~9s).
    const iv = setInterval(() => {
      setStep(s => {
        const next = s + 1;
        if (next >= totalSteps) {
          setLooping(true);
          return 0;           // wrap back to first step
        }
        return next;
      });
    }, 1800);

    analyzeRequest({
      category:       params.categoryKey,
      photo_keys:     params.photoKeys,
      pin_image_urls: params.pinImageUrls,
      angles_covered: params.anglesCovered,
    })
      .then(({ data }) => {
        clearInterval(iv);
        nav.replace('Results', { categoryKey: params.categoryKey, results: data.results });
      })
      .catch(() => {
        clearInterval(iv);
        nav.replace('Results', { categoryKey: params.categoryKey, results: [] });
      });

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
          {cat.analyzeSteps.map((st, i) => {
            // In looping mode every step reads as "active" in turn — show
            // the active step highlighted and the rest dimmed so it's clear
            // we're still working rather than stuck on step 5/5 forever.
            const isActive = i === step;
            const isDone   = !looping && i < step;
            return (
              <View key={st} style={s.stepRow}>
                <View style={[s.dot, isDone && s.dotDone, isActive && s.dotActive]} />
                <Text style={[s.stTxt, isDone && s.stDone, isActive && s.stActive]}>{st}</Text>
              </View>
            );
          })}
        </View>

        {looping && (
          <Text style={s.stillWorking}>Still working — this can take up to 30 seconds…</Text>
        )}
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
  stepRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gray200 },
  dotDone:  { backgroundColor: Colors.teal400 },
  dotActive: { backgroundColor: Colors.pink400 },
  stTxt:    { fontSize: 13, color: Colors.gray400 },
  stDone:   { color: Colors.teal600 },
  stActive: { color: Colors.gray900, fontWeight: '600' },
  stillWorking: { marginTop: 24, fontSize: 12, color: Colors.gray400, fontStyle: 'italic', textAlign: 'center' },
});
