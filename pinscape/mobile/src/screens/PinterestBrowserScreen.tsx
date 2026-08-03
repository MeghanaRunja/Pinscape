import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Spacing, Radius } from '../theme';
import { pinscapeCallbackStore } from '../store/pinscapeCallbackStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Injected into the Pinterest page after it loads.
// Watches for taps on pin images, extracts the highest-res URL available,
// and posts it back to React Native via window.ReactNativeWebView.postMessage.
const INJECT_JS = `
(function() {
  if (window.__pinscapeInjected) return;
  window.__pinscapeInjected = true;

  function bestImageUrl(el) {
    if (el.tagName === 'IMG') {
      var srcset = el.srcset || '';
      if (srcset) {
        var parts = srcset.split(',').map(function(s) { return s.trim().split(/\\s+/); });
        parts.sort(function(a, b) {
          var wa = parseInt(a[1]) || 0;
          var wb = parseInt(b[1]) || 0;
          return wb - wa;
        });
        if (parts[0] && parts[0][0]) return parts[0][0];
      }
      return el.src || null;
    }
    var img = el.closest('[data-test-id="pin-visual-wrapper"] img') ||
              el.closest('a[href*="/pin/"] img') ||
              el.querySelector('img');
    if (img) return bestImageUrl(img);
    return null;
  }

  document.addEventListener('click', function(e) {
    var url = bestImageUrl(e.target);
    if (url) {
      url = url.replace(/\\/[0-9]+x\\//, '/originals/');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PIN_SELECTED', url: url }));
      var img = e.target.tagName === 'IMG' ? e.target : e.target.closest('img');
      if (img) {
        var prev = img.style.opacity;
        img.style.opacity = '0.4';
        setTimeout(function() { img.style.opacity = prev; }, 200);
      }
    }
  }, true);
})();
true;
`;

export default function PinterestBrowserScreen() {
  const nav                           = useNavigation<Nav>();
  const webViewRef                    = useRef<WebView>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedUrls, setSelected]   = useState<string[]>([]);
  const [canGoBack, setCanGoBack]     = useState(false);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'PIN_SELECTED' && msg.url) {
        setSelected(prev => {
          if (prev.includes(msg.url)) return prev.filter(u => u !== msg.url);
          if (prev.length >= 20) {
            Alert.alert('Limit reached', 'You can select up to 20 pins at once.');
            return prev;
          }
          return [...prev, msg.url];
        });
      }
    } catch {}
  };

  const confirm = () => {
    if (!selectedUrls.length) {
      Alert.alert('No pins selected', 'Tap pin images to select them, then tap Add.');
      return;
    }
    // Call back into PinsScreen via the module-level store (no global, no nav params)
    pinscapeCallbackStore.onPinsSelected?.('pinterest-web', selectedUrls);
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.btn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.gray600} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.navBtn, !canGoBack && s.navBtnOff]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={18}
            color={canGoBack ? Colors.gray600 : Colors.gray200}
          />
        </TouchableOpacity>

        <View style={s.counter}>
          <MaterialCommunityIcons name="pin" size={14} color={Colors.pinterest} />
          <Text style={s.counterTxt}>{selectedUrls.length} selected</Text>
        </View>

        <TouchableOpacity
          style={[s.doneBtn, selectedUrls.length === 0 && s.doneBtnOff]}
          onPress={confirm}
          disabled={selectedUrls.length === 0}
        >
          <Text style={s.doneTxt}>
            {selectedUrls.length > 0 ? `Add ${selectedUrls.length}` : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.banner}>
        <MaterialCommunityIcons name="gesture-tap" size={14} color={Colors.pink800} />
        <Text style={s.bannerTxt}>
          Sign in, then tap any pin image to select it. Tap again to deselect.
        </Text>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.pinterest.com' }}
        style={s.web}
        injectedJavaScript={INJECT_JS}
        injectedJavaScriptForMainFrameOnly={false}
        onMessage={onMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />

      {loading && (
        <View style={s.loadOverlay}>
          <ActivityIndicator size="large" color={Colors.pink400} />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.white },
  hdr:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderColor: Colors.gray200, gap: 8 },
  btn:         { padding: 4 },
  navBtn:      { padding: 4 },
  navBtnOff:   { opacity: 0.3 },
  counter:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  counterTxt:  { fontSize: 13, color: Colors.pinterest, fontWeight: '600' },
  doneBtn:     { backgroundColor: Colors.pink400, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full },
  doneBtnOff:  { backgroundColor: Colors.gray200 },
  doneTxt:     { color: Colors.white, fontSize: 13, fontWeight: '600' },
  banner:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.pink50, paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: Colors.pink100 },
  bannerTxt:   { fontSize: 12, color: Colors.pink800, flex: 1 },
  web:         { flex: 1 },
  loadOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)' },
});
