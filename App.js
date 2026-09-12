// ⚠️ WAJIB: pdf-lib butuh Buffer di React Native
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

/**
 * Gandes Scanner v1.2.0
 * - PDF generated via pdf-lib (bukan expo-print HTML)
 * - Splash screen native
 * - Document picker untuk impor PDF & gambar
 * - Optimasi performa FlatList
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Modal,
  Switch,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
  Linking,
  InteractionManager,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

// Jaga splash tetap tampil sampai kita siap
SplashScreen.preventAutoHideAsync().catch(() => {});

const { width: SCREEN_W } = Dimensions.get('window');

/* ============================================================
   THEME COLORS
   ============================================================ */
const COLORS = {
  dark: {
    bg: '#080b11',
    surface: 'rgba(18,24,38,0.75)',
    surfaceSolid: '#111726',
    surfaceSoft: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(0,242,254,0.28)',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    divider: 'rgba(255,255,255,0.06)',
    cyan: '#00f2fe',
    cyanDeep: '#4facfe',
    neonBlue: '#3b82f6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#ef4444',
    violet: '#8b5cf6',
    overlay: 'rgba(0,0,0,0.75)',
    toastBg: 'rgba(15,23,42,0.95)',
  },
  light: {
    bg: '#eef2f9',
    surface: 'rgba(255,255,255,0.85)',
    surfaceSolid: '#ffffff',
    surfaceSoft: 'rgba(15,23,42,0.03)',
    border: 'rgba(15,23,42,0.08)',
    borderStrong: 'rgba(0,160,200,0.35)',
    text: '#0b1220',
    textMuted: '#5c6b82',
    textDim: '#8a99b0',
    divider: 'rgba(15,23,42,0.06)',
    cyan: '#0284c7',
    cyanDeep: '#0ea5e9',
    neonBlue: '#2563eb',
    emerald: '#059669',
    amber: '#d97706',
    rose: '#dc2626',
    violet: '#7c3aed',
    overlay: 'rgba(15,20,32,0.45)',
    toastBg: 'rgba(15,23,42,0.92)',
  },
};

const DEFAULT_FOLDERS = [
  { id: 'f1', name: 'Invoice', color: '#00f2fe', glyph: 'INV' },
  { id: 'f2', name: 'Identitas', color: '#10b981', glyph: 'ID' },
  { id: 'f3', name: 'Catatan', color: '#f59e0b', glyph: 'NOTE' },
  { id: 'f4', name: 'Surat', color: '#8b5cf6', glyph: 'LTR' },
  { id: 'f5', name: 'Buku', color: '#ec4899', glyph: 'BOOK' },
];

const QUALITY_PRESETS = [
  { key: 'ultra', label: 'Ultra HD', badge: '4K', dpi: 400, res: 3000, tag: 'PRO', desc: 'Arsip & cetak ulang' },
  { key: 'hd', label: 'HD', badge: 'HD', dpi: 300, res: 2000, tag: 'REC', desc: 'Standar scan profesional' },
  { key: 'medium', label: 'Medium', badge: 'MD', dpi: 200, res: 1400, tag: '', desc: 'Share via chat & email' },
  { key: 'compact', label: 'Compact', badge: 'LT', dpi: 150, res: 1000, tag: '', desc: 'Hemat storage' },
];

const COMPRESS_LEVELS = [
  { key: 'light', label: 'Light', ratio: 20, desc: 'Metadata cleanup' },
  { key: 'balanced', label: 'Balanced', ratio: 40, desc: 'Object stream optimize' },
  { key: 'aggressive', label: 'Aggressive', ratio: 60, desc: 'Strip metadata + streams' },
];

const CONVERT_FORMATS = [
  { key: 'jpg', label: 'JPG', desc: 'Dari page image', color: '#f59e0b' },
  { key: 'png', label: 'PNG', desc: 'Dari page image', color: '#8b5cf6' },
];

/* ============================================================
   UTILITIES
   ============================================================ */
export const fmtSize = (mb) => {
  if (!mb || mb <= 0) return '0 KB';
  if (mb >= 1) return mb.toFixed(1) + ' MB';
  return Math.round(mb * 1024) + ' KB';
};

export const initials = (n) => (n || 'XX').slice(0, 2).toUpperCase();
export const uid = (prefix = 'id') => `${prefix}${Date.now()}${Math.floor(Math.random() * 10000)}`;

export const haptic = async (style = 'light') => {
  try {
    if (style === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (style === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (style === 'heavy') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (style === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (style === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {}
};

const persistImage = async (srcUri, prefix = 'img') => {
  const ext = (srcUri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png'].includes(ext) ? ext : 'jpg';
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const dest = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest;
};

const persistPdf = async (srcUri, prefix = 'pdf') => {
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
  const dest = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest;
};

/* ============================================================
   STORAGE
   ============================================================ */
const STORAGE_KEYS = {
  DOCS: '@gandes:documents:v2',
  FOLDERS: '@gandes:folders:v2',
  SETTINGS: '@gandes:settings:v2',
  THEME: '@gandes:theme',
  PIN: '@gandes:pin',
};

const Storage = {
  async get(key) {
    try { return await AsyncStorage.getItem(key); } catch (e) { return null; }
  },
  async set(key, value) {
    try { await AsyncStorage.setItem(key, value); return true; } catch (e) { return false; }
  },
  async getJSON(key) {
    try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  async setJSON(key, value) {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  },
};

/* ============================================================
   PDF SERVICE — Semua pakai pdf-lib
   ============================================================ */
const A4_W = 595.28;
const A4_H = 841.89;

const readAsBase64 = async (uri) => {
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
};

const embedImageSafe = async (pdfDoc, uri) => {
  const base64 = await readAsBase64(uri);
  const bytes = Buffer.from(base64, 'base64');
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) {
    return await pdfDoc.embedPng(bytes);
  }
  // Default: coba JPG dulu, fallback PNG
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch (e) {
    return await pdfDoc.embedPng(bytes);
  }
};

export const imagesToPdf = async (imageUris, docName = 'document') => {
  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < imageUris.length; i++) {
    const uri = imageUris[i];
    try {
      const image = await embedImageSafe(pdfDoc, uri);
      const scale = Math.min(A4_W / image.width, A4_H / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      const x = (A4_W - w) / 2;
      const y = (A4_H - h) / 2;
      const page = pdfDoc.addPage([A4_W, A4_H]);
      page.drawImage(image, { x, y, width: w, height: h });
    } catch (e) {
      console.error(`Gagal embed image ${i}:`, e);
    }
  }

  const bytes = await pdfDoc.save();
  const tmp = `${FileSystem.cacheDirectory}pdf_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(
    tmp,
    Buffer.from(bytes).toString('base64'),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  const permanent = await persistPdf(tmp, docName);
  const info = await FileSystem.getInfoAsync(permanent);
  const sizeMB = (info.size || 0) / (1024 * 1024);

  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}

  return {
    uri: permanent,
    size: sizeMB,
    sizeStr: fmtSize(sizeMB),
    pages: pdfDoc.getPageCount(),
  };
};

export const mergePdfs = async (pdfFiles, outputName = 'merged') => {
  const mergedPdf = await PDFDocument.create();
  for (const file of pdfFiles) {
    try {
      const base64 = await readAsBase64(file.uri);
      const srcPdf = await PDFDocument.load(base64, { ignoreEncryption: true });
      const copied = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copied.forEach((p) => mergedPdf.addPage(p));
    } catch (e) {
      console.error(`Gagal merge ${file.name}:`, e);
    }
  }
  const bytes = await mergedPdf.save();
  const tmp = `${FileSystem.cacheDirectory}merge_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(
    tmp,
    Buffer.from(bytes).toString('base64'),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  const permanent = await persistPdf(tmp, outputName);
  const info = await FileSystem.getInfoAsync(permanent);
  const sizeMB = (info.size || 0) / (1024 * 1024);
  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
  return { uri: permanent, size: sizeMB, sizeStr: fmtSize(sizeMB), pages: mergedPdf.getPageCount() };
};

export const splitPdfByRanges = async (sourceUri, ranges = []) => {
  const base64 = await readAsBase64(sourceUri);
  const srcPdf = await PDFDocument.load(base64, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();
  const results = [];
  for (let i = 0; i < ranges.length; i++) {
    const { from, to } = ranges[i];
    const safeFrom = Math.max(1, from);
    const safeTo = Math.min(totalPages, to);
    if (safeFrom > safeTo) continue;
    const newPdf = await PDFDocument.create();
    const indices = [];
    for (let p = safeFrom - 1; p <= safeTo - 1; p++) indices.push(p);
    const copied = await newPdf.copyPages(srcPdf, indices);
    copied.forEach((p) => newPdf.addPage(p));
    const bytes = await newPdf.save();
    const tmp = `${FileSystem.cacheDirectory}split_${i + 1}_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(tmp, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
    const permanent = await persistPdf(tmp, `split_${i + 1}`);
    const info = await FileSystem.getInfoAsync(permanent);
    try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
    results.push({ uri: permanent, pages: safeTo - safeFrom + 1, size: (info.size || 0) / (1024 * 1024) });
  }
  return results;
};

export const extractPdfPages = async (sourceUri, pageNumbers = []) => {
  const base64 = await readAsBase64(sourceUri);
  const srcPdf = await PDFDocument.load(base64, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const indices = pageNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < srcPdf.getPageCount());
  const copied = await newPdf.copyPages(srcPdf, indices);
  copied.forEach((p) => newPdf.addPage(p));
  const bytes = await newPdf.save();
  const tmp = `${FileSystem.cacheDirectory}extract_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(tmp, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const permanent = await persistPdf(tmp, 'extract');
  const info = await FileSystem.getInfoAsync(permanent);
  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
  return { uri: permanent, pages: copied.length, size: (info.size || 0) / (1024 * 1024) };
};

export const watermarkPdf = async (sourceUri, text = 'GANDES SCANNER') => {
  const base64 = await readAsBase64(sourceUri);
  const pdfDoc = await PDFDocument.load(base64, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 48;
  const pages = pdfDoc.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: (height - textHeight) / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.35,
      rotate: degrees(-30),
    });
  });
  const bytes = await pdfDoc.save();
  const tmp = `${FileSystem.cacheDirectory}wm_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(tmp, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const permanent = await persistPdf(tmp, 'watermarked');
  const info = await FileSystem.getInfoAsync(permanent);
  const sizeMB = (info.size || 0) / (1024 * 1024);
  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
  return { uri: permanent, size: sizeMB, sizeStr: fmtSize(sizeMB), pages: pdfDoc.getPageCount() };
};

export const compressPdf = async (sourceUri, level = 'balanced') => {
  const base64 = await readAsBase64(sourceUri);
  const srcPdf = await PDFDocument.load(base64, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const copied = await newPdf.copyPages(srcPdf, srcPdf.getPageIndices());
  copied.forEach((p) => newPdf.addPage(p));
  newPdf.setTitle('');
  newPdf.setAuthor('');
  newPdf.setSubject('');
  newPdf.setKeywords([]);
  newPdf.setProducer('');
  newPdf.setCreator('');
  const useStreams = level !== 'light';
  const bytes = await newPdf.save({ useObjectStreams: useStreams });
  const tmp = `${FileSystem.cacheDirectory}comp_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(tmp, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const permanent = await persistPdf(tmp, 'compressed');
  const info = await FileSystem.getInfoAsync(permanent);
  const newSize = (info.size || 0) / (1024 * 1024);
  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
  return { uri: permanent, size: newSize, sizeStr: fmtSize(newSize), pages: newPdf.getPageCount() };
};

// Convert page images ke JPG/PNG
export const convertImages = async (sourceUris, format = 'jpg', namePrefix = 'conv') => {
  const outputs = [];
  const targetFormat = format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;
  const ext = format === 'png' ? 'png' : 'jpg';
  for (let i = 0; i < sourceUris.length; i++) {
    try {
      const result = await ImageManipulator.manipulateAsync(sourceUris[i], [], {
        compress: 0.92,
        format: targetFormat,
      });
      const filename = `${namePrefix}_hal${i + 1}.${ext}`;
      const dest = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: result.uri, to: dest });
      outputs.push(dest);
    } catch (e) {
      console.error('convertImages error:', e);
    }
  }
  return outputs;
};

/* ============================================================
   THEME CONTEXT
   ============================================================ */
const ThemeContext = createContext({ colors: COLORS.dark, mode: 'dark' });
export const useTheme = () => useContext(ThemeContext);

/* ============================================================
   UI COMPONENTS (memoized)
   ============================================================ */
export const Btn = React.memo(({ label, icon, onPress, colors, variant = 'primary', style, disabled }) => {
  const [busy, setBusy] = useState(false);
  const variants = {
    primary: { bg: colors.cyan, fg: '#050811' },
    soft: { bg: colors.surfaceSoft, fg: colors.text, border: colors.border },
    danger: { bg: colors.rose, fg: '#fff' },
    ghost: { bg: 'transparent', fg: colors.text },
  };
  const v = variants[variant] || variants.primary;

  const handlePress = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try { await onPress?.(); }
    finally { setTimeout(() => setBusy(false), 300); }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || busy}
      style={({ pressed }) => [{
        backgroundColor: v.bg,
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        borderWidth: v.border ? 1 : 0,
        borderColor: v.border || 'transparent',
      }, style]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={v.fg} style={{ marginRight: label ? 8 : 0 }} />
      ) : icon ? (
        <Ionicons name={icon} size={16} color={v.fg} style={{ marginRight: label ? 8 : 0 }} />
      ) : null}
      {label ? <Text style={{ color: v.fg, fontWeight: '700', fontSize: 14 }}>{label}</Text> : null}
    </Pressable>
  );
});

export const Chip = React.memo(({ label, active, onPress, colors, icon }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? 'rgba(0,242,254,0.12)' : colors.surfaceSoft, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
    {icon ? <Ionicons name={icon} size={12} color={active ? colors.cyan : colors.textMuted} style={{ marginRight: 6 }} /> : null}
    <Text style={{ color: active ? colors.cyan : colors.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
  </Pressable>
));

export const IconPill = React.memo(({ name, onPress, colors, active }) => (
  <Pressable onPress={onPress} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: active ? colors.cyan : colors.surface, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={18} color={active ? '#050811' : colors.text} />
  </Pressable>
));

export const Header = React.memo(({ title, subtitle, onBack, colors, right }) => (
  <View style={styles.header}>
    {onBack ? (
      <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
    ) : null}
    <View style={{ flex: 1 }}>
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
));

export const SearchBar = React.memo(({ value, onChange, colors, placeholder = 'Cari…' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, height: 46 }}>
    <Ionicons name="search" size={18} color={colors.textDim} />
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textDim} style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 14, paddingVertical: 0 }} />
    {value ? <Pressable onPress={() => onChange('')}><Ionicons name="close-circle" size={18} color={colors.textDim} /></Pressable> : null}
  </View>
));

export const Toast = ({ message, colors, topInset = 0 }) => {
  const [visible, setVisible] = useState(!!message);
  const [text, setText] = useState(message);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (message) {
      setText(message);
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [message]);

  if (!visible || !text) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: topInset + 8, left: 20, right: 20, zIndex: 100, alignItems: 'center', opacity, transform: [{ translateY }] }}>
      <View style={{ backgroundColor: colors.toastBg, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', maxWidth: SCREEN_W - 60 }}>
        <Ionicons name="checkmark-circle" size={14} color={colors.cyan} style={{ marginRight: 8 }} />
        <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 12 }}>{text}</Text>
      </View>
    </Animated.View>
  );
};

