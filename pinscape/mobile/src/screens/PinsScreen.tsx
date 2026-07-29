import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import CATEGORIES from '../config/categories';
import { Colors, Spacing, Radius } from '../theme';
import { useAuthStore } from '../store/authStore';
import { getBoards, uploadPhotos, Board, PinterestUser } from '../services/api';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Pins'>;

export default function PinsScreen() {
  const nav              = useNavigation<Nav>();
  const { params }       = useRoute<Route>();
  const cat              = CATEGORIES[params.categoryKey];
  const { token, pintConnected, logout } = useAuthStore();

  const [boards, setBoards]         = useState<Board[]>([]);
  const [pintUser, setPintUser]     = useState<PinterestUser | null>(null);
  const [loadingBoards, setLB]      = useState(false);

  // boardPinUrls: accumulates https:// CDN URLs from any number of Pinterest
  // boards the user visits. Keyed by boardId so re-visiting a board replaces
  // (not duplicates) the previously selected pins from that board.
  const [boardPinsByBoard, setBoardPinsByBoard] = useState<Record<string, string[]>>({});

  // uploadedPinKeys: server-side storage keys returned by /upload-photos for
  // locally-picked images. We upload immediately on pick so that by the time
  // the user hits "Analyze" we already have the keys and the backend won't
  // receive any raw file:// URIs.
  const [uploadedPinKeys, setUploadedPinKeys]   = useState<string[]>([]);
  // Local URIs purely for preview thumbnails (not sent to the backend).
  const [uploadedPinPreviews, setUploadedPinPreviews] = useState<string[]>([]);
  const [uploadingPins, setUploadingPins]       = useState(false);

  // Ref-based callback so BoardPinsScreen can return its selected URLs
  // without passing a function through React Navigation params (which
  // causes non-serialisable-value warnings and breaks state persistence).
  const onBoardPinsSelectedRef = useRef<((boardId: string, urls: string[]) => void) | null>(null);
  onBoardPinsSelectedRef.current = (boardId: string, urls: string[]) => {
    setBoardPinsByBoard(prev => ({ ...prev, [boardId]: urls }));
  };

  // Expose the ref globally so BoardPinsScreen can call back without
  // needing it in the navigation param list.
  (global as any).__pinscapeOnBoardPinsSelected = onBoardPinsSelectedRef;

  useFocusEffect(useCallback(() => {
    if (pintConnected && token) fetchBoards();
  }, [pintConnected, token]));

  const fetchBoards = async () => {
    setLB(true);
    try {
      const { data } = await getBoards();
      setBoards(data.boards);
      setPintUser(data.user);
    } catch {
      // silently ignore — the UI already shows a "not connected" fallback
    } finally {
      setLB(false);
    }
  };

  // Locally-picked pin images: upload immediately to get server storage keys.
  // This is the critical fix: previously p.uri (a local file:// path) was
  // passed straight through to the backend as a "pin_image_url", which caused
  // a FileNotFoundError because the backend tried to look it up as a storage
  // key inside its uploads/ directory.
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
      setUploadedPinKeys(prev => [...prev, ...data.keys]);
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

  // Flatten all selected board pin URLs, deduped.
  const allBoardPinUrls = [...new Set(Object.values(boardPinsByBoard).flat())];
  const totalSelected   = allBoardPinUrls.length + uploadedPinKeys.length;

  const next = () => {
    // All pin references are now either:
    //   • https:// CDN URLs (Pinterest board pins — fetched server-side by vision_service)
    //   • storage keys     (uploaded via /upload-photos — loaded server-side by load_as_base64)
    // Neither is a raw file:// URI.
    const pinImageUrls = [...allBoardPinUrls, ...uploadedPinKeys];
    nav.navigate('Analyzing', {
      categoryKey:   params.categoryKey,
      photoKeys:     params.photoKeys,
      pinImageUrls,
      anglesCovered: params.anglesCovered,
    });
  };

  // How many pins from each board have been selected (for the board row label)
  const countForBoard = (id: string) => boardPinsByBoard[id]?.length ?? 0;

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

        {/* Pinterest board section */}
        <View style={s.pintBox}>
          <View style={s.pintHdr}>
            <View style={s.pintLogo}>
              <MaterialCommunityIcons name="pinterest" size={15} color={Colors.white} />
            </View>
            <Text style={s.pintTitle}>Pinterest boards</Text>
            <Text style={[s.pintStat, { color: pintConnected ? Colors.teal600 : Colors.gray400 }]}>
              {pintConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>

          <View style={s.pintBody}>
            {!pintConnected ? (
              <>
                <Text style={s.pintDesc}>
                  Connect your account to import pins directly from your saved boards.
                </Text>
                <TouchableOpacity
                  style={s.connBtn}
                  onPress={() => nav.navigate('PinterestAuth')}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="pinterest" size={16} color={Colors.white} />
                  <Text style={s.connBtnTxt}>Connect Pinterest account</Text>
                </TouchableOpacity>
              </>
            ) : loadingBoards ? (
              <ActivityIndicator color={Colors.pink400} style={{ marginVertical: 16 }} />
            ) : (
              <>
                <View style={s.userRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>
                      {pintUser?.username?.slice(0, 2).toUpperCase() ?? '??'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{pintUser?.username ?? 'Pinterest user'}</Text>
                    <Text style={s.userSub}>@{pintUser?.username} · {boards.length} boards</Text>
                  </View>
                  <TouchableOpacity onPress={logout} style={s.discBtn}>
                    <Text style={s.discTxt}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.boardsLbl}>Select boards to import pins from:</Text>
                {boards.map(b => {
                  const count   = countForBoard(b.id);
                  const hasPins = count > 0;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[s.boardRow, hasPins && s.boardSel]}
                      onPress={() => nav.navigate('BoardPins', { boardId: b.id, boardName: b.name })}
                    >
                      <View style={s.boardThumb}>
                        {b.cover_image_url
                          ? <Image source={{ uri: b.cover_image_url }} style={{ width: '100%', height: '100%', borderRadius: 5 }} />
                          : <MaterialCommunityIcons name="image-multiple-outline" size={18} color={Colors.gray400} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.boardName}>{b.name}</Text>
                        <Text style={s.boardCt}>
                          {b.pin_count} pins{hasPins ? ` · ${count} selected` : ''}
                        </Text>
                      </View>
                      <View style={[s.boardChk, hasPins && s.boardChkSel]}>
                        {hasPins && <MaterialCommunityIcons name="check" size={10} color={Colors.white} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
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
            Pins{totalSelected > 0 ? <Text style={{ color: Colors.pink400 }}> ({totalSelected} selected)</Text> : null}
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
                <MaterialCommunityIcons name="check" size={10} color={Colors.white} />
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
                </>}
          </TouchableOpacity>
        </View>

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
  stepBar:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  pillDone:    { backgroundColor: Colors.pink50 },
  pillActive:  { backgroundColor: Colors.pink400 },
  pillTxt:     { fontSize: 11, fontWeight: '500', color: Colors.gray400 },
  pillTxtDone: { color: Colors.pink800 },
  pillTxtActive: { color: Colors.white },
  pintBox:   { marginHorizontal: Spacing.lg, borderWidth: 0.5, borderColor: Colors.gray200, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md },
  pintHdr:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md, backgroundColor: Colors.gray50 },
  pintLogo:  { width: 26, height: 26, borderRadius: 6, backgroundColor: Colors.pinterest, alignItems: 'center', justifyContent: 'center' },
  pintTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  pintStat:  { fontSize: 11 },
  pintBody:  { padding: Spacing.md },
  pintDesc:  { fontSize: 12, color: Colors.gray600, lineHeight: 18, marginBottom: 10 },
  connBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.pinterest, borderRadius: Radius.sm, padding: 12 },
  connBtnTxt: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  userRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar:    { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.pink100, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 12, fontWeight: '600', color: Colors.pink800 },
  userName:  { fontSize: 13, fontWeight: '600' },
  userSub:   { fontSize: 11, color: Colors.gray400 },
  discBtn:   { borderWidth: 0.5, borderColor: Colors.gray200, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  discTxt:   { fontSize: 11, color: Colors.gray600 },
  boardsLbl: { fontSize: 11, fontWeight: '500', color: Colors.gray600, marginBottom: 8 },
  boardRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: Radius.sm, borderWidth: 0.5, borderColor: Colors.gray200, marginBottom: 6 },
  boardSel:  { borderColor: Colors.pink400, backgroundColor: Colors.pink50 },
  boardThumb: { width: 34, height: 34, borderRadius: 5, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boardName: { fontSize: 12, fontWeight: '600' },
  boardCt:   { fontSize: 10, color: Colors.gray400 },
  boardChk:  { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' },
  boardChkSel: { backgroundColor: Colors.pink400, borderColor: Colors.pink400 },
  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, marginVertical: Spacing.md },
  orLine: { flex: 1, height: 0.5, backgroundColor: Colors.gray200 },
  orTxt:  { fontSize: 11, color: Colors.gray400 },
  pinsHdr:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: 8 },
  pinsHdrTxt: { fontSize: 11, fontWeight: '500', color: Colors.gray600 },
  pinsHdrHnt: { fontSize: 10, color: Colors.gray400 },
  pinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  pinCard: { width: '30%', aspectRatio: 3/4, borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: Colors.pink400, position: 'relative' },
  pinImg:  { width: '100%', height: '100%' },
  pinChk:  { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.pink400, alignItems: 'center', justifyContent: 'center' },
  pinAdd:  { width: '30%', aspectRatio: 3/4, borderRadius: Radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.gray200, backgroundColor: Colors.gray50, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pinAddTxt: { fontSize: 10, color: Colors.gray400, textAlign: 'center' },
  btn:    { marginHorizontal: Spacing.lg, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.pink400, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnOff: { backgroundColor: Colors.gray100 },
  btnTxt: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
