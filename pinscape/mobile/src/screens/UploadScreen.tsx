import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import CATEGORIES from '../config/categories';
import { Colors, Spacing, Radius } from '../theme';
import { uploadPhotos } from '../services/api';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Upload'>;

export default function UploadScreen() {
  const nav  = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const cat  = CATEGORIES[params.categoryKey];
  const [photos, setPhotos]       = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [angles, setAngles]       = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access in Settings.');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.85,
        });
    if (!result.canceled) setPhotos(p => [...p, ...result.assets]);
  };

  const showPicker = () =>
    Alert.alert('Add photo', '', [
      { text: 'Camera',       onPress: () => pickPhoto(true)  },
      { text: 'Photo library', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const toggleAngle = (a: string) =>
    setAngles(prev => {
      const s = new Set(prev);
      s.has(a) ? s.delete(a) : s.add(a);
      return s;
    });

  const next = async () => {
    setUploading(true);
    try {
      const files = photos.map(p => ({
        uri:  p.uri,
        name: p.fileName ?? 'photo.jpg',
        type: p.mimeType ?? 'image/jpeg',
      }));
      const { data } = await uploadPhotos(files, params.categoryKey);
      nav.navigate('Pins', {
        categoryKey:   params.categoryKey,
        photoKeys:     data.keys,
        anglesCovered: [...angles],
      });
    } catch {
      Alert.alert('Upload failed', 'Check that your backend is running and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.back}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.gray600} />
        </TouchableOpacity>
        <Text style={s.catLbl}>{cat.label}</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{cat.uploadTitle}</Text>
        <Text style={s.sub}>{cat.uploadSubtitle}</Text>

        <TouchableOpacity
          style={[s.zone, photos.length > 0 && s.zoneDone]}
          onPress={showPicker}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={photos.length > 0 ? 'check-circle-outline' : 'camera-outline'}
            size={34}
            color={photos.length > 0 ? Colors.teal400 : Colors.gray400}
          />
          <Text style={[s.zoneLbl, photos.length > 0 && { color: Colors.teal600 }]}>
            {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} added` : 'Tap to upload or take a photo'}
          </Text>
          <Text style={s.zoneHnt}>{photos.length > 0 ? 'Tap to add more' : 'JPG, PNG, HEIC'}</Text>
        </TouchableOpacity>

        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.lg }}
          >
            {photos.map((p, i) => (
              <View key={i} style={s.thumb}>
                <Image source={{ uri: p.uri }} style={s.thumbImg} />
                <TouchableOpacity
                  style={s.thumbX}
                  onPress={() => setPhotos(ph => ph.filter((_, j) => j !== i))}
                >
                  <MaterialCommunityIcons name="close" size={10} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addThumb} onPress={showPicker}>
              <MaterialCommunityIcons name="plus" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          </ScrollView>
        )}

        <Text style={s.chipLbl}>Mark angles covered:</Text>
        <View style={s.chipRow}>
          {cat.angles.map(a => (
            <TouchableOpacity
              key={a}
              style={[s.chip, angles.has(a) && s.chipSel]}
              onPress={() => toggleAngle(a)}
            >
              <MaterialCommunityIcons
                name={angles.has(a) ? 'check' : 'camera-outline'}
                size={12}
                color={angles.has(a) ? Colors.pink800 : Colors.gray400}
              />
              <Text style={[s.chipTxt, angles.has(a) && s.chipTxtSel]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.btn, (photos.length === 0 || uploading) && s.btnOff]}
          onPress={next}
          disabled={photos.length === 0 || uploading}
          activeOpacity={0.85}
        >
          <Text style={s.btnTxt}>{uploading ? 'Uploading…' : 'Choose my pins'}</Text>
          {!uploading && <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.white} />}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.white },
  hdr:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderColor: Colors.gray200 },
  back:       { padding: 4, marginRight: 8 },
  catLbl:     { fontSize: 12, color: Colors.gray400, marginLeft: 'auto' },
  scroll:     { paddingBottom: 40 },
  title:      { fontSize: 20, fontWeight: '700', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 4, color: Colors.gray900 },
  sub:        { fontSize: 13, color: Colors.gray600, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, lineHeight: 19 },
  zone:       { marginHorizontal: Spacing.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.gray200, borderRadius: Radius.md, paddingVertical: 36, alignItems: 'center', gap: 6, backgroundColor: Colors.gray50 },
  zoneDone:   { borderStyle: 'solid', borderColor: Colors.teal400, backgroundColor: Colors.teal50 },
  zoneLbl:    { fontSize: 14, fontWeight: '500', color: Colors.gray900 },
  zoneHnt:    { fontSize: 12, color: Colors.gray400 },
  thumb:      { width: 64, height: 64, borderRadius: Radius.sm, overflow: 'hidden' },
  thumbImg:   { width: '100%', height: '100%' },
  thumbX:     { position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  addThumb:   { width: 64, height: 64, borderRadius: Radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' },
  chipLbl:    { fontSize: 13, color: Colors.gray600, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 0.5, borderColor: Colors.gray200 },
  chipSel:    { backgroundColor: Colors.pink50, borderColor: Colors.pink400 },
  chipTxt:    { fontSize: 12, color: Colors.gray400 },
  chipTxtSel: { color: Colors.pink800 },
  btn:        { marginHorizontal: Spacing.lg, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.pink400, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnOff:     { backgroundColor: Colors.gray100 },
  btnTxt:     { fontSize: 15, fontWeight: '600', color: Colors.white },
});