export const ProgressModal = ({ visible, title, sub, progress, colors, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ backgroundColor: colors.surfaceSolid, borderRadius: 18, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.borderStrong }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>{title}</Text>
        {sub ? <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>{sub}</Text> : null}
        <View style={{ height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 4, marginTop: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.cyan, borderRadius: 4 }} />
        </View>
        <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 12, textAlign: 'center', marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{progress}%</Text>
        {onCancel ? (
          <Pressable onPress={onCancel} style={{ marginTop: 14, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 12 }}>Batalkan</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  </Modal>
);

export const EmptyState = React.memo(({ icon = 'folder-open-outline', title, message, colors, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
    <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <Ionicons name={icon} size={30} color={colors.textMuted} />
    </View>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>{title}</Text>
    {message ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>{message}</Text> : null}
    {action}
  </View>
));

export const DocThumb = React.memo(({ doc, colors, size = 46 }) => (
  <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: doc.color + '22', borderWidth: 1, borderColor: doc.color + '55', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: doc.color, fontWeight: '900', fontSize: size * 0.28 }}>{initials(doc.name)}</Text>
    {doc.pages > 1 ? (
      <View style={{ position: 'absolute', bottom: -3, right: -3, backgroundColor: doc.color, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>{doc.pages}p</Text>
      </View>
    ) : null}
  </View>
));

export const DocCard = React.memo(({ doc, onPress, onToggleFav, colors, folderName }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: pressed ? 0.85 : 1 }]}>
    <DocThumb doc={doc} colors={colors} />
    <View style={{ flex: 1, marginLeft: 13, minWidth: 0 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13.5 }} numberOfLines={1}>{doc.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
        <View style={{ backgroundColor: colors.surfaceSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '700' }}>{(folderName || 'DOC').toUpperCase()}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>{doc.pages} hal • {doc.sizeStr || fmtSize(doc.size)}</Text>
      </View>
      <Text style={{ color: colors.textDim, fontSize: 10, marginTop: 3 }}>{doc.updatedAt || 'Baru saja'}</Text>
    </View>
    {onToggleFav ? (
      <Pressable onPress={onToggleFav} hitSlop={10} style={{ padding: 6 }}>
        <Ionicons name={doc.favorite ? 'star' : 'star-outline'} size={18} color={doc.favorite ? colors.amber : colors.textDim} />
      </Pressable>
    ) : (
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    )}
  </Pressable>
), (prev, next) => (
  prev.doc.id === next.doc.id &&
  prev.doc.favorite === next.doc.favorite &&
  prev.doc.name === next.doc.name &&
  prev.doc.updatedAt === next.doc.updatedAt &&
  prev.folderName === next.folderName
));

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

const circleBtnStyle = { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' };

/* ============================================================
   SCREEN: HOME
   ============================================================ */
const HomeScreen = ({ colors, documents, folders, go, onToggleFav, folderNameById }) => {
  const [query, setQuery] = useState('');

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return documents;
    const q = query.toLowerCase();
    return documents.filter((d) =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.ocr || '').toLowerCase().includes(q)
    );
  }, [documents, query]);

  const recent = filtered.slice(0, 5);
  const totalPages = documents.reduce((s, d) => s + (d.pages || 0), 0);
  const favCount = documents.filter((d) => d.favorite).length;

  const quickTools = [
    { key: 'merge', label: 'Gabung PDF', desc: 'Satukan beberapa dokumen', icon: 'add-circle-outline', action: () => go('merge') },
    { key: 'split', label: 'Pisah PDF', desc: 'Split range / per halaman', icon: 'cut-outline', action: () => go('split') },
    { key: 'compress', label: 'Kompres PDF', desc: 'Bersihkan metadata', icon: 'contract-outline', action: () => go('compress') },
    { key: 'convert', label: 'Konversi', desc: 'PDF → JPG dari page', icon: 'swap-horizontal-outline', action: () => go('convert') },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>{greeting} 👋</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 2, color: colors.text }}>Gandes Scanner</Text>
          </View>
          <IconPill name="settings-outline" colors={colors} onPress={() => go('settings')} />
        </View>
        <SearchBar value={query} onChange={setQuery} colors={colors} placeholder="Cari dokumen…" />
      </View>

      {query ? (
        <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>{filtered.length} hasil</Text>
          {filtered.map((doc) => (
            <DocCard key={doc.id} doc={doc} colors={colors} folderName={folderNameById?.(doc.folderId)} onPress={() => go('detail', { docId: doc.id })} onToggleFav={() => onToggleFav(doc.id)} />
          ))}
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
            <LinearGradient colors={['rgba(0,242,254,0.16)', 'rgba(59,130,246,0.08)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.borderStrong }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,242,254,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,242,254,0.28)', marginBottom: 12 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald, marginRight: 6 }} />
                <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>AUTO EDGE DETECT</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>Mulai Scan Cepat</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 18 }}>Deteksi tepi otomatis, crop perspektif & ekspor PDF instan.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="Scan" icon="scan" colors={colors} onPress={() => go('scanner')} style={{ flex: 1.3 }} />
                <Btn label="Impor" icon="images-outline" variant="soft" colors={colors} onPress={() => go('scanner', { openGallery: true })} style={{ flex: 1 }} />
              </View>
            </LinearGradient>
          </View>

          <View style={{ paddingHorizontal: 18, marginTop: 18, flexDirection: 'row', gap: 8 }}>
            <StatBox value={documents.length} label="DOKUMEN" colors={colors} />
            <StatBox value={totalPages} label="HALAMAN" colors={colors} accent={colors.emerald} />
            <StatBox value={favCount} label="FAVORIT" colors={colors} accent={colors.amber} />
          </View>

          <SectionHead title="PDF Power Tools" action="Semua" onAction={() => go('pdf-tools')} colors={colors} />
          <View style={{ paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {quickTools.map((t) => (
                <View key={t.key} style={{ width: '50%', padding: 6 }}><ToolCard tool={t} colors={colors} /></View>
              ))}
            </View>
          </View>

          <SectionHead title="Dokumen Terbaru" action="Lihat semua" onAction={() => go('documents')} colors={colors} />
          <View style={{ paddingHorizontal: 18 }}>
            {recent.length === 0 ? (
              <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}>
                <EmptyState icon="document-outline" title="Belum ada dokumen" message="Scan atau impor dokumen pertama Anda." colors={colors} />
              </View>
            ) : (
              recent.map((doc) => (
                <DocCard key={doc.id} doc={doc} colors={colors} folderName={folderNameById?.(doc.folderId)} onPress={() => go('detail', { docId: doc.id })} onToggleFav={() => onToggleFav(doc.id)} />
              ))
            )}
          </View>

          <SectionHead title="Folder" action="Kelola" onAction={() => go('folders')} colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 }}>
            {folders.map((f) => {
              const count = documents.filter((d) => d.folderId === f.id).length;
              return (
                <Pressable key={f.id} onPress={() => go('documents', { folderId: f.id })} style={{ width: 120, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: f.color + '22', borderWidth: 1, borderColor: f.color + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Text style={{ color: f.color, fontWeight: '900', fontSize: 10 }}>{f.glyph}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{f.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{count} dokumen</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
};

const StatBox = ({ value, label, colors, accent }) => (
  <View style={{ flex: 1, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, alignItems: 'center' }}>
    <Text style={{ color: accent || colors.cyan, fontSize: 18, fontWeight: '800' }}>{value}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.3, marginTop: 3 }}>{label}</Text>
  </View>
);

const SectionHead = ({ title, action, onAction, colors }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12, paddingHorizontal: 22 }}>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{title}</Text>
    {action ? <Pressable onPress={onAction}><Text style={{ color: colors.cyan, fontSize: 11, fontWeight: '700' }}>{action}</Text></Pressable> : null}
  </View>
);

const ToolCard = ({ tool, colors }) => (
  <Pressable onPress={tool.action} style={({ pressed }) => [{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, opacity: pressed ? 0.85 : 1, minHeight: 120 }]}>
    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(0,242,254,0.12)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.28)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <Ionicons name={tool.icon} size={20} color={colors.cyan} />
    </View>
    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{tool.label}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4, lineHeight: 14 }}>{tool.desc}</Text>
  </Pressable>
);

