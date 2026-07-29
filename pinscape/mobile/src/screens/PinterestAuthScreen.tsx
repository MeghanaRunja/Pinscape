import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/authStore';
import { getPinterestLoginUrl } from '../services/api';

// Required for expo-web-browser to complete the auth session on iOS when the
// app is re-foregrounded via a deep link. Must be called at module level.
WebBrowser.maybeCompleteAuthSession();

export default function PinterestAuthScreen() {
  const nav              = useNavigation();
  const { setToken }     = useAuthStore();

  const openBrowser = useCallback(async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      getPinterestLoginUrl(),
      // Must exactly match settings.oauth_success_redirect on the backend
      // so the in-app browser recognises the redirect and returns control.
      'pinscape://auth-success',
    );

    if (result.type === 'success' && result.url) {
      // Token is in the URL fragment: pinscape://auth-success#<jwt>
      const token = result.url.split('#')[1];
      if (token) {
        setToken(token);
        nav.goBack();
        return;
      }
    }

    // result.type can be 'cancel' (user closed browser) or 'dismiss' — both
    // are silent: we stay on this screen so the user can try again or cancel.
  }, [nav, setToken]);

  // Open the browser as soon as the screen mounts so the user doesn't have
  // to tap a button (it also shows a manual button for the case where the
  // auto-open fails or the browser is dismissed early).
  useEffect(() => {
    openBrowser();
  }, [openBrowser]);

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
        <Text style={s.sub}>
          A browser will open for you to sign in with Pinterest. When done, you'll be
          brought back automatically.
        </Text>
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
  safe:      { flex: 1, backgroundColor: Colors.white },
  hdr:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderColor: Colors.gray200 },
  close:     { padding: 4 },
  hdrTitle:  { fontSize: 16, fontWeight: '600', color: Colors.gray900 },
  body:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: 16 },
  pintLogo:  { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pinterest, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title:     { fontSize: 20, fontWeight: '700', color: Colors.gray900, textAlign: 'center' },
  sub:       { fontSize: 14, color: Colors.gray600, textAlign: 'center', lineHeight: 21 },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.pinterest, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.md, marginTop: 8 },
  btnTxt:    { color: Colors.white, fontSize: 15, fontWeight: '600' },
  cancelBtn: { marginTop: 4, padding: 10 },
  cancelTxt: { fontSize: 14, color: Colors.gray400 },
});
