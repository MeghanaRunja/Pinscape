import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import CATEGORIES from '../config/categories';
import { Colors, Spacing, Radius } from '../theme';
import { uploadPhotos } from '../services/api';
import { pinscapeCallbackStore } from '../store/pinscapeCallbackStore';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Pins'>;

export default function PinsScreen() {
  const nav         = useNavigation<Nav>();
  const { params }  = useRoute<Route>();
  const cat         = CATEGORIES[params.categoryKey];

  // Pinterest CDN URLs captured from the WebView browser, keyed by source
  // ('pinterest-web' or a boardId) so re-visiting replaces rather than duplicates.
  const [webPinsBySource, setWebPinsBySource] = useState<Record<string, string[]>>({});

  // Storage keys returned by /upload-photos for locally-picked images.
  const [uploadedPinKeys, setUploadedPinKeys]     = useState<string[]>([]);
  const [uploadedPinPreviews, setUploadedPinPreviews] = useState<string[]>([]);
  const [uploadingPins, setUploadingPins]         = useState(false);

  // Register callback so PinterestBrowserScreen and BoardPinsScreen can
  // return selected URLs without passing a function through nav params.
  pinscapeCallbackStore.onPinsSelected = (source: string, urls: string[]) => {
    setWebPinsBySource(prev => ({ ...prev, [source]: urls }));
  };

  // Remove the ref and global declarations that were here before

  // Flat, deduped list of all web-sourced pin URLs
  const allWebPinUrls = [...new Set(Object.values(webPinsBySource).flat())];
  const totalSelected = allWebPinUrls.length + uploadedPinKeys.length;

  // Count of Pinterest-browser-selected pins for the button label
  const webPinCount = allWebPinUrls.length;

  const pickAndUploadPins = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;

    setUploadingPins(true);
    try {
      const files = result.assets.map(a => ({
        uri:  a.uri,
        name: a.fileName ?? `pin-${Date.now()}.jpg`,
        type: a.mimeType  ?? 'image/jpeg',
      }));
      const { data } = await uploadPhotos(files, params.categoryKey);
      setUploadedPinKeys(prev    => [...prev, ...data.keys]);
      setUploadedPinPreviews(prev => [...prev, ...result.assets.map(a => a.uri)]);
    } catch {
      Alert.alert('Upload failed', 'Could not upload pin images. Check your connection and try again.');
    } finally {
      setUploadingPins(false);
    }
  };

  const removeUploadedPin = (index: number) => {
    setUploadedPinKeys(prev    => prev.filter((_, i) => i !== index));
    setUploadedPinPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const next = () => {
    // allWebPinUrls = https:// Pinterest CDN URLs (fetched server-side)
    // uploadedPinKeys = storage keys from /upload-photos (loaded server-side)
    // Neither is ever a raw file:// URI.
    const pinImageUrls = [...allWebPinUrls, ...uploadedPinKeys];
    nav.navigate('Analyzing', {
      categoryKey:   params.categoryKey,
      photoKeys:     params.photoKeys,
      pinImageUrls,
      anglesCovered: params.anglesCovered,
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.back}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.gray600} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Pick your pins</Text>
        <Text style={s.sub}>{cat.pinsSubtitle}</Text>

        {/* Step bar */}
        <View style={s.stepBar}>
          {['Photos', 'Pins', 'Results'].map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.gray400} />}
              <View style={[s.pill, i === 0 && s.pillDone, i === 1 && s.pillActive]}>
                {i === 0 && <MaterialCommunityIcons name="check" size={11} color={Colors.pink800} />}
                <Text style={[s.pillTxt, i === 1 && s.pillTxtActive, i === 0 && s.pillTxtDone]}>{step}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Pinterest browser section */}
        <View style={s.pintBox}>
          <View style={s.pintHdr}>
            <View style={s.pintLogo}>
              <MaterialCommunityIcons name="pinterest" size={15} color={Colors.white} />
            </View>
            <Text style={s.pintTitle}>Browse Pinterest</Text>
            {webPinCount > 0 && (
              <Text style={s.pintStat}>{webPinCount} pin{webPinCount !== 1 ? 's' : ''} selected</Text>
            )}
          </View>

          <View style={s.pintBody}>
            <Text style={s.pintDesc}>
              Browse Pinterest in-app and tap any pin image to select it. Sign in with your
              Pinterest account to access your saved boards.
            </Text>
            <TouchableOpacity
              style={s.browseBtn}
              onPress={() => nav.navigate('PinterestBrowser')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="pinterest" size={16} color={Colors.white} />
              <Text style={s.browseBtnTxt}>
                {webPinCount > 0 ? `Browse more pins (${webPinCount} selected)` : 'Open Pinterest browser'}
              </Text>
            </TouchableOpacity>
            {webPinCount > 0 && (
              <TouchableOpacity
                style={s.clearBtn}
                onPress={() => setWebPinsBySource({})}
              >
                <Text style={s.clearTxt}>Clear Pinterest selections</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* OR divider */}
        <View style={s.orRow}>
          <View style={s.orLine} />
          <Text style={s.orTxt}>or upload pin images directly</Text>
          <View style={s.orLine} />
        </View>

        {/* Locally-uploaded pin grid */}
        <View style={s.pinsHdr}>
          <Text style={s.pinsHdrTxt}>
            From camera roll
            {uploadedPinKeys.length > 0
              ? <Text style={{ color: Colors.pink400 }}> ({uploadedPinKeys.length} uploaded)</Text>
              : null}
          </Text>
          <Text style={s.pinsHdrHnt}>Tap image to remove</Text>
        </View>

        <View style={s.pinGrid}>
          {uploadedPinPreviews.map((uri, i) => (
            <TouchableOpacity
              key={i}
              style={s.pinCard}
              onPress={() => removeUploadedPin(i)}
              activeOpacity={0.8}
            >
              <Image source={{ uri }} style={s.pinImg} />
              <View style={s.pinChk}>
                <MaterialCommunityIcons name="close" size={10} color={Colors.white} />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[s.pinAdd, uploadingPins && { opacity: 0.5 }]}
            onPress={pickAndUploadPins}
            disabled={uploadingPins}
            activeOpacity={0.8}
          >
            {uploadingPins
              ? <ActivityIndicator size="small" color={Colors.gray400} />
              : <>
                  <MaterialCommunityIcons name="upload-outline" size={22} color={Colors.gray400} />
                  <Text style={s.pinAddTxt}>Upload pin image</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Total count summary */}
        {totalSelected > 0 && (
          <View style={s.summary}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.teal400} />
            <Text style={s.summaryTxt}>
              {totalSelected} pin{totalSelected !== 1 ? 's' : ''} ready for analysis
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, totalSelected === 0 && s.btnOff]}
          onPress={next}
          disabled={totalSelected === 0}
          activeOpacity={0.85}
        >
          <Text style={s.btnTxt}>Analyze & visualize</Text>
          <MaterialCommunityIcons name="shimmer" size={18} color={Colors.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.white },
  hdr:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderColor: Colors.gray200 },
  back:   { padding: 4 },
  scroll: { paddingBottom: 40 },
  title:  { fontSize: 20, fontWeight: '700', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 4, color: Colors.gray900 },
  sub:    { fontSize: 13, color: Colors.gray600, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, lineHeight: 19 },
  stepBar:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  pillDone:     { backgroundColor: Colors.pink50 },
  pillActive:   { backgroundColor: Colors.pink400 },
  pillTxt:      { fontSize: 11, fontWeight: '500', color: Colors.gray400 },
  pillTxtDone:  { color: Colors.pink800 },
  pillTxtActive: { color: Colors.white },
  pintBox:      { marginHorizontal: Spacing.lg, borderWidth: 0.5, borderColor: Colors.gray200, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md },
  pintHdr:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md, backgroundColor: Colors.gray50 },
  pintLogo:     { width: 26, height: 26, borderRadius: 6, backgroundColor: Colors.pinterest, alignItems: 'center', justifyContent: 'center' },
  pintTitle:    { flex: 1, fontSize: 13, fontWeight: '600' },
  pintStat:     { fontSize: 11, color: Colors.teal600, fontWeight: '500' },
  pintBody:     { padding: Spacing.md, gap: 10 },
  pintDesc:     { fontSize: 12, color: Colors.gray600, lineHeight: 18 },
  browseBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.pinterest, borderRadius: Radius.sm, padding: 12 },
  browseBtnTxt: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  clearBtn:     { alignItems: 'center', padding: 6 },
  clearTxt:     { fontSize: 12, color: Colors.gray400 },
  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, marginVertical: Spacing.md },
  orLine: { flex: 1, height: 0.5, backgroundColor: Colors.gray200 },
  orTxt:  { fontSize: 11, color: Colors.gray400 },
  pinsHdr:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: 8 },
  pinsHdrTxt: { fontSize: 11, fontWeight: '500', color: Colors.gray600 },
  pinsHdrHnt: { fontSize: 10, color: Colors.gray400 },
  pinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  pinCard: { width: '30%', aspectRatio: 3/4, borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: Colors.pink400, position: 'relative' },
  pinImg:  { width: '100%', height: '100%' },
  pinChk:  { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  pinAdd:  { width: '30%', aspectRatio: 3/4, borderRadius: Radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.gray200, backgroundColor: Colors.gray50, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pinAddTxt: { fontSize: 10, color: Colors.gray400, textAlign: 'center' },
  summary:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md, backgroundColor: Colors.teal50, borderRadius: Radius.sm },
  summaryTxt: { fontSize: 13, color: Colors.teal600, fontWeight: '500' },
  btn:    { marginHorizontal: Spacing.lg, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.pink400, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnOff: { backgroundColor: Colors.gray100 },
  btnTxt: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