/* ============================================================
   SCREEN: DOCUMENTS
   ============================================================ */
const DocumentsScreen = ({ colors, documents, go, onToggleFav, filterFolderId, folders }) => {
  const [query, setQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState(filterFolderId || 'all');
  const [sort, setSort] = useState('recent');
  const [favOnly, setFavOnly] = useState(false);

  useEffect(() => { setActiveFolderId(filterFolderId || 'all'); }, [filterFolderId]);

  const folderNameById = useCallback((id) => folders.find((f) => f.id === id)?.name || 'DOC', [folders]);

  const filtered = useMemo(() => {
    let list = documents.slice();
    if (activeFolderId !== 'all') list = list.filter((d) => d.folderId === activeFolderId);
    if (favOnly) list = list.filter((d) => d.favorite);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((d) => (d.name || '').toLowerCase().includes(q) || (d.ocr || '').toLowerCase().includes(q));
    }
    if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sort === 'pages') list.sort((a, b) => (b.pages || 0) - (a.pages || 0));
    if (sort === 'recent') list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [documents, activeFolderId, favOnly, query, sort]);

  const renderItem = useCallback(({ item }) => (
    <DocCard
      doc={item}
      colors={colors}
      folderName={folderNameById(item.folderId)}
      onPress={() => go('detail', { docId: item.id })}
      onToggleFav={() => onToggleFav(item.id)}
    />
  ), [colors, folderNameById, go, onToggleFav]);

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Dokumen Saya"
        subtitle={`${filtered.length} dari ${documents.length} dokumen`}
        colors={colors}
        right={<IconPill name={favOnly ? 'star' : 'star-outline'} colors={colors} active={favOnly} onPress={() => setFavOnly((v) => !v)} />}
      />
      <View style={{ paddingHorizontal: 16 }}><SearchBar value={query} onChange={setQuery} colors={colors} placeholder="Cari dokumen…" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Chip label="Semua" active={activeFolderId === 'all'} colors={colors} onPress={() => setActiveFolderId('all')} />
        {folders.map((f) => (
          <Chip key={f.id} label={f.name} active={activeFolderId === f.id} colors={colors} onPress={() => setActiveFolderId(f.id)} />
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>URUTKAN</Text>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Terbaru" active={sort === 'recent'} colors={colors} onPress={() => setSort('recent')} />
          <Chip label="Nama" active={sort === 'name'} colors={colors} onPress={() => setSort('name')} />
          <Chip label="Halaman" active={sort === 'pages'} colors={colors} onPress={() => setSort('pages')} />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}
        ListEmptyComponent={<EmptyState icon="search-outline" title="Tidak ada dokumen" message="Coba ubah kata kunci atau filter folder." colors={colors} />}
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
};

/* ============================================================
   SCREEN: FOLDERS
   ============================================================ */
const FoldersScreen = ({ colors, documents, folders, go }) => (
  <View style={{ flex: 1 }}>
    <Header title="Folder & Kategori" subtitle={`${folders.length} folder`} colors={colors} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {folders.map((f) => {
          const count = documents.filter((d) => d.folderId === f.id).length;
          return (
            <View key={f.id} style={{ width: '50%', padding: 6 }}>
              <Pressable onPress={() => go('documents', { folderId: f.id })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: f.color + '22', borderWidth: 1, borderColor: f.color + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Text style={{ color: f.color, fontWeight: '900', fontSize: 11 }}>{f.glyph}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{f.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{count} dokumen</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  </View>
);

/* ============================================================
   SCREEN: SETTINGS
   ============================================================ */
const SettingsScreen = ({ colors, themeMode, onToggleTheme, appLock, onToggleLock, onChangePin, qualityPreset, go, showToast }) => {
  const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');

  const SettingRow = ({ icon, label, desc, right, onPress }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 12 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(0,242,254,0.1)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={15} color={colors.cyan} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
        {desc ? <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{desc}</Text> : null}
      </View>
      {right}
    </Pressable>
  );

  const Group = ({ children }) => (<View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', marginBottom: 22 }}>{children}</View>);
  const GroupTitle = ({ children }) => (<Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 }}>{children}</Text>);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Pengaturan" subtitle="Preferensi aplikasi" onBack={() => go('home')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <GroupTitle>KUALITAS & OUTPUT</GroupTitle>
        <Group>
          <SettingRow icon="camera-outline" label="Kualitas Scan Default" desc={`${preset.label} — ${preset.res || 'Adaptive'} px`} onPress={() => go('quality')} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
        </Group>

        <GroupTitle>TAMPILAN</GroupTitle>
        <Group>
          <SettingRow icon="moon-outline" label="Mode Gelap" desc={themeMode === 'dark' ? 'Cyber Dark aktif' : 'Cyber Light aktif'} right={<Switch value={themeMode === 'dark'} onValueChange={onToggleTheme} trackColor={{ true: colors.cyan, false: colors.border }} thumbColor="#fff" />} />
        </Group>

        <GroupTitle>KEAMANAN</GroupTitle>
        <Group>
          <SettingRow icon="lock-closed-outline" label="Kunci Aplikasi" desc="PIN / Biometrik" right={<Switch value={appLock} onValueChange={onToggleLock} trackColor={{ true: colors.cyan, false: colors.border }} thumbColor="#fff" />} />
          <SettingRow icon="keypad-outline" label="Ubah PIN" desc="Ganti PIN aplikasi" onPress={() => setPinModal(true)} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
        </Group>

        <GroupTitle>PENYIMPANAN</GroupTitle>
        <Group>
          <SettingRow icon="trash-outline" label="Hapus Cache" desc="Hapus file temporary" onPress={async () => {
            try {
              const cacheDir = FileSystem.cacheDirectory;
              const files = await FileSystem.readDirectoryAsync(cacheDir);
              let n = 0;
              for (const f of files) {
                try { await FileSystem.deleteAsync(cacheDir + f, { idempotent: true }); n++; } catch (e) {}
              }
              showToast(`Cache dibersihkan (${n} file)`);
            } catch (e) { showToast('Cache dibersihkan'); }
          }} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
        </Group>

        <GroupTitle>TENTANG</GroupTitle>
        <Group>
          <SettingRow icon="information-circle-outline" label="Versi Aplikasi" desc="Gandes Scanner 1.2.0" />
        </Group>
      </ScrollView>

      <Modal visible={pinModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surfaceSolid, borderRadius: 18, padding: 18, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.borderStrong }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 12 }}>Ubah PIN</Text>
            <TextInput
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="numeric"
              secureTextEntry
              placeholder="4 digit"
              placeholderTextColor={colors.textDim}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 18, textAlign: 'center', letterSpacing: 8 }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Btn label="Batal" variant="soft" colors={colors} onPress={() => { setPinModal(false); setNewPin(''); }} style={{ flex: 1 }} />
              <Btn label="Simpan" colors={colors} onPress={async () => {
                if (newPin.length !== 4) { showToast('PIN harus 4 digit'); return; }
                await onChangePin(newPin);
                setPinModal(false);
                setNewPin('');
                showToast('PIN diperbarui');
              }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ============================================================
   SCREEN: QUALITY
   ============================================================ */
const QualityScreen = ({ colors, qualityPreset, setQualityPreset, go, showToast }) => {
  const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];
  return (
    <View style={{ flex: 1 }}>
      <Header title="Kualitas Scan" subtitle="Resolusi output PDF" onBack={() => go('settings')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,242,254,0.08)', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, padding: 14, marginTop: 8 }}>
          <View>
            <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>TARGET LEBAR</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{preset.res} px</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{preset.dpi} DPI equivalent</Text>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(0,242,254,0.12)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.3)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera-outline" size={22} color={colors.cyan} />
          </View>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginBottom: 10, marginLeft: 4 }}>PRESET RESOLUSI</Text>
        {QUALITY_PRESETS.map((q) => (
          <Pressable key={q.key} onPress={() => { setQualityPreset(q.key); showToast(`Kualitas: ${q.label}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: qualityPreset === q.key ? 'rgba(0,242,254,0.06)' : colors.surface, borderWidth: 1, borderColor: qualityPreset === q.key ? colors.cyan : colors.border, marginBottom: 10 }}>
            <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: qualityPreset === q.key ? 'rgba(0,242,254,0.15)' : colors.surfaceSoft, borderWidth: 1, borderColor: qualityPreset === q.key ? 'rgba(0,242,254,0.4)' : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: qualityPreset === q.key ? colors.cyan : colors.textMuted, fontWeight: '900', fontSize: 10 }}>{q.badge}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{q.label}</Text>
                {q.tag ? <View style={{ backgroundColor: 'rgba(0,242,254,0.15)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}><Text style={{ color: colors.cyan, fontSize: 8, fontWeight: '800' }}>{q.tag}</Text></View> : null}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{q.res} px • {q.dpi} DPI</Text>
            </View>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: qualityPreset === q.key ? colors.cyan : colors.border, backgroundColor: qualityPreset === q.key ? colors.cyan : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {qualityPreset === q.key ? <Ionicons name="checkmark" size={12} color="#050811" /> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: PDF TOOLS HUB
   ============================================================ */
const PdfToolsScreen = ({ colors, go }) => {
  const tools = [
    { key: 'merge', label: 'Gabung PDF', desc: 'Satukan beberapa dokumen', icon: 'add-circle-outline', color: colors.cyan },
    { key: 'split', label: 'Pisah PDF', desc: 'Split range / per halaman', icon: 'cut-outline', color: colors.amber },
    { key: 'compress', label: 'Kompres PDF', desc: 'Bersihkan metadata', icon: 'contract-outline', color: colors.emerald },
    { key: 'convert', label: 'Konversi', desc: 'PDF → JPG dari page', icon: 'swap-horizontal-outline', color: colors.violet },
    { key: 'watermark', label: 'Watermark', desc: 'Tambah watermark teks', icon: 'water-outline', color: colors.rose },
  ];
  return (
    <View style={{ flex: 1 }}>
      <Header title="PDF Power Tools" subtitle="Semua alat manipulasi PDF" onBack={() => go('home')} colors={colors} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {tools.map((t) => (
            <View key={t.key} style={{ width: '50%', padding: 6 }}>
              <Pressable onPress={() => go(t.key)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, minHeight: 120 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: t.color + '22', borderWidth: 1, borderColor: t.color + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Ionicons name={t.icon} size={20} color={t.color} />
                </View>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{t.label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4, lineHeight: 14 }}>{t.desc}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: SCANNER
   ============================================================ */
const ScannerScreen = ({ colors, go, capturedImages, setCapturedImages, showToast, initialParams }) => {
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const galleryTriggered = useRef(false);

  useEffect(() => {
    if (initialParams?.openGallery && !galleryTriggered.current) {
      galleryTriggered.current = true;
      setTimeout(() => pickFromGallery(), 500);
    }
  }, [initialParams]);

  const startScan = async () => {
    if (scanning) return;
    try {
      setScanning(true);
      await haptic('medium');
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 30,
        letUserAdjustCrop: true,
      });

      if (result.status === 'success' && result.scannedImages?.length) {
        const persisted = [];
        for (const uri of result.scannedImages) {
          try {
            const perm = await persistImage(uri, 'scan');
            persisted.push({ id: uid('scan'), uri: perm });
          } catch (e) {
            persisted.push({ id: uid('scan'), uri });
          }
        }
        setCapturedImages((prev) => [...prev, ...persisted]);
        await haptic('success');
        showToast(`✓ ${persisted.length} halaman dipindai`);
        go('enhance');
      }
    } catch (e) {
      console.error('Scan error:', e);
      showToast('Gagal memindai');
    } finally {
      setScanning(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      let status = current.status;
      if (status === 'undetermined') {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        Alert.alert(
          'Izin Galeri Dibutuhkan',
          'Untuk mengimpor gambar, Gandes Scanner butuh izin akses foto.',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Buka Settings',
              onPress: () => {
                if (Platform.OS === 'ios') Linking.openURL('app-settings:');
                else Linking.openSettings();
              },
            },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.length) {
        const persisted = [];
        for (const a of result.assets) {
          try {
            const perm = await persistImage(a.uri, 'gal');
            persisted.push({ id: uid('gal'), uri: perm, width: a.width, height: a.height });
          } catch (e) {
            persisted.push({ id: uid('gal'), uri: a.uri, width: a.width, height: a.height });
          }
        }
        setCapturedImages((prev) => [...prev, ...persisted]);
        showToast(`${persisted.length} gambar diimpor`);
        go('enhance');
      }
    } catch (e) { showToast('Gagal buka galeri'); }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const persisted = [];
      for (const a of result.assets) {
        try {
          const perm = await persistImage(a.uri, 'file');
          persisted.push({ id: uid('file'), uri: perm });
        } catch (e) {
          persisted.push({ id: uid('file'), uri: a.uri });
        }
      }
      setCapturedImages((prev) => [...prev, ...persisted]);
      showToast(`${persisted.length} file diimpor`);
      go('enhance');
    } catch (e) {
      console.error('Pick files error:', e);
      showToast('Gagal buka file manager');
    }
  };

  const InfoCard = ({ icon, title, desc }) => (
    <View style={{ flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
      <Ionicons name={icon} size={20} color={colors.cyan} style={{ marginBottom: 8 }} />
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{desc}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StatusBar style={colors.text === '#f8fafc' ? 'light' : 'dark'} />
      <Header title="Scan Dokumen" subtitle="Auto Edge Detection" onBack={() => go('home')} colors={colors} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <LinearGradient
          colors={['rgba(0,242,254,0.16)', 'rgba(59,130,246,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.borderStrong, marginBottom: 20 }}
        >
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(0,242,254,0.15)', borderWidth: 2, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="scan" size={40} color={colors.cyan} />
            </View>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
              Auto Scan Pinggir
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Deteksi tepi otomatis, crop perspektif, hasil rata. Support buku, KTP, invoice, catatan.
            </Text>
          </View>

          <Btn
            label={scanning ? 'Membuka scanner…' : 'Mulai Scan'}
            icon="scan"
            colors={colors}
            onPress={startScan}
            disabled={scanning}
            style={{ marginBottom: 10 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn
              label="Galeri"
              icon="images-outline"
              variant="soft"
              colors={colors}
              onPress={pickFromGallery}
              style={{ flex: 1 }}
            />
            <Btn
              label="File Manager"
              icon="folder-open-outline"
              variant="soft"
              colors={colors}
              onPress={pickFromFiles}
              style={{ flex: 1 }}
            />
          </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <InfoCard icon="crop-outline" title="Auto Crop" desc="Pinggir terdeteksi" />
          <InfoCard icon="cube-outline" title="Perspektif" desc="Miring jadi rata" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <InfoCard icon="book-outline" title="Multi Page" desc="Hingga 30 halaman" />
          <InfoCard icon="shield-checkmark-outline" title="Offline" desc="Data tetap lokal" />
        </View>

        {capturedImages.length > 0 ? (
          <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12 }}>
              {capturedImages.length} halaman siap diproses
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="Lanjut Enhance" colors={colors} onPress={() => go('enhance')} style={{ flex: 1 }} />
              <Btn label="Bersihkan" variant="soft" colors={colors} onPress={() => setCapturedImages([])} style={{ flex: 0.7 }} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: ENHANCE
   ============================================================ */
const EnhanceScreen = ({ colors, go, capturedImages, setCapturedImages, qualityPreset, showToast, onSaveDocument }) => {
  const insets = useSafeAreaInsets();
  const [processing, setProcessing] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const current = capturedImages[previewIdx];

  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Enhance" onBack={() => go('scanner')} colors={colors} />
        <EmptyState icon="images-outline" title="Tidak ada gambar" message="Scan dulu untuk mulai." colors={colors} action={<Btn label="Buka Scanner" colors={colors} onPress={() => go('scanner')} style={{ marginTop: 16 }} />} />
      </View>
    );
  }

  const applyEnhancements = async () => {
    if (processing) return;
    try {
      setProcessing(true);
      await haptic('medium');
      const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];
      const targetRes = preset.res || 2000;
      const newImages = [];

      for (let i = 0; i < capturedImages.length; i++) {
        const img = capturedImages[i];
        let processedUri = img.uri;
        let width = img.width;
        let height = img.height;

        try {
          // Get actual dimensions
          const info = await ImageManipulator.manipulateAsync(img.uri, [], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
          width = info.width;
          height = info.height;

          const actions = [];
          if (width > targetRes) {
            actions.push({ resize: { width: targetRes } });
          }
          const result = await ImageManipulator.manipulateAsync(
            img.uri,
            actions,
            {
              compress: preset.key === 'compact' ? 0.65 : preset.key === 'medium' ? 0.8 : 0.92,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );
          // Persist hasil
          processedUri = await persistImage(result.uri, 'enh');
          width = result.width;
          height = result.height;
        } catch (e) {
          console.error('Enhance error:', e);
        }

        newImages.push({ ...img, uri: processedUri, width, height });
      }

      setCapturedImages(newImages);
      await haptic('success');
      await onSaveDocument(newImages);
    } catch (e) {
      console.error(e);
      showToast('Gagal memproses');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.text === '#f8fafc' ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => go('scanner')} style={[circleBtnStyle, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Preview & Simpan</Text>
          <Text style={{ color: colors.cyan, fontSize: 10, fontWeight: '700', marginTop: 2 }}>{previewIdx + 1} / {capturedImages.length}</Text>
        </View>
        <Pressable onPress={applyEnhancements} disabled={processing} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.cyan, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: processing ? 0.5 : 1 }}>
          {processing ? <ActivityIndicator size="small" color="#050811" /> : <Ionicons name="checkmark" size={16} color="#050811" />}
          <Text style={{ color: '#050811', fontWeight: '800', fontSize: 13 }}>Simpan</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ width: '82%', aspectRatio: 0.72, maxHeight: '60%', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border }}>
          <Image source={{ uri: current.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
      </View>

      {capturedImages.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {capturedImages.map((p, i) => (
            <Pressable key={p.id} onPress={() => setPreviewIdx(i)} style={{ width: 50, height: 64, borderRadius: 8, marginRight: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === previewIdx ? colors.cyan : colors.border }}>
              <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
        <View style={{ padding: 12, backgroundColor: colors.surfaceSoft, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 17 }}>
            ℹ️ Simpan akan resize & kompres tiap halaman sesuai preset ({QUALITY_PRESETS.find(p => p.key === qualityPreset)?.label || 'HD'}) lalu membuat PDF.
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ============================================================
   SCREEN: PREVIEW
   ============================================================ */
const PreviewScreen = ({ colors, go, currentDoc, showToast }) => {
  if (!currentDoc) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Preview" onBack={() => go('documents')} colors={colors} />
        <EmptyState icon="document-outline" title="Dokumen tidak ditemukan" colors={colors} />
      </View>
    );
  }
  const pageImages = currentDoc.pageImages || [];

  const share = async () => {
    try {
      if (currentDoc.pdfUri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(currentDoc.pdfUri);
      else showToast('Tidak bisa share');
    } catch (e) { showToast('Gagal berbagi'); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={currentDoc.name} subtitle={`${currentDoc.pages} halaman • ${currentDoc.sizeStr}`} onBack={() => go('detail', { docId: currentDoc.id })} colors={colors}
        right={<IconPill name="share-outline" colors={colors} onPress={share} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {pageImages.length > 0 ? (
          pageImages.map((imgUri, idx) => (
            <View key={idx} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 8, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>HALAMAN {idx + 1} / {pageImages.length}</Text>
                <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}><Text style={{ color: '#475569', fontSize: 9, fontWeight: '800' }}>PDF</Text></View>
              </View>
              <Image source={{ uri: imgUri }} style={{ width: '100%', aspectRatio: 0.72, borderRadius: 6 }} resizeMode="contain" />
            </View>
          ))
        ) : (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}>
            <EmptyState icon="images-outline" title="Preview tidak tersedia" message="Dokumen ini tidak punya page image." colors={colors} />
          </View>
        )}

        <Btn label="Bagikan PDF" icon="share-social-outline" colors={colors} onPress={share} style={{ marginTop: 6 }} />
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: DETAIL
   ============================================================ */
const DetailScreen = ({ colors, go, currentDoc, folders, onToggleFav, onRename, onDelete, onDeletePage, onAddPage, showToast }) => {
  const [tab, setTab] = useState('pages');
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(currentDoc?.name || '');

  if (!currentDoc) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Dokumen" onBack={() => go('documents')} colors={colors} />
        <EmptyState icon="document-outline" title="Dokumen tidak ditemukan" colors={colors} />
      </View>
    );
  }

  const folderName = folders.find((f) => f.id === currentDoc.folderId)?.name || '—';
  const tabs = [{ k: 'pages', l: 'Halaman' }, { k: 'info', l: 'Info' }];
  const quickActions = [
    { k: 'preview', i: 'document-text-outline', l: 'Preview PDF', a: () => go('preview', { docId: currentDoc.id }) },
    { k: 'merge', i: 'add-circle-outline', l: 'Gabung', a: () => go('merge', { selectedId: currentDoc.id }) },
    { k: 'split', i: 'cut-outline', l: 'Pisah', a: () => go('split', { docId: currentDoc.id }) },
    { k: 'compress', i: 'contract-outline', l: 'Kompres', a: () => go('compress', { docId: currentDoc.id }) },
    { k: 'convert', i: 'swap-horizontal-outline', l: 'Konversi', a: () => go('convert', { docId: currentDoc.id }) },
    { k: 'watermark', i: 'water-outline', l: 'Watermark', a: () => go('watermark', { docId: currentDoc.id }) },
    { k: 'share', i: 'share-social-outline', l: 'Bagikan', a: async () => {
      try { if (currentDoc.pdfUri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(currentDoc.pdfUri); else showToast('Bagikan dokumen'); }
      catch (e) { showToast('Gagal berbagi'); }
    }},
    { k: 'rename', i: 'pencil-outline', l: 'Ganti Nama', a: () => { setNewName(currentDoc.name); setRenameOpen(true); } },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header title={currentDoc.name} subtitle={`${folderName} • ${currentDoc.sizeStr} • ${currentDoc.pages} hal`} onBack={() => go('documents')} colors={colors}
        right={<IconPill name={currentDoc.favorite ? 'star' : 'star-outline'} colors={colors} active={currentDoc.favorite} onPress={() => onToggleFav(currentDoc.id)} />}
      />
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 }}>
        {tabs.map((t) => (
          <Pressable key={t.k} onPress={() => setTab(t.k)} style={{ paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 999, backgroundColor: tab === t.k ? 'rgba(0,242,254,0.12)' : colors.surfaceSoft, borderWidth: 1, borderColor: tab === t.k ? colors.cyan : colors.border }}>
            <Text style={{ color: tab === t.k ? colors.cyan : colors.text, fontWeight: '700', fontSize: 12 }}>{t.l}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {tab === 'pages' ? (
          <>
            {Array.from({ length: currentDoc.pages }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 10 }}>
                <View style={{ width: 54, height: 68, borderRadius: 8, backgroundColor: currentDoc.color + '22', borderWidth: 1, borderColor: currentDoc.color + '55', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {currentDoc.pageImages?.[i] ? (
                    <Image source={{ uri: currentDoc.pageImages[i] }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ color: currentDoc.color, fontWeight: '900', fontSize: 12 }}>#{i + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>Halaman {i + 1}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>A4 • Scan</Text>
                </View>
                <Pressable onPress={() => onDeletePage(currentDoc.id, i)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.rose} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => onAddPage(currentDoc.id)} style={{ borderWidth: 1.5, borderColor: colors.borderStrong, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="add" size={20} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 12 }}>Tambah halaman dari scan</Text>
            </Pressable>
          </>
        ) : null}

        {tab === 'info' ? (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
            {[
              ['Nama', currentDoc.name],
              ['Folder', folderName],
              ['Halaman', `${currentDoc.pages}`],
              ['Ukuran', currentDoc.sizeStr],
              ['Dibuat', currentDoc.updatedAt],
            ].map(([label, value], i, arr) => (
              <View key={label} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: colors.divider }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, width: 120 }}>{label}</Text>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', flex: 1 }}>{value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 20, marginBottom: 10 }}>AKSI CEPAT</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {quickActions.map((qa) => (
            <View key={qa.k} style={{ width: '50%', padding: 5 }}>
              <Pressable onPress={qa.a} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,242,254,0.12)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={qa.i} size={14} color={colors.cyan} />
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12, flex: 1 }} numberOfLines={1}>{qa.l}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable onPress={() => onDelete(currentDoc.id)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 14, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
          <Ionicons name="trash-outline" size={16} color={colors.rose} />
          <Text style={{ color: colors.rose, fontWeight: '800', fontSize: 13 }}>Hapus Dokumen</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={renameOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surfaceSolid, borderRadius: 18, padding: 18, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.borderStrong }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 12 }}>Ganti Nama</Text>
            <TextInput value={newName} onChangeText={setNewName} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Btn label="Batal" variant="soft" colors={colors} onPress={() => setRenameOpen(false)} style={{ flex: 1 }} />
              <Btn label="Simpan" colors={colors} onPress={() => { const v = newName.trim(); if (v) onRename(currentDoc.id, v); setRenameOpen(false); }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ============================================================
   SCREEN: MERGE (dengan impor PDF dari file manager)
   ============================================================ */
const MergeScreen = ({ colors, go, documents, folders, showToast, params, onComplete, onImportPdf }) => {
  const [selected, setSelected] = useState(params?.selectedId ? [params.selectedId] : []);
  const [imported, setImported] = useState([]);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const totalPages = selected.reduce((s, id) => { const d = documents.find((x) => x.id === id); return s + (d?.pages || 0); }, 0) +
    imported.reduce((s, f) => s + (f.pages || 1), 0);

  const importFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const files = [];
      for (const a of result.assets) {
        try {
          const perm = await persistPdf(a.uri, 'imported');
          const info = await FileSystem.getInfoAsync(perm);
          files.push({
            id: uid('ext'),
            name: (a.name || 'document').replace(/\.pdf$/i, ''),
            uri: perm,
            size: (info.size || 0) / (1024 * 1024),
            pages: 1,
          });
        } catch (e) {}
      }
      setImported((prev) => [...prev, ...files]);
      showToast(`${files.length} PDF diimpor`);
    } catch (e) {
      console.error('Import error:', e);
      showToast('Gagal impor');
    }
  };

  const executeMerge = async () => {
    const allFiles = [
      ...selected.map((id) => documents.find((x) => x.id === id)).filter((d) => d && d.pdfUri).map((d) => ({ uri: d.pdfUri, name: d.name })),
      ...imported.map((f) => ({ uri: f.uri, name: f.name })),
    ];
    if (allFiles.length < 2) { showToast('Pilih minimal 2 PDF'); return; }
    try {
      onComplete('start', { total: allFiles.length });
      await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));
      const result = await mergePdfs(allFiles, 'gandes_merged');

      const firstDoc = documents.find((d) => d.id === selected[0]);
      const newDoc = {
        id: uid('doc'),
        name: `Gabungan ${new Date().toLocaleDateString('id-ID')}`,
        folderId: firstDoc?.folderId || 'f3',
        pages: result.pages,
        size: result.size,
        sizeStr: result.sizeStr,
        updatedAt: 'Baru saja',
        createdAt: Date.now(),
        favorite: false,
        color: '#00f2fe',
        ocr: '',
        pdfUri: result.uri,
        pageImages: [],
      };
      onComplete('done', newDoc);
      showToast(`✓ ${result.pages} halaman digabung`);
      go('documents');
    } catch (e) {
      console.error('Merge error:', e);
      onComplete('error');
      showToast('Gagal merge');
    }
  };

  const ordered = selected.map((id) => documents.find((d) => d.id === id)).filter(Boolean);
  const others = documents.filter((d) => !selected.includes(d.id));

  const MergeItem = ({ doc, active, index, onPress, onRemove }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: active ? 'rgba(0,242,254,0.06)' : colors.surface, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, marginBottom: 10 }}>
      <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? colors.cyan : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {active ? <Ionicons name="checkmark" size={14} color="#050811" /> : null}
      </View>
      <DocThumb doc={{ name: doc.name, color: doc.color || '#00f2fe', pages: doc.pages }} colors={colors} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{doc.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{doc.pages || 1} hal • {doc.sizeStr || fmtSize(doc.size || 0)}</Text>
      </View>
      {index ? <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 11 }}>#{index}</Text> : null}
      {onRemove ? (
        <Pressable onPress={onRemove} style={{ padding: 6 }}>
          <Ionicons name="close-circle" size={18} color={colors.rose} />
        </Pressable>
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title="Gabung PDF" subtitle={selected.length + imported.length ? `${selected.length + imported.length} dipilih` : 'Pilih 2+ dokumen'} onBack={() => go('pdf-tools')} colors={colors}
        right={<Btn label="Gabung" colors={colors} disabled={selected.length + imported.length < 2} onPress={executeMerge} style={{ paddingVertical: 10, paddingHorizontal: 14 }} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,242,254,0.08)', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <View>
            <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>DIPILIH</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{selected.length + imported.length}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>~{totalPages} halaman</Text>
          </View>
          <Ionicons name="add-circle-outline" size={42} color={colors.cyan} />
        </View>

        <Pressable onPress={importFromFiles} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong, borderStyle: 'dashed', marginBottom: 16 }}>
          <Ionicons name="folder-open-outline" size={20} color={colors.cyan} />
          <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 13 }}>Impor PDF dari File Manager</Text>
        </Pressable>

        {imported.length > 0 ? (
          <>
            <Text style={{ color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>PDF DIIMPOR</Text>
            {imported.map((f) => (
              <MergeItem
                key={f.id}
                doc={{ name: f.name, color: '#3b82f6', pages: f.pages, size: f.size, sizeStr: fmtSize(f.size) }}
                active
                onPress={() => {}}
                onRemove={() => setImported((prev) => prev.filter((x) => x.id !== f.id))}
              />
            ))}
          </>
        ) : null}

        {ordered.length > 0 ? (
          <>
            <Text style={{ color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginTop: 16 }}>DIPILIH — URUTAN GABUNG</Text>
            {ordered.map((d, i) => <MergeItem key={d.id} doc={d} active index={i + 1} onPress={() => toggle(d.id)} />)}
          </>
        ) : null}

        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 10 }}>TAMBAH DARI DOKUMEN</Text>
        {others.map((d) => <MergeItem key={d.id} doc={d} onPress={() => toggle(d.id)} />)}
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: SPLIT
   ============================================================ */
const SplitScreen = ({ colors, go, documents, currentDoc, showToast, params, onComplete }) => {
  const doc = currentDoc || documents.find((d) => d.id === params?.docId) || documents[0];
  const [mode, setMode] = useState('range');
  const [ranges, setRanges] = useState([{ from: 1, to: 1 }]);
  const [selectedPages, setSelectedPages] = useState([]);

  if (!doc) return <View style={{ flex: 1 }}><Header title="Pisah PDF" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="cut-outline" title="Pilih dokumen" colors={colors} /></View>;

  const executeSplit = async () => {
    if (!doc.pdfUri) { showToast('Dokumen belum punya PDF'); return; }
    try {
      onComplete('start', { total: 1 });
      await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));

      if (mode === 'range') {
        const results = await splitPdfByRanges(doc.pdfUri, ranges);
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const newDoc = {
            id: uid('doc'),
            name: `${doc.name} - Bagian ${i + 1}`,
            folderId: doc.folderId,
            pages: r.pages,
            size: r.size,
            sizeStr: fmtSize(r.size),
            updatedAt: 'Baru saja',
            createdAt: Date.now() + i,
            favorite: false,
            color: doc.color,
            ocr: '',
            pdfUri: r.uri,
            pageImages: [],
          };
          onComplete('done', newDoc);
        }
        showToast(`✓ Split jadi ${results.length} file`);
      } else if (mode === 'extract') {
        const res = await extractPdfPages(doc.pdfUri, selectedPages);
        const newDoc = {
          id: uid('doc'),
          name: `${doc.name} (extract)`,
          folderId: doc.folderId,
          pages: res.pages,
          size: res.size,
          sizeStr: fmtSize(res.size),
          updatedAt: 'Baru saja',
          createdAt: Date.now(),
          favorite: false,
          color: doc.color,
          ocr: '',
          pdfUri: res.uri,
          pageImages: selectedPages.map((n) => doc.pageImages?.[n - 1]).filter(Boolean),
        };
        onComplete('done', newDoc);
        showToast(`✓ ${res.pages} halaman diambil`);
      } else {
        const allRanges = Array.from({ length: doc.pages }).map((_, i) => ({ from: i + 1, to: i + 1 }));
        const results = await splitPdfByRanges(doc.pdfUri, allRanges);
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const newDoc = {
            id: uid('doc'),
            name: `${doc.name} - Hal ${i + 1}`,
            folderId: doc.folderId,
            pages: r.pages,
            size: r.size,
            sizeStr: fmtSize(r.size),
            updatedAt: 'Baru saja',
            createdAt: Date.now() + i,
            favorite: false,
            color: doc.color,
            ocr: '',
            pdfUri: r.uri,
            pageImages: doc.pageImages?.[i] ? [doc.pageImages[i]] : [],
          };
          onComplete('done', newDoc);
        }
        showToast(`✓ ${results.length} file dibuat`);
      }
      onComplete('done');
      go('documents');
    } catch (e) {
      console.error('Split error:', e);
      onComplete('error');
      showToast('Gagal split');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Pisah PDF" subtitle={`${doc.name} • ${doc.pages} halaman`} onBack={() => go('pdf-tools')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
          {[{ k: 'range', l: 'Per Range' }, { k: 'each', l: 'Per Halaman' }, { k: 'extract', l: 'Ambil Halaman' }].map((m) => (
            <Pressable key={m.k} onPress={() => setMode(m.k)} style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: mode === m.k ? 'rgba(0,242,254,0.08)' : colors.surface, borderWidth: 1, borderColor: mode === m.k ? colors.cyan : colors.border, alignItems: 'center' }}>
              <Text style={{ color: mode === m.k ? colors.cyan : colors.text, fontSize: 11, fontWeight: '800' }}>{m.l}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'range' ? (
          <>
            {ranges.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flex: 1, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700' }}>Range {i + 1}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6 }}>
                    <TextInput value={String(r.from)} onChangeText={(v) => setRanges((prev) => prev.map((x, idx) => idx === i ? { ...x, from: Math.max(1, parseInt(v) || 1) } : x))} keyboardType="numeric" style={{ flex: 1, padding: 6, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, fontSize: 13, textAlign: 'center' }} />
                    <Text style={{ color: colors.textDim }}>—</Text>
                    <TextInput value={String(r.to)} onChangeText={(v) => setRanges((prev) => prev.map((x, idx) => idx === i ? { ...x, to: Math.max(1, parseInt(v) || 1) } : x))} keyboardType="numeric" style={{ flex: 1, padding: 6, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, fontSize: 13, textAlign: 'center' }} />
                  </View>
                </View>
                {ranges.length > 1 ? <Pressable onPress={() => setRanges(ranges.filter((_, idx) => idx !== i))} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={14} color={colors.rose} /></Pressable> : null}
              </View>
            ))}
            <Pressable onPress={() => { const last = ranges[ranges.length - 1]; setRanges([...ranges, { from: last.to + 1, to: last.to + 1 }]); }} style={{ borderWidth: 1.5, borderColor: colors.borderStrong, borderStyle: 'dashed', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 12 }}>＋ Tambah range</Text>
            </Pressable>
            <Btn label={`Pisah Jadi ${ranges.length} File`} colors={colors} onPress={executeSplit} style={{ marginTop: 16 }} />
          </>
        ) : mode === 'each' ? (
          <>
            <View style={{ padding: 14, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 17 }}>
                ⚠️ Ini akan membuat {doc.pages} file PDF (1 per halaman).
              </Text>
            </View>
            <Btn label={`Pisah Semua (${doc.pages} file)`} colors={colors} onPress={executeSplit} />
          </>
        ) : (
          <>
            {Array.from({ length: doc.pages }).map((_, i) => {
              const on = selectedPages.includes(i + 1);
              return (
                <Pressable key={i} onPress={() => setSelectedPages((prev) => prev.includes(i + 1) ? prev.filter((x) => x !== i + 1) : [...prev, i + 1])} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: on ? 'rgba(0,242,254,0.06)' : colors.surface, borderWidth: 1, borderColor: on ? colors.cyan : colors.border, borderRadius: 14, marginBottom: 8 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: on ? colors.cyan : colors.border, backgroundColor: on ? colors.cyan : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Ionicons name="checkmark" size={14} color="#050811" /> : null}
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, flex: 1 }}>Halaman {i + 1}</Text>
                </Pressable>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Btn label="Pilih Semua" variant="soft" colors={colors} onPress={() => setSelectedPages(Array.from({ length: doc.pages }).map((_, i) => i + 1))} style={{ flex: 1 }} />
              <Btn label="Kosongkan" variant="soft" colors={colors} onPress={() => setSelectedPages([])} style={{ flex: 1 }} />
            </View>
            <Btn label={`Ambil ${selectedPages.length} Halaman`} colors={colors} disabled={!selectedPages.length} onPress={executeSplit} style={{ marginTop: 12 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: COMPRESS
   ============================================================ */
const CompressScreen = ({ colors, go, documents, currentDoc, showToast, params, onComplete }) => {
  const doc = currentDoc || documents.find((d) => d.id === params?.docId) || documents[0];
  const [level, setLevel] = useState('balanced');

  if (!doc) return <View style={{ flex: 1 }}><Header title="Kompres PDF" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="contract-outline" title="Pilih dokumen" colors={colors} /></View>;

  const executeCompress = async () => {
    if (!doc.pdfUri) { showToast('Dokumen belum punya PDF'); return; }
    try {
      onComplete('start', { total: 1 });
      await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));
      const result = await compressPdf(doc.pdfUri, level);
      const updatedDoc = { ...doc, size: result.size, sizeStr: result.sizeStr, updatedAt: 'Baru saja (compressed)', pdfUri: result.uri };
      onComplete('done', updatedDoc);
      showToast('✓ Kompres selesai');
      go('detail', { docId: doc.id });
    } catch (e) { onComplete('error'); showToast('Gagal kompres'); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Kompres PDF" subtitle={doc.name} onBack={() => go('pdf-tools')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 16 }}>
          <DocThumb doc={doc} colors={colors} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{doc.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{doc.pages} halaman • {doc.sizeStr}</Text>
          </View>
        </View>

        <View style={{ padding: 14, backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 14, marginBottom: 16 }}>
          <Text style={{ color: colors.amber, fontWeight: '800', fontSize: 11, marginBottom: 6 }}>YANG DIKOMPRES</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 17 }}>
            Kompres ini membersihkan metadata dan mengoptimasi struktur objek PDF. Untuk hasil signifikan pada PDF scan, sebaiknya scan ulang dengan preset lebih rendah.
          </Text>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>LEVEL</Text>
        {COMPRESS_LEVELS.map((l) => (
          <Pressable key={l.key} onPress={() => setLevel(l.key)} style={{ padding: 14, borderRadius: 14, backgroundColor: level === l.key ? 'rgba(0,242,254,0.08)' : colors.surface, borderWidth: 1, borderColor: level === l.key ? colors.cyan : colors.border, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: level === l.key ? colors.cyan : colors.border, backgroundColor: level === l.key ? colors.cyan : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {level === l.key ? <Ionicons name="checkmark" size={12} color="#050811" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: level === l.key ? colors.cyan : colors.text, fontSize: 13, fontWeight: '800' }}>{l.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{l.desc}</Text>
            </View>
          </Pressable>
        ))}

        <Btn label="Kompres Sekarang" icon="contract-outline" colors={colors} onPress={executeCompress} style={{ marginTop: 20 }} />
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: CONVERT
   ============================================================ */
const ConvertScreen = ({ colors, go, documents, currentDoc, showToast, params, onComplete, onImportImages }) => {
  const doc = currentDoc || documents.find((d) => d.id === params?.docId) || documents[0];
  const [format, setFormat] = useState('jpg');
  const [processing, setProcessing] = useState(false);
  const [importedImages, setImportedImages] = useState([]);

  if (!doc) return <View style={{ flex: 1 }}><Header title="Konversi" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="swap-horizontal-outline" title="Pilih dokumen" colors={colors} /></View>;

  const pageImages = doc.pageImages || [];

  const convertToImages = async () => {
    if (processing) return;
    if (pageImages.length === 0) { showToast('Dokumen ini tidak punya page image'); return; }
    try {
      setProcessing(true);
      onComplete('start', { total: pageImages.length });
      const outputs = await convertImages(pageImages, format, doc.name.replace(/[^a-z0-9]/gi, '_'));
      onComplete('done');
      showToast(`✓ ${outputs.length} file ${format.toUpperCase()} dibuat`);
      if (outputs.length > 0 && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(outputs[0]);
      }
    } catch (e) {
      console.error(e);
      onComplete('error');
      showToast('Gagal konversi');
    } finally {
      setProcessing(false);
    }
  };

  const importImages = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const persisted = [];
      for (const a of result.assets) {
        try {
          const perm = await persistImage(a.uri, 'imgpdf');
          persisted.push(perm);
        } catch (e) {}
      }
      setImportedImages((prev) => [...prev, ...persisted]);
      showToast(`${persisted.length} gambar siap dikonversi`);
    } catch (e) {
      console.error(e);
      showToast('Gagal impor');
    }
  };

  const buildPdfFromImages = async () => {
    if (importedImages.length === 0) { showToast('Impor gambar dulu'); return; }
    try {
      setProcessing(true);
      onComplete('start', { total: importedImages.length });
      const result = await imagesToPdf(importedImages, 'from_images');
      const newDoc = {
        id: uid('doc'),
        name: `Dari Gambar ${new Date().toLocaleDateString('id-ID')}`,
        folderId: 'f3',
        pages: result.pages,
        size: result.size,
        sizeStr: result.sizeStr,
        updatedAt: 'Baru saja',
        createdAt: Date.now(),
        favorite: false,
        color: '#8b5cf6',
        ocr: '',
        pdfUri: result.uri,
        pageImages: importedImages,
      };
      onComplete('done', newDoc);
      setImportedImages([]);
      showToast(`✓ PDF dari ${result.pages} gambar dibuat`);
      go('documents');
    } catch (e) {
      console.error(e);
      onComplete('error');
      showToast('Gagal buat PDF');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Konversi" subtitle="PDF ↔ Gambar" onBack={() => go('pdf-tools')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* PDF to Image */}
        <View style={{ padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="document-text-outline" size={20} color={colors.cyan} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>PDF → Gambar</Text>
          </View>
          {pageImages.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 17 }}>
              Dokumen ini tidak punya page image (hasil merge/split tidak bisa).
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 12 }}>{doc.name} • {pageImages.length} halaman</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {CONVERT_FORMATS.map((f) => (
                  <Pressable key={f.key} onPress={() => setFormat(f.key)} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: format === f.key ? 'rgba(0,242,254,0.08)' : colors.surfaceSoft, borderWidth: 1, borderColor: format === f.key ? colors.cyan : colors.border, alignItems: 'center' }}>
                    <Text style={{ color: format === f.key ? colors.cyan : colors.text, fontWeight: '800', fontSize: 13 }}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Btn label={`Konversi ke ${format.toUpperCase()}`} colors={colors} onPress={convertToImages} disabled={processing} />
            </>
          )}
        </View>

        {/* Image to PDF */}
        <View style={{ padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Ionicons name="images-outline" size={20} color={colors.violet} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Gambar → PDF</Text>
          </View>
          {importedImages.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 12 }}>Belum ada gambar. Impor dari file manager.</Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 12 }}>{importedImages.length} gambar siap dikonversi</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Impor Gambar" icon="folder-open-outline" variant="soft" colors={colors} onPress={importImages} style={{ flex: 1 }} />
            {importedImages.length > 0 ? (
              <Btn label="Buat PDF" colors={colors} onPress={buildPdfFromImages} disabled={processing} style={{ flex: 1 }} />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: WATERMARK
   ============================================================ */
const WatermarkScreen = ({ colors, go, documents, currentDoc, showToast, params, onComplete }) => {
  const doc = currentDoc || documents.find((d) => d.id === params?.docId) || documents[0];
  const [text, setText] = useState('GANDES SCANNER');

  if (!doc) return <View style={{ flex: 1 }}><Header title="Watermark" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="water-outline" title="Pilih dokumen" colors={colors} /></View>;

  const executeWatermark = async () => {
    if (!doc.pdfUri) { showToast('Dokumen belum punya PDF'); return; }
    if (!text.trim()) { showToast('Isi teks watermark'); return; }
    try {
      onComplete('start', { total: 1 });
      await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));
      const result = await watermarkPdf(doc.pdfUri, text.trim());
      const updatedDoc = { ...doc, pdfUri: result.uri, updatedAt: 'Baru saja (watermarked)' };
      onComplete('done', updatedDoc);
      showToast('✓ Watermark ditambahkan');
      go('detail', { docId: doc.id });
    } catch (e) { onComplete('error'); showToast('Gagal tambah watermark'); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Watermark" subtitle={doc.name} onBack={() => go('pdf-tools')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DocThumb doc={doc} colors={colors} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{doc.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{doc.pages} halaman</Text>
          </View>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>TEKS WATERMARK</Text>
        <TextInput value={text} onChangeText={setText} placeholder="Contoh: RAHASIA" placeholderTextColor={colors.textDim} style={{ padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, fontSize: 14 }} />
        <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 14, alignItems: 'center', minHeight: 180, justifyContent: 'center' }}>
          <View style={{ width: '80%', aspectRatio: 0.72, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <Text style={{ color: 'rgba(100,100,100,0.5)', fontWeight: '900', fontSize: 24, transform: [{ rotate: '-30deg' }] }} numberOfLines={2}>{text || 'WATERMARK'}</Text>
          </View>
        </View>
        <Btn label="Terapkan Watermark" icon="water-outline" colors={colors} onPress={executeWatermark} style={{ marginTop: 20 }} />
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: LOCK
   ============================================================ */
const LockScreen = ({ colors, storedPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [triedBio, setTriedBio] = useState(false);

  useEffect(() => {
    if (triedBio) return;
    setTriedBio(true);
    (async () => {
      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (has && enrolled) {
          const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Buka kunci Gandes Scanner' });
          if (r.success) onUnlock();
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === storedPin) onUnlock();
      else { setError('PIN salah'); setPin(''); haptic('error'); }
    }
  }, [pin]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(0,242,254,0.15)', borderWidth: 1, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="lock-closed" size={36} color={colors.cyan} />
      </View>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Gandes Scanner</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 30 }}>Masukkan PIN untuk membuka</Text>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 40 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: pin.length > i ? colors.cyan : 'transparent', borderWidth: 2, borderColor: pin.length > i ? colors.cyan : colors.border }} />
        ))}
      </View>
      {error ? <Text style={{ color: colors.rose, fontSize: 12, marginBottom: 10 }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' }}>
        {keys.map((k) => (
          <Pressable key={k} onPress={async () => {
            if (k === 'del') setPin((p) => p.slice(0, -1));
            else if (k === 'bio') { const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Biometrik' }); if (r.success) onUnlock(); }
            else if (pin.length < 4) setPin((p) => p + k);
          }} style={{ width: 76, height: 76, margin: 4, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border }}>
            {k === 'del' ? <Ionicons name="backspace-outline" size={24} color={colors.text} /> : k === 'bio' ? <Ionicons name="finger-print" size={26} color={colors.cyan} /> : <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{k}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

/* ============================================================
   BOTTOM DOCK
   ============================================================ */
const BottomDock = React.memo(({ colors, current, go }) => {
  const insets = useSafeAreaInsets();
  const tabs = [
    { k: 'home', icon: 'home-outline', label: 'Home' },
    { k: 'documents', icon: 'documents-outline', label: 'Docs' },
    { k: '__fab__' },
    { k: 'pdf-tools', icon: 'construct-outline', label: 'Tools' },
    { k: 'settings', icon: 'settings-outline', label: 'Setting' },
  ];
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceSolid + 'EE', borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom + 6, paddingTop: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', zIndex: 40 }}>
      {tabs.map((t) => {
        if (t.k === '__fab__') {
          return (
            <Pressable key="fab" onPress={() => go('scanner')} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center', marginTop: -32, borderWidth: 4, borderColor: colors.bg }}>
                <Ionicons name="scan" size={26} color="#050811" />
              </View>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.cyan, marginTop: 2 }}>Scan</Text>
            </Pressable>
          );
        }
        const active = current === t.k;
        return (
          <Pressable key={t.k} onPress={() => go(t.k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Ionicons name={t.icon} size={20} color={active ? colors.cyan : colors.textDim} />
            <Text style={{ fontSize: 9, fontWeight: '700', marginTop: 3, color: active ? colors.cyan : colors.textDim }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

/* ============================================================
   APP ROOT
   ============================================================ */
const TAB_SCREENS = ['home', 'documents', 'folders', 'settings', 'pdf-tools'];

const AppInner = ({ onReady }) => {
  const insets = useSafeAreaInsets();
  const [themeMode, setThemeMode] = useState('dark');
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [capturedImages, setCapturedImages] = useState([]);
  const [toast, setToast] = useState(null);
  const [appLock, setAppLock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [storedPin, setStoredPin] = useState('1234');
  const [qualityPreset, setQualityPreset] = useState('hd');
  const [progress, setProgress] = useState({ visible: false, title: '', sub: '', value: 0 });
  const [hydrated, setHydrated] = useState(false);

  const colors = COLORS[themeMode] || COLORS.dark;
  const currentScreen = stack[stack.length - 1];

  const toastTimer = useRef(null);
  const progressTimer = useRef(null);
  const progressCancelled = useRef(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  // Hydrate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [savedDocs, savedFolders, savedSettings, savedTheme, savedPin] = await Promise.all([
          Storage.getJSON(STORAGE_KEYS.DOCS),
          Storage.getJSON(STORAGE_KEYS.FOLDERS),
          Storage.getJSON(STORAGE_KEYS.SETTINGS),
          Storage.get(STORAGE_KEYS.THEME),
          Storage.get(STORAGE_KEYS.PIN),
        ]);
        if (cancelled) return;
        if (savedDocs) setDocuments(savedDocs);
        if (savedFolders) setFolders(savedFolders);
        if (savedSettings) {
          if (savedSettings.appLock !== undefined) setAppLock(savedSettings.appLock);
          if (savedSettings.qualityPreset) setQualityPreset(savedSettings.qualityPreset);
        }
        if (savedTheme) setThemeMode(savedTheme);
        if (savedPin) setStoredPin(savedPin);
      } catch (e) {}
      finally {
        if (!cancelled) {
          setHydrated(true);
          onReady?.();
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    Storage.setJSON(STORAGE_KEYS.DOCS, documents);
  }, [documents, hydrated]);
  useEffect(() => { if (hydrated) Storage.setJSON(STORAGE_KEYS.FOLDERS, folders); }, [folders, hydrated]);
  useEffect(() => { if (hydrated) Storage.setJSON(STORAGE_KEYS.SETTINGS, { appLock, qualityPreset }); }, [appLock, qualityPreset, hydrated]);
  useEffect(() => { if (hydrated) Storage.set(STORAGE_KEYS.THEME, themeMode); }, [themeMode, hydrated]);

  const go = useCallback((name, params = {}) => {
    setStack((prev) => {
      if (TAB_SCREENS.includes(name)) return [{ name, params }];
      return [...prev, { name, params }];
    });
  }, []);

  const switchTab = useCallback((name) => setStack([{ name, params: {} }]), []);

  const toggleFavorite = useCallback((id) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d)));
  }, []);

  const renameDoc = useCallback((id, name) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
    showToast('Nama diperbarui');
  }, [showToast]);

  const deleteDoc = useCallback((id) => {
    const doDelete = () => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      go('documents');
      showToast('Dokumen dihapus');
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Hapus dokumen ini?')) doDelete();
    } else {
      Alert.alert('Hapus Dokumen', 'Dokumen ini akan dihapus permanen.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [showToast, go]);

  const deletePage = useCallback((id, idx) => {
    setDocuments((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      if (d.pages <= 1) { showToast('Minimal 1 halaman'); return d; }
      const newImages = (d.pageImages || []).filter((_, i) => i !== idx);
      return { ...d, pages: d.pages - 1, pageImages: newImages };
    }));
    showToast('Halaman dihapus');
  }, [showToast]);

  const addPage = useCallback((id) => {
    go('scanner', { appendToDocId: id });
  }, [go]);

  const saveScannedDocument = useCallback(async (images) => {
    if (progressCancelled.current) { progressCancelled.current = false; return; }
    try {
      setProgress({ visible: true, title: 'Menyimpan dokumen…', sub: 'Generate PDF', value: 10 });
      const imageUris = images.map((img) => img.uri);
      const pdfResult = await imagesToPdf(imageUris, 'gandes_scan');
      const doc = {
        id: uid('doc'),
        name: `Scan ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID').slice(0, 5)}`,
        folderId: 'f3',
        pages: images.length,
        size: pdfResult.size,
        sizeStr: pdfResult.sizeStr,
        updatedAt: 'Baru saja',
        createdAt: Date.now(),
        favorite: false,
        color: '#00f2fe',
        ocr: '',
        pdfUri: pdfResult.uri,
        pageImages: imageUris,
      };
      setDocuments((prev) => [doc, ...prev]);
      setCapturedImages([]);
      setProgress({ visible: false, title: '', sub: '', value: 0 });
      haptic('success');
      go('home');
      showToast(`✓ ${images.length} halaman (${pdfResult.sizeStr})`);
    } catch (e) {
      console.error('Save error:', e);
      setProgress({ visible: false, title: '', sub: '', value: 0 });
      showToast('Gagal menyimpan: ' + (e.message || 'unknown'));
    }
  }, [go, showToast]);

  const onToolProgress = useCallback((state, doc) => {
    if (state === 'start') {
      progressCancelled.current = false;
      setProgress({ visible: true, title: 'Memproses…', sub: 'Mohon tunggu', value: 0 });
      let v = 0;
      if (progressTimer.current) clearInterval(progressTimer.current);
      progressTimer.current = setInterval(() => {
        v += 15;
        if (v >= 95) { clearInterval(progressTimer.current); progressTimer.current = null; }
        setProgress((p) => ({ ...p, value: Math.min(95, v) }));
      }, 150);
    } else if (state === 'done') {
      if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
      setProgress((p) => ({ ...p, value: 100 }));
      setTimeout(() => setProgress({ visible: false, title: '', sub: '', value: 0 }), 300);
      if (doc && doc.id) {
        setDocuments((prev) => {
          const idx = prev.findIndex((d) => d.id === doc.id);
          if (idx >= 0) {
            const copy = prev.slice();
            copy[idx] = doc;
            return copy;
          }
          return [doc, ...prev];
        });
      }
    } else if (state === 'error') {
      if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
      setProgress({ visible: false, title: '', sub: '', value: 0 });
    }
  }, []);

  const cancelProgress = useCallback(() => {
    progressCancelled.current = true;
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    setProgress({ visible: false, title: '', sub: '', value: 0 });
    showToast('Dibatalkan');
  }, [showToast]);

  const changePin = useCallback(async (pin) => {
    setStoredPin(pin);
    await Storage.set(STORAGE_KEYS.PIN, pin);
  }, []);

  const currentDoc = useMemo(() => {
    const docId = currentScreen.params?.docId;
    if (!docId) return null;
    return documents.find((d) => d.id === docId) || null;
  }, [currentScreen.params?.docId, documents]);

  const folderNameById = useCallback((id) => folders.find((f) => f.id === id)?.name || 'DOC', [folders]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.cyan} size="large" />
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, fontWeight: '600' }}>Memuat Gandes Scanner…</Text>
      </View>
    );
  }

  if (appLock && !unlocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <LockScreen colors={colors} storedPin={storedPin} onUnlock={() => setUnlocked(true)} />
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    const { name, params } = currentScreen;
    switch (name) {
      case 'home': return <HomeScreen colors={colors} documents={documents} folders={folders} go={go} showToast={showToast} onToggleFav={toggleFavorite} folderNameById={folderNameById} />;
      case 'documents': return <DocumentsScreen colors={colors} documents={documents} folders={folders} go={go} onToggleFav={toggleFavorite} filterFolderId={params.folderId} />;
      case 'folders': return <FoldersScreen colors={colors} documents={documents} folders={folders} go={go} />;
      case 'settings': return <SettingsScreen colors={colors} themeMode={themeMode} onToggleTheme={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))} appLock={appLock} onToggleLock={(v) => {
        setAppLock(v);
        if (!v) setUnlocked(true);
        else setUnlocked(false);
        showToast(v ? '🔒 Kunci aktif' : 'Kunci nonaktif');
      }} onChangePin={changePin} qualityPreset={qualityPreset} go={go} showToast={showToast} />;
      case 'quality': return <QualityScreen colors={colors} qualityPreset={qualityPreset} setQualityPreset={setQualityPreset} go={go} showToast={showToast} />;
      case 'pdf-tools': return <PdfToolsScreen colors={colors} go={go} />;
      case 'scanner': return <ScannerScreen colors={colors} go={go} capturedImages={capturedImages} setCapturedImages={setCapturedImages} showToast={showToast} initialParams={params} />;
      case 'enhance': return <EnhanceScreen colors={colors} go={go} capturedImages={capturedImages} setCapturedImages={setCapturedImages} qualityPreset={qualityPreset} showToast={showToast} onSaveDocument={saveScannedDocument} />;
      case 'preview': return <PreviewScreen colors={colors} go={go} currentDoc={currentDoc} showToast={showToast} />;
      case 'detail': return <DetailScreen colors={colors} go={go} currentDoc={currentDoc} folders={folders} onToggleFav={toggleFavorite} onRename={renameDoc} onDelete={deleteDoc} onDeletePage={deletePage} onAddPage={addPage} showToast={showToast} />;
      case 'merge': return <MergeScreen colors={colors} go={go} documents={documents} folders={folders} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'split': return <SplitScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'compress': return <CompressScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'convert': return <ConvertScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'watermark': return <WatermarkScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      default: return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text }}>Halaman tidak ditemukan: {name}</Text></View>;
    }
  };

  const showDock = TAB_SCREENS.includes(currentScreen.name);

  return (
    <ThemeContext.Provider value={{ colors, mode: themeMode, setMode: setThemeMode }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {renderScreen()}
        {showDock ? <BottomDock colors={colors} current={currentScreen.name} go={switchTab} /> : null}
        <Toast message={toast} colors={colors} topInset={insets.top} />
        <ProgressModal
          visible={progress.visible}
          title={progress.title}
          sub={progress.sub}
          progress={progress.value}
          colors={colors}
          onCancel={cancelProgress}
        />
      </View>
    </ThemeContext.Provider>
  );
};

const App = () => {
  const [ready, setReady] = useState(false);

  const handleReady = useCallback(() => {
    setReady(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Fallback: paksa hide splash setelah 4 detik
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080b11' }} edges={['top']}>
        <StatusBar style="light" />
        <AppInner onReady={handleReady} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;
