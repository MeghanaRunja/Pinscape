import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/authStore';
import { getPinterestLoginUrl } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

export default function PinterestAuthScreen() {
  const nav = useNavigation();
  const { setToken } = useAuthStore();

  const openBrowser = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      getPinterestLoginUrl(),
      'pinscape://auth-success'  // deep link back to app
    );

    if (result.type === 'success' && result.url) {
      const token = result.url.split('#')[1];
      if (token) {
        setToken(token);
        nav.goBack();
      }
    }
  };

  useEffect(() => {
    openBrowser();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.close}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Connect Pinterest</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={s.body}>
        <View style={s.pintLogo}>
          <MaterialCommunityIcons name="pinterest" size={40} color={Colors.white} />
        </View>
        <Text style={s.title}>Connect your Pinterest account</Text>
        <Text style={s.sub}>Sign in with Google or your Pinterest credentials in the browser that opens.</Text>
        <TouchableOpacity style={s.btn} onPress={openBrowser} activeOpacity={0.85}>
          <MaterialCommunityIcons name="pinterest" size={18} color={Colors.white} />
          <Text style={s.btnTxt}>Open Pinterest login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={() => nav.goBack()}>
          <Text style={s.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.white },
  hdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderColor: Colors.gray200 },
  close:   { padding: 4 },
  hdrTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray900 },
  body:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: 16 },
  pintLogo: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pinterest, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title:   { fontSize: 20, fontWeight: '700', color: Colors.gray900, textAlign: 'center' },
  sub:     { fontSize: 14, color: Colors.gray600, textAlign: 'center', lineHeight: 21 },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.pinterest, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.md, marginTop: 8 },
  btnTxt:  { color: Colors.white, fontSize: 15, fontWeight: '600' },
  cancelBtn: { marginTop: 4, padding: 10 },
  cancelTxt: { fontSize: 14, color: Colors.gray400 },
});