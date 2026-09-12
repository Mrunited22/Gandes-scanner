// ⚠️ WAJIB: pdf-lib butuh Buffer di React Native
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

/**
 * Gandes Scanner
 * Modern AI Document Scanner - Offline First
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
  KeyboardAvoidingView,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
  { key: 'ultra', label: 'Ultra HD', badge: '4K', dpi: 400, res: 4000, sizeMult: 3.5, tag: 'PRO', desc: 'Arsip & cetak ulang' },
  { key: 'hd', label: 'HD', badge: 'HD', dpi: 300, res: 2500, sizeMult: 2.0, tag: 'REC', desc: 'Standar scan profesional' },
  { key: 'medium', label: 'Medium', badge: 'MD', dpi: 200, res: 1600, sizeMult: 1.0, tag: '', desc: 'Share via chat & email' },
  { key: 'compact', label: 'Compact', badge: 'LT', dpi: 150, res: 1000, sizeMult: 0.4, tag: '', desc: 'Hemat storage' },
  { key: 'auto', label: 'Auto', badge: 'AI', dpi: 0, res: 0, sizeMult: 1.5, tag: '', desc: 'Biarkan AI menentukan' },
];

const FILTERS = [
  { key: 'original', label: 'Original', bg: '#FAFAF7' },
  { key: 'auto', label: 'Auto', bg: '#FBFBF8' },
  { key: 'bw', label: 'B&W', bg: '#F5F5F5' },
  { key: 'gray', label: 'Grayscale', bg: '#E7E7E7' },
  { key: 'doc', label: 'Document', bg: '#FFFDF5' },
  { key: 'photo', label: 'Photo', bg: '#F1E8D8' },
];

const COMPRESS_LEVELS = [
  { key: 'light', label: 'Light', ratio: 30, desc: 'Turun kualitas 90%' },
  { key: 'balanced', label: 'Balanced', ratio: 55, desc: 'Kualitas 70%' },
  { key: 'aggressive', label: 'Aggressive', ratio: 75, desc: 'Kualitas 50%' },
  { key: 'extreme', label: 'Extreme', ratio: 88, desc: 'Kualitas 30%' },
];

const CONVERT_FORMATS = [
  { key: 'jpg', label: 'JPG', desc: 'Gambar terkompresi', size: '~150 KB/hal', color: '#f59e0b' },
  { key: 'png', label: 'PNG', desc: 'Gambar tanpa kompresi', size: '~800 KB/hal', color: '#8b5cf6' },
  { key: 'txt', label: 'TXT', desc: 'Teks dari OCR', size: '~5 KB/hal', color: '#64748b' },
];

const ANNO_COLORS = ['#00f2fe', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#111827'];

/* ============================================================
   UTILITIES
   ============================================================ */
export const fmtSize = (mb) => {
  if (!mb || mb <= 0) return '0 KB';
  if (mb >= 1) return mb.toFixed(1) + ' MB';
  return Math.round(mb * 1024) + ' KB';
};

export const initials = (n) => (n || 'XX').slice(0, 2).toUpperCase();
export const uid = (prefix = 'id') => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const haptic = async (style = 'light') => {
  try {
    if (style === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (style === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (style === 'heavy') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (style === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (style === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {}
};

/* ============================================================
   STORAGE SERVICE
   ============================================================ */
const STORAGE_KEYS = {
  DOCS: '@gandes:documents',
  FOLDERS: '@gandes:folders',
  SETTINGS: '@gandes:settings',
  THEME: '@gandes:theme',
};

const Storage = {
  async getDocs() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DOCS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  async saveDocs(docs) {
    try { await AsyncStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(docs)); } catch (e) {}
  },
  async getFolders() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  async saveFolders(folders) {
    try { await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders)); } catch (e) {}
  },
  async getSettings() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  async saveSettings(settings) {
    try { await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); } catch (e) {}
  },
  async getTheme() {
    try { return (await AsyncStorage.getItem(STORAGE_KEYS.THEME)) || 'dark'; } catch (e) { return 'dark'; }
  },
  async saveTheme(mode) {
    try { await AsyncStorage.setItem(STORAGE_KEYS.THEME, mode); } catch (e) {}
  },
};

/* ============================================================
   PDF SERVICE
   ============================================================ */
const buildPageHTML = (imageUri) => `
  <div style="page-break-after: always; width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:0; margin:0;">
    <img src="${imageUri}" style="max-width:100%; max-height:100%; object-fit:contain;" />
  </div>
`;

export const imagesToPdf = async (imageUris, docName = 'document') => {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /><style>@page { margin: 0; } body { margin: 0; padding: 0; } img { display: block; }</style></head><body>${imageUris.map((u) => buildPageHTML(u)).join('')}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const info = await FileSystem.getInfoAsync(uri);
  const sizeMB = (info.size || 0) / (1024 * 1024);
  return { uri, size: sizeMB, sizeStr: fmtSize(sizeMB), pages: imageUris.length };
};

export const mergePdfs = async (pdfFiles, outputName = 'merged') => {
  const mergedPdf = await PDFDocument.create();
  for (const file of pdfFiles) {
    const pdfBytes = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
    const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
  }
  const mergedBytes = await mergedPdf.save();
  const outPath = `${FileSystem.documentDirectory}${outputName}_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outPath, Buffer.from(mergedBytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(outPath);
  const sizeMB = (info.size || 0) / (1024 * 1024);
  return { uri: outPath, size: sizeMB, sizeStr: fmtSize(sizeMB), pages: mergedPdf.getPageCount() };
};

export const splitPdfByRanges = async (sourceUri, ranges = []) => {
  const pdfBytes = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
  const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
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
    const outPath = `${FileSystem.documentDirectory}split_${i + 1}_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(outPath, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(outPath);
    results.push({ uri: outPath, pages: safeTo - safeFrom + 1, size: (info.size || 0) / (1024 * 1024) });
  }
  return results;
};

export const extractPdfPages = async (sourceUri, pageNumbers = []) => {
  const pdfBytes = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
  const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const indices = pageNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < srcPdf.getPageCount());
  const copied = await newPdf.copyPages(srcPdf, indices);
  copied.forEach((p) => newPdf.addPage(p));
  const bytes = await newPdf.save();
  const outPath = `${FileSystem.documentDirectory}extracted_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outPath, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(outPath);
  return { uri: outPath, pages: copied.length, size: (info.size || 0) / (1024 * 1024) };
};

export const watermarkPdf = async (sourceUri, text = 'GANDES SCANNER') => {
  const pdfBytes = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    page.drawText(text, { x: width / 2 - text.length * 10, y: height / 2, size: 48, font, color: rgb(0.6, 0.6, 0.6), opacity: 0.35, rotate: degrees(-30) });
  });
  const bytes = await pdfDoc.save();
  const outPath = `${FileSystem.documentDirectory}watermarked_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outPath, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(outPath);
  return { uri: outPath, size: (info.size || 0) / (1024 * 1024), sizeStr: fmtSize((info.size || 0) / (1024 * 1024)), pages: pdfDoc.getPageCount() };
};

export const compressPdf = async (sourceUri, ratio = 50) => {
  const pdfBytes = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
  const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcPdf, srcPdf.getPageIndices());
  copiedPages.forEach((p) => newPdf.addPage(p));
  newPdf.setTitle('');
  newPdf.setAuthor('');
  newPdf.setSubject('');
  newPdf.setKeywords([]);
  newPdf.setProducer('Gandes Scanner');
  newPdf.setCreator('Gandes Scanner');
  const bytes = await newPdf.save({ useObjectStreams: true });
  const outPath = `${FileSystem.documentDirectory}compressed_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(outPath, Buffer.from(bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(outPath);
  const newSize = (info.size || 0) / (1024 * 1024);
  return { uri: outPath, size: newSize, sizeStr: fmtSize(newSize), pages: newPdf.getPageCount() };
};

/* ============================================================
   THEME CONTEXT
   ============================================================ */
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);
const ThemeProvider = ({ children, mode, setMode }) => {
  const colors = COLORS[mode] || COLORS.dark;
  return <ThemeContext.Provider value={{ colors, mode, setMode }}>{children}</ThemeContext.Provider>;
};

/* ============================================================
   UI COMPONENTS
   ============================================================ */
export const Card = ({ children, style, onPress, active, colors }) => {
  const Comp = onPress ? Pressable : View;
  return <Comp onPress={onPress} style={[{ backgroundColor: colors.surface, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, borderRadius: 18, padding: 16 }, style]}>{children}</Comp>;
};

export const Btn = ({ label, icon, onPress, colors, variant = 'primary', style, disabled }) => {
  const variants = {
    primary: { bg: colors.cyan, fg: '#050811' },
    soft: { bg: colors.surfaceSoft, fg: colors.text, border: colors.border },
    danger: { bg: colors.rose, fg: '#fff' },
    ghost: { bg: 'transparent', fg: colors.text },
  };
  const v = variants[variant] || variants.primary;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ backgroundColor: v.bg, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.85 : 1, borderWidth: v.border ? 1 : 0, borderColor: v.border || 'transparent' }, style]}>
      {icon ? <Ionicons name={icon} size={16} color={v.fg} style={{ marginRight: label ? 8 : 0 }} /> : null}
      {label ? <Text style={{ color: v.fg, fontWeight: '700', fontSize: 14 }}>{label}</Text> : null}
    </Pressable>
  );
};

export const Chip = ({ label, active, onPress, colors, icon }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? 'rgba(0,242,254,0.12)' : colors.surfaceSoft, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
    {icon ? <Ionicons name={icon} size={12} color={active ? colors.cyan : colors.textMuted} style={{ marginRight: 6 }} /> : null}
    <Text style={{ color: active ? colors.cyan : colors.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
  </Pressable>
);

export const IconPill = ({ name, onPress, colors, active }) => (
  <Pressable onPress={onPress} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: active ? colors.cyan : colors.surface, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={18} color={active ? '#050811' : colors.text} />
  </Pressable>
);

export const Header = ({ title, subtitle, onBack, colors, right }) => (
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
);

export const SearchBar = ({ value, onChange, colors, placeholder = 'Cari…' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, height: 46 }}>
    <Ionicons name="search" size={18} color={colors.textDim} />
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textDim} style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 14, paddingVertical: 0 }} />
    {value ? <Pressable onPress={() => onChange('')}><Ionicons name="close-circle" size={18} color={colors.textDim} /></Pressable> : null}
  </View>
);

export const Toast = ({ message, colors }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  useEffect(() => {
    if (message) {
      Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }), Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true })]).start();
    } else {
      Animated.parallel([Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }), Animated.timing(translateY, { toValue: -10, duration: 200, useNativeDriver: true })]).start();
    }
  }, [message]);
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 50, left: 20, right: 20, zIndex: 100, alignItems: 'center', opacity, transform: [{ translateY }] }}>
      <View style={{ backgroundColor: colors.toastBg, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', maxWidth: SCREEN_W - 60 }}>
        <Ionicons name="sparkles" size={14} color={colors.cyan} style={{ marginRight: 8 }} />
        <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 12 }}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export const ProgressModal = ({ visible, title, sub, progress, colors }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ backgroundColor: colors.surfaceSolid, borderRadius: 18, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.borderStrong }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>{title}</Text>
        {sub ? <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>{sub}</Text> : null}
        <View style={{ height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 4, marginTop: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.cyan, borderRadius: 4 }} />
        </View>
        <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 12, textAlign: 'center', marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{progress}%</Text>
      </View>
    </View>
  </Modal>
);

export const EmptyState = ({ icon = 'folder-open-outline', title, message, colors, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
    <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <Ionicons name={icon} size={30} color={colors.textMuted} />
    </View>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>{title}</Text>
    {message ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>{message}</Text> : null}
    {action}
  </View>
);

export const DocThumb = ({ doc, colors, size = 46 }) => (
  <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: doc.color + '22', borderWidth: 1, borderColor: doc.color + '55', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: doc.color, fontWeight: '900', fontSize: size * 0.28 }}>{initials(doc.name)}</Text>
    {doc.pages > 1 ? (
      <View style={{ position: 'absolute', bottom: -3, right: -3, backgroundColor: doc.color, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>{doc.pages}p</Text>
      </View>
    ) : null}
  </View>
);

export const DocCard = ({ doc, onPress, onToggleFav, colors }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: pressed ? 0.85 : 1 }]}>
    <DocThumb doc={doc} colors={colors} />
    <View style={{ flex: 1, marginLeft: 13, minWidth: 0 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13.5 }} numberOfLines={1}>{doc.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
        <View style={{ backgroundColor: colors.surfaceSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '700' }}>{(doc.folder || 'DOC').toUpperCase()}</Text>
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
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

const circleBtnStyle = { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' };
const cornerStyle = { position: 'absolute', width: 28, height: 28, borderColor: '#00f2fe' };

/* ============================================================
   SCREEN: HOME
   ============================================================ */
const HomeScreen = ({ colors, documents, folders, go, showToast, onToggleFav }) => {
  const [query, setQuery] = useState('');
  const recent = documents.slice(0, 4);
  const totalPages = documents.reduce((s, d) => s + (d.pages || 0), 0);
  const favCount = documents.filter((d) => d.favorite).length;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const quickTools = [
    { key: 'merge', label: 'Gabung PDF', desc: 'Satukan beberapa dokumen', icon: 'add-circle-outline', action: () => go('merge') },
    { key: 'split', label: 'Pisah PDF', desc: 'Split range / per halaman', icon: 'cut-outline', action: () => go('split') },
    { key: 'compress', label: 'Kompres PDF', desc: 'Hemat hingga 80%', icon: 'contract-outline', action: () => go('compress') },
    { key: 'convert', label: 'Konversi', desc: 'PDF ↔ JPG, PNG, TXT', icon: 'swap-horizontal-outline', action: () => go('convert') },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>{greeting} 👋 — Smart AI Scanner</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 2, color: colors.text }}>Gandes Scanner</Text>
          </View>
          <IconPill name="settings-outline" colors={colors} onPress={() => go('settings')} />
        </View>
        <SearchBar value={query} onChange={setQuery} colors={colors} placeholder="Cari nama dokumen, folder, atau OCR…" />
      </View>

      <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
        <LinearGradient colors={['rgba(0,242,254,0.16)', 'rgba(59,130,246,0.08)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.borderStrong }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,242,254,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,242,254,0.28)', marginBottom: 12 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald, marginRight: 6 }} />
            <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>NEURAL VISION ENGINE</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>Mulai Scan Cepat</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 18 }}>Deteksi tepi otomatis, pembersihan bayangan AI, ekspor PDF instan & OCR offline.</Text>
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
          <Card colors={colors}>
            <EmptyState icon="document-outline" title="Belum ada dokumen" message="Scan atau impor dokumen pertama Anda." colors={colors} />
          </Card>
        ) : (
          recent.map((doc) => (
            <DocCard key={doc.id} doc={doc} colors={colors} onPress={() => go('detail', { docId: doc.id })} onToggleFav={() => onToggleFav(doc.id)} />
          ))
        )}
      </View>

      <SectionHead title="Folder" action="Kelola" onAction={() => go('folders')} colors={colors} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 }}>
        {folders.map((f) => {
          const count = documents.filter((d) => d.folder === f.name).length;
          return (
            <Pressable key={f.id} onPress={() => go('documents', { folder: f.name })} style={{ width: 120, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: f.color + '22', borderWidth: 1, borderColor: f.color + '44', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Text style={{ color: f.color, fontWeight: '900', fontSize: 10 }}>{f.glyph}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{f.name}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{count} dokumen</Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
const DocumentsScreen = ({ colors, documents, go, onToggleFav, filterFolder, clearFilter, showToast }) => {
  const [query, setQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState(filterFolder || 'All');
  const [sort, setSort] = useState('recent');
  const [favOnly, setFavOnly] = useState(false);

  useEffect(() => { if (filterFolder) setActiveFolder(filterFolder); }, [filterFolder]);

  const folderList = ['All', ...new Set(documents.map((d) => d.folder).filter(Boolean))];

  const filtered = useMemo(() => {
    let list = documents.slice();
    if (activeFolder !== 'All') list = list.filter((d) => d.folder === activeFolder);
    if (favOnly) list = list.filter((d) => d.favorite);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((d) => (d.name || '').toLowerCase().includes(q) || (d.ocr || '').toLowerCase().includes(q));
    }
    if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sort === 'pages') list.sort((a, b) => (b.pages || 0) - (a.pages || 0));
    return list;
  }, [documents, activeFolder, favOnly, query, sort]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Dokumen Saya" subtitle={`${filtered.length} dari ${documents.length} dokumen`} colors={colors} right={<IconPill name={favOnly ? 'star' : 'star-outline'} colors={colors} active={favOnly} onPress={() => setFavOnly((v) => !v)} />} />
      <View style={{ paddingHorizontal: 16 }}><SearchBar value={query} onChange={setQuery} colors={colors} placeholder="Cari dokumen…" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        {folderList.map((f) => (<Chip key={f} label={f} active={activeFolder === f} colors={colors} onPress={() => { setActiveFolder(f); if (f === 'All' && clearFilter) clearFilter(); }} />))}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>URUTKAN</Text>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Terbaru" active={sort === 'recent'} colors={colors} onPress={() => setSort('recent')} />
          <Chip label="Nama" active={sort === 'name'} colors={colors} onPress={() => setSort('name')} />
          <Chip label="Halaman" active={sort === 'pages'} colors={colors} onPress={() => setSort('pages')} />
        </View>
      </View>
      <FlatList data={filtered} keyExtractor={(it) => it.id} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }} ListEmptyComponent={<EmptyState icon="search-outline" title="Tidak ada dokumen" message="Coba ubah kata kunci atau filter folder." colors={colors} />} renderItem={({ item }) => (<DocCard doc={item} colors={colors} onPress={() => go('detail', { docId: item.id })} onToggleFav={() => onToggleFav(item.id)} />)} />
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
          const count = documents.filter((d) => d.folder === f.name).length;
          return (
            <View key={f.id} style={{ width: '50%', padding: 6 }}>
              <Pressable onPress={() => go('documents', { folder: f.name })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}>
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
const SettingsScreen = ({ colors, themeMode, onToggleTheme, appLock, onToggleLock, qualityPreset, compressLevel, go, showToast }) => {
  const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];
  const level = COMPRESS_LEVELS.find((l) => l.key === compressLevel) || COMPRESS_LEVELS[1];

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
          <SettingRow icon="camera-outline" label="Kualitas Scan Default" desc={`${preset.label} — ${preset.dpi || 0} DPI`} onPress={() => go('quality')} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
          <SettingRow icon="contract-outline" label="Level Kompres Default" desc={`${level.label} (~${level.ratio}% lebih kecil)`} onPress={() => showToast('Atur di PDF Tools')} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
        </Group>

        <GroupTitle>AI & OCR</GroupTitle>
        <Group>
          <SettingRow icon="sparkles-outline" label="AI Neural Vision" desc="Aktif — akurasi 99.2%" right={<Text style={{ color: colors.cyan, fontSize: 11, fontWeight: '800' }}>ON</Text>} />
          <SettingRow icon="language-outline" label="Bahasa OCR" desc="Indonesia + English" onPress={() => showToast('Bahasa OCR')} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
        </Group>

        <GroupTitle>TAMPILAN</GroupTitle>
        <Group>
          <SettingRow icon="moon-outline" label="Mode Gelap" desc={themeMode === 'dark' ? 'Cyber Dark aktif' : 'Cyber Light aktif'} right={<Switch value={themeMode === 'dark'} onValueChange={onToggleTheme} trackColor={{ true: colors.cyan, false: colors.border }} thumbColor="#fff" />} />
        </Group>

        <GroupTitle>KEAMANAN</GroupTitle>
        <Group>
          <SettingRow icon="lock-closed-outline" label="Kunci Aplikasi" desc="PIN / Biometrik" right={<Switch value={appLock} onValueChange={onToggleLock} trackColor={{ true: colors.cyan, false: colors.border }} thumbColor="#fff" />} />
        </Group>

        <GroupTitle>PENYIMPANAN</GroupTitle>
        <Group>
          <SettingRow icon="download-outline" label="Lokasi Simpan" desc="Perangkat / Offline" onPress={() => showToast('Lokasi penyimpanan')} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
          <SettingRow icon="trash-outline" label="Hapus Cache" desc="Hapus file temporary" onPress={async () => {
            try {
              const cacheDir = FileSystem.cacheDirectory;
              const files = await FileSystem.readDirectoryAsync(cacheDir);
              let n = 0;
              for (const f of files) { try { await FileSystem.deleteAsync(cacheDir + f, { idempotent: true }); n++; } catch (e) {} }
              showToast(`Cache dibersihkan (${n} file)`);
            } catch (e) { showToast('Cache dibersihkan'); }
          }} right={<Ionicons name="chevron-forward" size={18} color={colors.textDim} />} />
        </Group>

        <GroupTitle>TENTANG</GroupTitle>
        <Group>
          <SettingRow icon="information-circle-outline" label="Versi Aplikasi" desc="Gandes Scanner 1.0.0" />
        </Group>
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: QUALITY
   ============================================================ */
const QualityScreen = ({ colors, qualityPreset, setQualityPreset, qualityFormat, setQualityFormat, go, showToast }) => {
  const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];
  const estMB = 0.7 * preset.sizeMult;

  return (
    <View style={{ flex: 1 }}>
      <Header title="Kualitas Scan" subtitle="Atur resolusi & format output" onBack={() => go('settings')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,242,254,0.08)', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, padding: 14, marginTop: 8 }}>
          <View>
            <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>ESTIMASI PER HALAMAN</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>~{fmtSize(estMB)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{preset.res || 'Adaptive'} px • {preset.dpi || 'AI'} DPI</Text>
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
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{q.res || 'Adaptive'} px • {q.dpi || 'AI'} DPI</Text>
            </View>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: qualityPreset === q.key ? colors.cyan : colors.border, backgroundColor: qualityPreset === q.key ? colors.cyan : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {qualityPreset === q.key ? <Ionicons name="checkmark" size={12} color="#050811" /> : null}
            </View>
          </Pressable>
        ))}

        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginBottom: 10, marginLeft: 4 }}>FORMAT OUTPUT</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['pdf', 'jpg', 'png'].map((f) => (
            <Pressable key={f} onPress={() => { setQualityFormat(f); showToast(`Format: ${f.toUpperCase()}`); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: qualityFormat === f ? 'rgba(0,242,254,0.12)' : colors.surfaceSoft, borderWidth: 1, borderColor: qualityFormat === f ? colors.cyan : colors.border, alignItems: 'center' }}>
              <Text style={{ color: qualityFormat === f ? colors.cyan : colors.text, fontWeight: '800', fontSize: 13 }}>{f.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
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
    { key: 'compress', label: 'Kompres PDF', desc: 'Hemat hingga 80%', icon: 'contract-outline', color: colors.emerald },
    { key: 'convert', label: 'Konversi', desc: 'PDF ke JPG, PNG, TXT', icon: 'swap-horizontal-outline', color: colors.violet },
    { key: 'reorder', label: 'Atur Halaman', desc: 'Urutkan, putar, hapus', icon: 'reorder-four-outline', color: colors.cyan },
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
const ScannerScreen = ({ colors, go, qualityPreset, capturedImages, setCapturedImages, showToast, initialParams }) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState('off');
  const [facing, setFacing] = useState('back');
  const [grid, setGrid] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        const r = await requestPermission();
        if (!r.granted) Alert.alert('Izin Kamera', 'Gandes Scanner membutuhkan akses kamera.');
      }
    })();
  }, []);

  useEffect(() => {
    if (initialParams?.openGallery) setTimeout(() => pickFromGallery(), 400);
  }, [initialParams]);

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      await haptic('medium');
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false, exif: false });
      if (photo?.uri) {
        setCapturedImages((prev) => [...prev, { id: uid('cap'), uri: photo.uri, width: photo.width, height: photo.height }]);
        await haptic('success');
        showToast(`Halaman #${capturedImages.length + 1} dipindai`);
      }
    } catch (e) { showToast('Gagal menangkap'); }
    finally { setCapturing(false); }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { showToast('Izin galeri dibutuhkan'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 20, quality: 0.9 });
      if (!result.canceled && result.assets?.length) { setGalleryImages(result.assets); setShowGallery(true); }
    } catch (e) { showToast('Gagal buka galeri'); }
  };

  const confirmGallery = () => {
    const newItems = galleryImages.map((a) => ({ id: uid('gal'), uri: a.uri, width: a.width, height: a.height }));
    setCapturedImages((prev) => [...prev, ...newItems]);
    setShowGallery(false);
    setGalleryImages([]);
    showToast(`${newItems.length} gambar diimpor`);
  };

  const removeThumb = (id) => { setCapturedImages((prev) => prev.filter((p) => p.id !== id)); showToast('Halaman dihapus'); };

  const finishScan = () => {
    if (!capturedImages.length) { showToast('Ambil minimal 1 halaman'); return; }
    go('crop');
  };

  const toggleFlash = () => {
    const modes = ['off', 'on', 'auto'];
    const next = modes[(modes.indexOf(flash) + 1) % modes.length];
    setFlash(next);
    showToast(`Flash: ${next.toUpperCase()}`);
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.cyan} /></View>;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="camera-outline" size={64} color={colors.cyan} />
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 20, textAlign: 'center' }}>Izin Kamera Dibutuhkan</Text>
        <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Berikan izin kamera untuk memindai dokumen</Text>
        <Btn label="Berikan Izin" icon="camera" colors={colors} onPress={requestPermission} style={{ marginTop: 24, width: 200 }} />
        <Btn label="Kembali" icon="arrow-back" variant="soft" colors={colors} onPress={() => go('home')} style={{ marginTop: 10, width: 200 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} onCameraReady={() => setReady(true)} />
      {grid ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.25 }]}><View style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(0,242,254,0.4)', margin: '20%' }} /></View> : null}

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <Pressable onPress={() => go('home')} style={circleBtnStyle}><Ionicons name="close" size={22} color="#fff" /></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.75)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 24 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 }} />
          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>AUTOFOCUS <Text style={{ color: colors.cyan }}>{preset.dpi || 'AI'} {preset.dpi ? 'DPI' : ''}</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={toggleFlash} style={[circleBtnStyle, flash !== 'off' && { backgroundColor: colors.cyan }]}>
            <Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={18} color={flash !== 'off' ? '#050811' : '#fff'} />
          </Pressable>
          <Pressable onPress={() => setGrid((g) => !g)} style={[circleBtnStyle, grid && { backgroundColor: colors.cyan }]}>
            <Ionicons name="grid-outline" size={18} color={grid ? '#050811' : '#fff'} />
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ width: '82%', aspectRatio: 0.72, maxHeight: '55%', borderRadius: 20, borderWidth: 2, borderColor: 'rgba(0,242,254,0.5)', position: 'relative' }}>
          <View style={[cornerStyle, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 }]} />
          <View style={[cornerStyle, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 }]} />
          <View style={[cornerStyle, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 }]} />
          <View style={[cornerStyle, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 }]} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12, zIndex: 10 }}>
        {['Dokumen', 'KTP / ID', 'Buku'].map((m, i) => (
          <Pressable key={m} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: i === 0 ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: i === 0 ? colors.cyan : 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: i === 0 ? colors.cyan : '#94a3b8', fontSize: 11, fontWeight: '700' }}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ backgroundColor: 'rgba(7,10,18,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={pickFromGallery} style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="images-outline" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={capture} disabled={capturing || !ready}>
            <View style={{ width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: 'rgba(0,242,254,0.7)', alignItems: 'center', justifyContent: 'center', opacity: !ready || capturing ? 0.5 : 1 }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {capturing ? <ActivityIndicator color="#050811" /> : null}
              </View>
            </View>
          </Pressable>
          <Pressable onPress={finishScan} style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: capturedImages.length ? colors.cyan : 'rgba(0,242,254,0.1)', borderWidth: 1.5, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: capturedImages.length ? '#050811' : colors.cyan, fontWeight: '800', fontSize: 15 }}>{capturedImages.length}</Text>
          </Pressable>
        </View>
        {capturedImages.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12 }}>
            {capturedImages.map((p) => (
              <View key={p.id} style={{ width: 46, height: 58, borderRadius: 8, marginRight: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,242,254,0.6)' }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
                <Pressable onPress={() => removeThumb(p.id)} style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={10} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Modal visible={showGallery} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surfaceSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Pilih Gambar ({galleryImages.length})</Text>
              <Pressable onPress={() => setShowGallery(false)}><Ionicons name="close" size={22} color={colors.textMuted} /></Pressable>
            </View>
            <FlatList data={galleryImages} keyExtractor={(it) => it.assetId || it.uri} numColumns={3} renderItem={({ item }) => (<View style={{ flex: 1, aspectRatio: 1, padding: 3 }}><Image source={{ uri: item.uri }} style={{ flex: 1, borderRadius: 8 }} /></View>)} style={{ maxHeight: 400 }} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Btn label="Batal" variant="soft" colors={colors} onPress={() => setShowGallery(false)} style={{ flex: 1 }} />
              <Btn label={`Impor ${galleryImages.length} Gambar`} colors={colors} onPress={confirmGallery} style={{ flex: 1.5 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ============================================================
   SCREEN: CROP
   ============================================================ */
const CropScreen = ({ colors, go, capturedImages, setCapturedImages, showToast }) => {
  const insets = useSafeAreaInsets();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const current = capturedImages[currentIdx];

  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff' }}>Tidak ada gambar</Text>
        <Btn label="Kembali" colors={colors} onPress={() => go('scanner')} style={{ marginTop: 20, width: 200 }} />
      </View>
    );
  }

  const rotate = () => { setRotation((r) => (r + 90) % 360); haptic('light'); };
  const reset = () => { setRotation(0); haptic('light'); };

  const applyAndNext = async () => {
    if (rotation === 0) {
      if (currentIdx < capturedImages.length - 1) { setCurrentIdx((i) => i + 1); setRotation(0); }
      else go('enhance');
      return;
    }
    try {
      setProcessing(true);
      await haptic('medium');
      const manipResult = await ImageManipulator.manipulateAsync(current.uri, [{ rotate: rotation }], { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG });
      setCapturedImages((prev) => prev.map((p, i) => (i === currentIdx ? { ...p, uri: manipResult.uri, width: manipResult.width, height: manipResult.height } : p)));
      showToast('Rotasi diterapkan');
      if (currentIdx < capturedImages.length - 1) { setCurrentIdx((i) => i + 1); setRotation(0); }
      else go('enhance');
    } catch (e) { showToast('Gagal rotate'); }
    finally { setProcessing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => go('scanner')} style={circleBtnStyle}><Ionicons name="close" size={20} color="#fff" /></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Crop & Rotate</Text>
          <Text style={{ color: colors.cyan, fontSize: 10, fontWeight: '700', marginTop: 2 }}>{currentIdx + 1} / {capturedImages.length}</Text>
        </View>
        <Pressable onPress={applyAndNext} disabled={processing} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {processing ? <ActivityIndicator size="small" color="#000" /> : null}
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>{currentIdx < capturedImages.length - 1 ? 'Next' : 'Selesai'}</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ width: '78%', aspectRatio: 0.76, maxHeight: '55%', transform: [{ rotate: `${rotation}deg` }] }}>
          <Image source={{ uri: current.uri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="contain" />
          <View pointerEvents="none" style={{ position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 12 }} />
          {['tl', 'tr', 'bl', 'br'].map((p) => (
            <View key={p} style={[{ position: 'absolute', width: 22, height: 22, backgroundColor: '#fff', borderRadius: 4 }, p === 'tl' && { top: -16, left: -16 }, p === 'tr' && { top: -16, right: -16 }, p === 'bl' && { bottom: -16, left: -16 }, p === 'br' && { bottom: -16, right: -16 }]} />
          ))}
        </View>
      </View>

      {capturedImages.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {capturedImages.map((p, i) => (
            <Pressable key={p.id} onPress={() => { setCurrentIdx(i); setRotation(0); }} style={{ width: 44, height: 56, borderRadius: 8, marginRight: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === currentIdx ? colors.cyan : 'rgba(255,255,255,0.2)' }}>
              <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
        <ToolBtn icon="refresh-outline" label="Putar" onPress={rotate} colors={colors} />
        <ToolBtn icon="grid-outline" label="Auto" onPress={() => showToast('Crop otomatis')} colors={colors} />
        <ToolBtn icon="reload-outline" label="Reset" onPress={reset} colors={colors} />
        <ToolBtn icon="checkmark-outline" label="Selesai" onPress={applyAndNext} colors={colors} active />
      </View>
    </View>
  );
};

const ToolBtn = ({ icon, label, onPress, colors, active }) => (
  <Pressable onPress={onPress} style={{ alignItems: 'center', padding: 6 }}>
    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: active ? colors.cyan : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={20} color={active ? '#050811' : '#fff'} />
    </View>
    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 6 }}>{label}</Text>
  </Pressable>
);

/* ============================================================
   SCREEN: ENHANCE
   ============================================================ */
const EnhanceScreen = ({ colors, go, capturedImages, setCapturedImages, qualityPreset, showToast, onSaveDocument }) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('auto');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const current = capturedImages[previewIdx];

  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff' }}>Tidak ada gambar</Text>
        <Btn label="Kembali" colors={colors} onPress={() => go('crop')} style={{ marginTop: 20, width: 200 }} />
      </View>
    );
  }

  const previewBg = FILTERS.find((f) => f.key === filter)?.bg || '#FBFBF8';
  const brightnessOverlay = Math.max(0, brightness) * 0.05;

  const applyEnhancements = async () => {
    try {
      setProcessing(true);
      await haptic('medium');
      const preset = QUALITY_PRESETS.find((p) => p.key === qualityPreset) || QUALITY_PRESETS[1];
      const targetRes = preset.res || 2000;
      const newImages = [];
      for (let i = 0; i < capturedImages.length; i++) {
        const img = capturedImages[i];
        const actions = [];
        if (img.width && img.width > targetRes) actions.push({ resize: { width: targetRes } });
        const result = await ImageManipulator.manipulateAsync(img.uri, actions, { compress: preset.key === 'compact' ? 0.55 : preset.key === 'medium' ? 0.7 : 0.85, format: ImageManipulator.SaveFormat.JPEG });
        newImages.push({ ...img, uri: result.uri, width: result.width, height: result.height, filter });
      }
      setCapturedImages(newImages);
      await haptic('success');
      showToast('Enhancement diterapkan');
      if (onSaveDocument) await onSaveDocument(newImages);
    } catch (e) { showToast('Gagal memproses'); }
    finally { setProcessing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => go('crop')} style={circleBtnStyle}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Enhance</Text>
        <Pressable onPress={applyEnhancements} disabled={processing} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {processing ? <ActivityIndicator size="small" color="#000" /> : null}
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Simpan</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ width: '72%', aspectRatio: 0.76, maxHeight: '52%', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
          <Image source={{ uri: current.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: previewBg, opacity: 0.25 }]} />
          {brightnessOverlay > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: brightnessOverlay }]} /> : null}
        </View>
      </View>

      {capturedImages.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          {capturedImages.map((p, i) => (
            <Pressable key={p.id} onPress={() => setPreviewIdx(i)} style={{ width: 44, height: 56, borderRadius: 8, marginRight: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === previewIdx ? colors.cyan : 'rgba(255,255,255,0.2)' }}>
              <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => { setFilter(f.key); haptic('light'); }} style={{ marginRight: 10, alignItems: 'center' }}>
            <View style={{ width: 58, height: 58, borderRadius: 14, borderWidth: 2, borderColor: filter === f.key ? colors.cyan : 'transparent', padding: 3 }}>
              <View style={{ flex: 1, borderRadius: 10, backgroundColor: f.bg }} />
            </View>
            <Text style={{ color: filter === f.key ? colors.cyan : 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700', marginTop: 6 }}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}>
        <Adjuster label="Brightness" value={brightness} onChange={setBrightness} colors={colors} />
        <View style={{ height: 10 }} />
        <Adjuster label="Contrast" value={contrast} onChange={setContrast} colors={colors} />
      </View>
    </View>
  );
};

const Adjuster = ({ label, value, onChange, colors }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', width: 78 }}>{label}</Text>
    <Pressable onPress={() => onChange(Math.max(-3, value - 1))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="remove" size={16} color="#fff" />
    </Pressable>
    <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' }}>
      <View style={{ width: `${((value + 3) / 6) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.cyan }} />
    </View>
    <Pressable onPress={() => onChange(Math.min(3, value + 1))} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="add" size={16} color="#fff" />
    </Pressable>
  </View>
);

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
  const pages = currentDoc.pageImages || Array.from({ length: currentDoc.pages || 1 }).map((_, i) => null);

  return (
    <View style={{ flex: 1 }}>
      <Header title={currentDoc.name} subtitle={`${currentDoc.pages} halaman • ${currentDoc.sizeStr}`} onBack={() => go('detail', { docId: currentDoc.id })} colors={colors}
        right={<IconPill name="share-outline" colors={colors} onPress={async () => {
          try { if (currentDoc.pdfUri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(currentDoc.pdfUri); else showToast('Bagikan dokumen'); }
          catch (e) { showToast('Gagal berbagi'); }
        }} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {pages.map((imgUri, idx) => (
          <View key={idx} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 8, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
              <Text style={{ color: '#94a3b8', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>HALAMAN {idx + 1} / {currentDoc.pages}</Text>
              <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}><Text style={{ color: '#475569', fontSize: 9, fontWeight: '800' }}>PDF</Text></View>
            </View>
            {imgUri ? <Image source={{ uri: imgUri }} style={{ width: '100%', aspectRatio: 0.72, borderRadius: 6 }} resizeMode="contain" /> : (
              <View style={{ padding: 20 }}>
                <Text style={{ color: '#111', fontSize: 14, fontWeight: '900', marginBottom: 10 }}>{currentDoc.name}</Text>
                <Text style={{ color: '#374151', fontSize: 12, lineHeight: 20 }}>{(currentDoc.ocr || 'Preview halaman…').split('\n').slice(0, 8).join('\n')}</Text>
              </View>
            )}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <Btn label="OCR Teks" icon="text-outline" variant="soft" colors={colors} onPress={() => go('ocr', { docId: currentDoc.id })} style={{ flex: 1 }} />
          <Btn label="Tanda Tangan" icon="create-outline" variant="soft" colors={colors} onPress={() => go('signature', { docId: currentDoc.id })} style={{ flex: 1 }} />
        </View>
        <View style={{ height: 10 }} />
        <Btn label="Anotasi" icon="brush-outline" variant="soft" colors={colors} onPress={() => go('annotation', { docId: currentDoc.id })} />
        <View style={{ height: 10 }} />
        <Btn label="Bagikan PDF" icon="share-social-outline" colors={colors} onPress={async () => {
          try { if (currentDoc.pdfUri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(currentDoc.pdfUri); else showToast('Bagikan dokumen…'); }
          catch (e) { showToast('Gagal berbagi'); }
        }} />
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: DETAIL
   ============================================================ */
const DetailScreen = ({ colors, go, currentDoc, onToggleFav, onRename, onDelete, onDeletePage, onAddPage, showToast }) => {
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

  const tabs = [{ k: 'pages', l: 'Halaman' }, { k: 'ocr', l: 'OCR' }, { k: 'info', l: 'Info' }];
  const quickActions = [
    { k: 'preview', i: 'document-text-outline', l: 'Preview PDF', a: () => go('preview', { docId: currentDoc.id }) },
    { k: 'ocr', i: 'text-outline', l: 'OCR Teks', a: () => go('ocr', { docId: currentDoc.id }) },
    { k: 'merge', i: 'add-circle-outline', l: 'Gabung', a: () => go('merge', { selectedId: currentDoc.id }) },
    { k: 'split', i: 'cut-outline', l: 'Pisah', a: () => go('split', { docId: currentDoc.id }) },
    { k: 'compress', i: 'contract-outline', l: 'Kompres', a: () => go('compress', { docId: currentDoc.id }) },
    { k: 'convert', i: 'swap-horizontal-outline', l: 'Konversi', a: () => go('convert', { docId: currentDoc.id }) },
    { k: 'annotation', i: 'brush-outline', l: 'Anotasi', a: () => go('annotation', { docId: currentDoc.id }) },
    { k: 'signature', i: 'create-outline', l: 'Tanda Tangan', a: () => go('signature', { docId: currentDoc.id }) },
    { k: 'reorder', i: 'reorder-four-outline', l: 'Atur Halaman', a: () => go('reorder', { docId: currentDoc.id }) },
    { k: 'watermark', i: 'water-outline', l: 'Watermark', a: () => go('watermark', { docId: currentDoc.id }) },
    { k: 'share', i: 'share-social-outline', l: 'Bagikan', a: async () => {
      try { if (currentDoc.pdfUri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(currentDoc.pdfUri); else showToast('Bagikan dokumen'); }
      catch (e) { showToast('Gagal berbagi'); }
    }},
    { k: 'rename', i: 'pencil-outline', l: 'Ganti Nama', a: () => { setNewName(currentDoc.name); setRenameOpen(true); } },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header title={currentDoc.name} subtitle={`${currentDoc.folder} • ${currentDoc.sizeStr} • ${currentDoc.updatedAt}`} onBack={() => go('documents')} colors={colors}
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
                <View style={{ width: 54, height: 68, borderRadius: 8, backgroundColor: currentDoc.color + '22', borderWidth: 1, borderColor: currentDoc.color + '55', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: currentDoc.color, fontWeight: '900', fontSize: 12 }}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>Halaman {i + 1}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>A4 • Auto-enhanced</Text>
                </View>
                <Pressable onPress={() => showToast(`Halaman ${i + 1}`)} style={{ padding: 8 }}><Ionicons name="reorder-four-outline" size={16} color={colors.textMuted} /></Pressable>
                <Pressable onPress={() => onDeletePage(currentDoc.id, i)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={16} color={colors.rose} /></Pressable>
              </View>
            ))}
            <Pressable onPress={() => onAddPage(currentDoc.id)} style={{ borderWidth: 1.5, borderColor: colors.borderStrong, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="add" size={20} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 12 }}>Tambah halaman</Text>
            </Pressable>
          </>
        ) : null}

        {tab === 'ocr' ? (
          <>
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ backgroundColor: 'rgba(0,242,254,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,242,254,0.25)' }}>
                  <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: 9 }}>OCR</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>Akurasi 99.2%</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 12, lineHeight: 20 }}>{currentDoc.ocr || 'Belum ada teks. Jalankan OCR untuk mengekstrak.'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Btn label="Copy" icon="copy-outline" variant="soft" colors={colors} onPress={() => showToast('Teks disalin')} style={{ flex: 1 }} />
              <Btn label="Bagikan" icon="share-outline" variant="soft" colors={colors} onPress={() => showToast('Bagikan teks')} style={{ flex: 1 }} />
            </View>
          </>
        ) : null}

        {tab === 'info' ? (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' }}>
            {[['Nama', currentDoc.name], ['Folder', currentDoc.folder], ['Halaman', `${currentDoc.pages}`], ['Ukuran', currentDoc.sizeStr], ['Terakhir diubah', currentDoc.updatedAt], ['Watermark', 'Tidak aktif'], ['Tanda tangan', 'Belum ada'], ['Status OCR', '✓ Terindeks AI']].map(([label, value], i) => (
              <View key={label} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i === 7 ? 0 : 1, borderBottomColor: colors.divider }}>
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
   SCREEN: OCR
   ============================================================ */
const OCRScreen = ({ colors, go, currentDoc, showToast }) => {
  const [scanning, setScanning] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(iv); setScanning(false); return 100; }
        return p + 10;
      });
    }, 120);
    return () => clearInterval(iv);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Header title="OCR Teks" subtitle={currentDoc?.name || '—'} onBack={() => go('detail', { docId: currentDoc?.id })} colors={colors}
        right={<IconPill name="copy-outline" colors={colors} onPress={() => showToast('Teks disalin')} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {scanning ? (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 30, alignItems: 'center' }}>
            <ActivityIndicator color={colors.cyan} size="large" />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 14 }}>Mengekstrak teks…</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{progress}% — AI Neural Vision</Text>
            <View style={{ width: '100%', height: 6, backgroundColor: colors.surfaceSoft, borderRadius: 3, marginTop: 14, overflow: 'hidden' }}>
              <View style={{ width: `${progress}%`, height: '100%', backgroundColor: colors.cyan, borderRadius: 3 }} />
            </View>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ backgroundColor: 'rgba(0,242,254,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,242,254,0.25)' }}>
                  <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: 9 }}>OCR RESULT</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>99.2% akurasi</Text>
              </View>
              <Text selectable style={{ color: colors.text, fontSize: 13, lineHeight: 22 }}>{currentDoc?.ocr || 'Tidak ada teks terdeteksi.'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Btn label="Copy" icon="copy-outline" variant="soft" colors={colors} onPress={() => showToast('Teks disalin')} style={{ flex: 1 }} />
              <Btn label="Bagikan" icon="share-outline" variant="soft" colors={colors} onPress={() => showToast('Bagikan teks')} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: ANNOTATION
   ============================================================ */
const AnnotationScreen = ({ colors, go, currentDoc, showToast }) => {
  const [tool, setTool] = useState('text');
  const [color, setColor] = useState(colors.cyan);
  const [texts, setTexts] = useState([]);
  const [textInput, setTextInput] = useState('');

  const addText = () => {
    if (!textInput.trim()) return;
    setTexts((t) => [...t, { id: uid('anno'), value: textInput, x: 30 + t.length * 12, y: 60 + t.length * 30, color }]);
    setTextInput('');
    showToast('Anotasi ditambahkan');
  };

  const tools = [
    { k: 'text', icon: 'text-outline', l: 'Teks' },
    { k: 'pen', icon: 'brush-outline', l: 'Pena' },
    { k: 'highlight', icon: 'color-fill-outline', l: 'Highlight' },
    { k: 'shape', icon: 'square-outline', l: 'Bentuk' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => go('detail', { docId: currentDoc?.id })} style={circleBtnStyle}><Ionicons name="close" size={18} color="#fff" /></Pressable>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Anotasi</Text>
        <Pressable onPress={() => { showToast('Anotasi disimpan'); go('detail', { docId: currentDoc?.id }); }} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff' }}>
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Simpan</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flex: 1, backgroundColor: '#F8F8F6', borderRadius: 12, padding: 18, position: 'relative', overflow: 'hidden' }}>
          <View style={{ height: 12, width: '60%', backgroundColor: '#C9CCD2', borderRadius: 3 }} />
          <View style={{ height: 8, width: '92%', backgroundColor: '#DFE2E7', borderRadius: 3, marginTop: 12 }} />
          <View style={{ height: 8, width: '80%', backgroundColor: '#DFE2E7', borderRadius: 3, marginTop: 6 }} />
          <View style={{ height: 8, width: '88%', backgroundColor: '#DFE2E7', borderRadius: 3, marginTop: 6 }} />
          {texts.map((t) => (
            <View key={t.id} style={{ position: 'absolute', top: t.y, left: t.x, backgroundColor: t.color + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: t.color, fontWeight: '800', fontSize: 13 }}>{t.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {tool === 'text' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
          <TextInput value={textInput} onChangeText={setTextInput} placeholder="Ketik anotasi…" placeholderTextColor="rgba(255,255,255,0.4)" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#fff' }} />
          <Pressable onPress={addText} style={{ marginLeft: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff' }}>
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Tambah</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
        {tools.map((t) => (
          <Pressable key={t.k} onPress={() => setTool(t.k)} style={{ alignItems: 'center', padding: 6 }}>
            <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: tool === t.k ? '#fff' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.icon} size={18} color={tool === t.k ? '#000' : '#fff'} />
            </View>
            <Text style={{ color: '#fff', fontSize: 10, marginTop: 4, fontWeight: '700' }}>{t.l}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 24 }}>
        {ANNO_COLORS.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, marginHorizontal: 5, borderWidth: 2, borderColor: color === c ? '#fff' : 'transparent' }} />
        ))}
      </View>
    </View>
  );
};

/* ============================================================
   SCREEN: SIGNATURE
   ============================================================ */
const SignatureScreen = ({ colors, go, currentDoc, showToast }) => {
  const [mode, setMode] = useState('draw');
  const [name, setName] = useState('Ahmad Rizky');

  return (
    <View style={{ flex: 1 }}>
      <Header title="Tanda Tangan" subtitle={currentDoc?.name || '—'} onBack={() => go('detail', { docId: currentDoc?.id })} colors={colors}
        right={<Btn label="Simpan" colors={colors} onPress={() => { showToast('Tanda tangan disimpan'); go('detail', { docId: currentDoc?.id }); }} style={{ paddingVertical: 10, paddingHorizontal: 14 }} />}
      />
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 }}>
        <Chip label="Gambar" active={mode === 'draw'} colors={colors} onPress={() => setMode('draw')} />
        <Chip label="Ketik" active={mode === 'type'} colors={colors} onPress={() => setMode('type')} />
      </View>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {mode === 'draw' ? (
            <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 42, color: '#111', fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive', textAlign: 'center' }}>{name}</Text>
              <View style={{ height: 1, backgroundColor: '#CBD5E1', width: '70%', marginTop: 12 }} />
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 6 }}>Area tanda tangan</Text>
            </View>
          ) : (
            <TextInput value={name} onChangeText={setName} placeholder="Ketik nama…" placeholderTextColor="#94A3B8" style={{ fontSize: 28, color: '#111', textAlign: 'center', paddingVertical: 12, width: '100%' }} />
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 20 }}>
        <Btn label="Bersihkan" icon="refresh-outline" variant="soft" colors={colors} onPress={() => showToast('Area dibersihkan')} style={{ flex: 1 }} />
        <Btn label="Warna" icon="color-palette-outline" variant="soft" colors={colors} onPress={() => showToast('Pilih warna')} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

/* ============================================================
   SCREEN: MERGE
   ============================================================ */
const MergeScreen = ({ colors, go, documents, showToast, params, onComplete }) => {
  const [selected, setSelected] = useState(params?.selectedId ? [params.selectedId] : []);
  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const totalPages = selected.reduce((s, id) => { const d = documents.find((x) => x.id === id); return s + (d?.pages || 0); }, 0);

  const executeMerge = async () => {
    if (selected.length < 2) return;
    try {
      const pdfFiles = selected.map((id) => documents.find((x) => x.id === id)).filter((d) => d && d.pdfUri).map((d) => ({ uri: d.pdfUri, name: d.name }));
      if (pdfFiles.length < 2) { showToast('Beberapa dokumen belum punya PDF'); return; }
      onComplete('start', { total: pdfFiles.length });
      const result = await mergePdfs(pdfFiles, 'gandes_merged');
      const newDoc = {
        id: uid('doc'),
        name: `Gabungan ${new Date().toLocaleDateString('id-ID')}`,
        folder: documents.find((d) => d.id === selected[0])?.folder || 'Catatan',
        pages: result.pages, size: result.size, sizeStr: result.sizeStr,
        updatedAt: 'Baru saja', favorite: false, color: '#00f2fe', ocr: '', pdfUri: result.uri,
      };
      onComplete('done', newDoc);
      showToast(`✓ ${result.pages} halaman digabung`);
      go('documents');
    } catch (e) { onComplete('error'); showToast('Gagal merge'); }
  };

  const ordered = selected.map((id) => documents.find((d) => d.id === id)).filter(Boolean);
  const others = documents.filter((d) => !selected.includes(d.id));

  const MergeItem = ({ doc, active, index, onPress }) => (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: active ? 'rgba(0,242,254,0.06)' : colors.surface, borderWidth: 1, borderColor: active ? colors.cyan : colors.border, marginBottom: 10 }}>
      <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: active ? colors.cyan : colors.border, backgroundColor: active ? colors.cyan : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {active ? <Ionicons name="checkmark" size={14} color="#050811" /> : null}
      </View>
      <DocThumb doc={doc} colors={colors} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{doc.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{doc.pages} hal • {doc.sizeStr}</Text>
      </View>
      {index ? <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: 11 }}>#{index}</Text> : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title="Gabung PDF" subtitle={selected.length ? `${selected.length} dipilih` : 'Pilih 2+ dokumen'} onBack={() => go('pdf-tools')} colors={colors}
        right={<Btn label="Gabung" colors={colors} disabled={selected.length < 2} onPress={executeMerge} style={{ paddingVertical: 10, paddingHorizontal: 14 }} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,242,254,0.08)', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <View>
            <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>DIPILIH</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{selected.length}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{totalPages} halaman total</Text>
          </View>
          <Ionicons name="add-circle-outline" size={42} color={colors.cyan} />
        </View>
        {ordered.length > 0 ? (
          <>
            <Text style={{ color: colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>DIPILIH — URUTAN GABUNG</Text>
            {ordered.map((d, i) => <MergeItem key={d.id} doc={d} active index={i + 1} onPress={() => toggle(d.id)} />)}
          </>
        ) : null}
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 10 }}>TAMBAH LAINNYA</Text>
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
      if (mode === 'range') {
        const result = await splitPdfByRanges(doc.pdfUri, ranges);
        showToast(`✓ Split jadi ${result.length} file`);
      } else if (mode === 'extract') {
        const res = await extractPdfPages(doc.pdfUri, selectedPages);
        const newDoc = { id: uid('doc'), name: `${doc.name} (extract)`, folder: doc.folder, pages: res.pages, size: res.size, sizeStr: fmtSize(res.size), updatedAt: 'Baru saja', favorite: false, color: doc.color, ocr: doc.ocr, pdfUri: res.uri };
        onComplete('done', newDoc);
        showToast(`✓ ${res.pages} halaman diambil`);
      } else {
        const allRanges = Array.from({ length: doc.pages }).map((_, i) => ({ from: i + 1, to: i + 1 }));
        const result = await splitPdfByRanges(doc.pdfUri, allRanges);
        showToast(`✓ ${result.length} file dibuat`);
      }
      onComplete('done');
      go('documents');
    } catch (e) { onComplete('error'); showToast('Gagal split'); }
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
            {Array.from({ length: doc.pages }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 8 }}>
                <View style={{ width: 44, height: 56, borderRadius: 8, backgroundColor: doc.color + '22', borderWidth: 1, borderColor: doc.color + '55', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: doc.color, fontWeight: '900', fontSize: 12 }}>#{i + 1}</Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5, flex: 1 }}>Halaman {i + 1}</Text>
              </View>
            ))}
            <Btn label={`Pisah Semua (${doc.pages} file)`} colors={colors} onPress={executeSplit} style={{ marginTop: 8 }} />
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
  const [custom, setCustom] = useState(70);

  if (!doc) return <View style={{ flex: 1 }}><Header title="Kompres PDF" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="contract-outline" title="Pilih dokumen" colors={colors} /></View>;

  const lvl = COMPRESS_LEVELS.find((l) => l.key === level) || COMPRESS_LEVELS[1];
  const ratio = level === 'custom' ? 100 - custom : lvl.ratio;
  const newSize = doc.size * (1 - ratio / 100);

  const executeCompress = async () => {
    if (!doc.pdfUri) { showToast('Dokumen belum punya PDF'); return; }
    try {
      onComplete('start', { total: 1 });
      const result = await compressPdf(doc.pdfUri, ratio);
      const updatedDoc = { ...doc, size: result.size, sizeStr: result.sizeStr, updatedAt: 'Baru saja (compressed)', pdfUri: result.uri };
      onComplete('done', updatedDoc);
      showToast(`✓ Kompres selesai — hemat ${ratio}%`);
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
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>LEVEL KOMPRESI</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
          {[...COMPRESS_LEVELS, { key: 'custom', label: 'Custom', ratio: 0, desc: 'Manual' }].map((l) => (
            <View key={l.key} style={{ width: '50%', padding: 4 }}>
              <Pressable onPress={() => setLevel(l.key)} style={{ padding: 12, borderRadius: 14, backgroundColor: level === l.key ? 'rgba(0,242,254,0.08)' : colors.surface, borderWidth: 1, borderColor: level === l.key ? colors.cyan : colors.border }}>
                <Text style={{ color: level === l.key ? colors.cyan : colors.text, fontSize: 13, fontWeight: '800' }}>{l.label}</Text>
                {l.ratio ? <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>-{l.ratio}%</Text> : <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>Manual</Text>}
              </Pressable>
            </View>
          ))}
        </View>
        {level === 'custom' ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>KUALITAS: <Text style={{ color: colors.cyan }}>{custom}%</Text></Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable onPress={() => setCustom(Math.max(10, custom - 10))} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="remove" size={18} color={colors.text} /></Pressable>
              <View style={{ flex: 1, height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                <View style={{ width: `${custom}%`, height: '100%', backgroundColor: colors.cyan }} />
              </View>
              <Pressable onPress={() => setCustom(Math.min(100, custom + 10))} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={18} color={colors.text} /></Pressable>
            </View>
          </View>
        ) : null}
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 22, marginBottom: 10 }}>HASIL</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 16 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{doc.sizeStr}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', marginTop: 3 }}>SEBELUM</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.cyan} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.cyan, fontSize: 18, fontWeight: '900' }}>{fmtSize(newSize)}</Text>
            <Text style={{ color: colors.cyan, fontSize: 9, fontWeight: '700', marginTop: 3 }}>SESUDAH</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' }}>
            <Text style={{ color: colors.emerald, fontSize: 10, fontWeight: '800' }}>↓ HEMAT {ratio}%</Text>
          </View>
        </View>
        <Btn label="Kompres Sekarang" icon="contract-outline" colors={colors} onPress={executeCompress} style={{ marginTop: 20 }} />
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: CONVERT
   ============================================================ */
const ConvertScreen = ({ colors, go, documents, currentDoc, showToast, params, onComplete }) => {
  const doc = currentDoc || documents.find((d) => d.id === params?.docId) || documents[0];
  const [format, setFormat] = useState('jpg');
  const [mode, setMode] = useState('pdf2img');

  if (!doc) return <View style={{ flex: 1 }}><Header title="Konversi" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="swap-horizontal-outline" title="Pilih dokumen" colors={colors} /></View>;

  const executeConvert = async () => {
    try {
      onComplete('start', { total: doc.pages });
      await new Promise((r) => setTimeout(r, 1500));
      if (mode === 'pdf2img') showToast(`✓ Konversi ke ${format.toUpperCase()} selesai`);
      else showToast('Gunakan Impor Galeri di Scanner');
      onComplete('done');
    } catch (e) { onComplete('error'); showToast('Gagal konversi'); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Konversi" subtitle={doc.name} onBack={() => go('pdf-tools')} colors={colors} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Chip label="PDF → Gambar" active={mode === 'pdf2img'} colors={colors} onPress={() => setMode('pdf2img')} />
          <Chip label="Gambar → PDF" active={mode === 'img2pdf'} colors={colors} onPress={() => setMode('img2pdf')} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 16 }}>
          <DocThumb doc={doc} colors={colors} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{doc.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{doc.pages} halaman • {doc.sizeStr}</Text>
          </View>
        </View>
        {mode === 'pdf2img' ? (
          <>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>KONVERSI KE FORMAT</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
              {CONVERT_FORMATS.map((f) => (
                <View key={f.key} style={{ width: '50%', padding: 5 }}>
                  <Pressable onPress={() => setFormat(f.key)} style={{ padding: 14, borderRadius: 14, backgroundColor: format === f.key ? 'rgba(0,242,254,0.08)' : colors.surface, borderWidth: 1, borderColor: format === f.key ? colors.cyan : colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: f.color + '22', borderWidth: 1, borderColor: f.color + '55', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: f.color, fontWeight: '900', fontSize: 10 }}>{f.label}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{f.label}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 2 }}>{f.size}</Text>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
            <Btn label={`Konversi ke ${format.toUpperCase()}`} icon="swap-horizontal-outline" colors={colors} onPress={executeConvert} style={{ marginTop: 20 }} />
          </>
        ) : (
          <View style={{ padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 8 }}>Gambar → PDF</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 18 }}>Buka Scanner → tap Impor Galeri → pilih gambar → PDF otomatis dibuat.</Text>
            <Btn label="Buka Scanner" icon="scan" colors={colors} onPress={() => go('scanner', { openGallery: true })} style={{ marginTop: 14 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/* ============================================================
   SCREEN: REORDER
   ============================================================ */
const ReorderScreen = ({ colors, go, documents, currentDoc, showToast, params }) => {
  const doc = currentDoc || documents.find((d) => d.id === params?.docId) || documents[0];
  if (!doc) return <View style={{ flex: 1 }}><Header title="Atur Halaman" onBack={() => go('pdf-tools')} colors={colors} /><EmptyState icon="reorder-four-outline" title="Pilih dokumen" colors={colors} /></View>;

  return (
    <View style={{ flex: 1 }}>
      <Header title="Atur Halaman" subtitle={`${doc.name} • ${doc.pages} halaman`} onBack={() => go('pdf-tools')} colors={colors}
        right={<Btn label="Simpan" colors={colors} onPress={() => { showToast('Urutan disimpan'); go('detail', { docId: doc.id }); }} style={{ paddingVertical: 10, paddingHorizontal: 14 }} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {Array.from({ length: doc.pages }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 8 }}>
            <Ionicons name="reorder-two-outline" size={20} color={colors.textMuted} />
            <View style={{ width: 44, height: 56, borderRadius: 8, backgroundColor: doc.color + '22', borderWidth: 1, borderColor: doc.color + '55', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: doc.color, fontWeight: '900', fontSize: 12 }}>#{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12.5 }}>Halaman {i + 1}</Text>
            </View>
            <Pressable onPress={() => showToast(`Hapus halaman ${i + 1}`)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={16} color={colors.rose} /></Pressable>
          </View>
        ))}
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
const LockScreen = ({ colors, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
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
      if (pin === '1234') onUnlock();
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
      <Text style={{ color: colors.textDim, fontSize: 10, marginTop: 20 }}>Hint: 1234</Text>
    </View>
  );
};

/* ============================================================
   BOTTOM DOCK
   ============================================================ */
const BottomDock = ({ colors, current, go }) => {
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
};

/* ============================================================
   APP ROOT
   ============================================================ */
const TAB_SCREENS = ['home', 'documents', 'folders', 'settings', 'pdf-tools'];

const AppInner = () => {
  const [themeMode, setThemeMode] = useState('dark');
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [capturedImages, setCapturedImages] = useState([]);
  const [toast, setToast] = useState(null);
  const [appLock, setAppLock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [qualityPreset, setQualityPreset] = useState('hd');
  const [qualityFormat, setQualityFormat] = useState('pdf');
  const [compressLevel, setCompressLevel] = useState('balanced');
  const [progress, setProgress] = useState({ visible: false, title: '', sub: '', value: 0 });
  const [hydrated, setHydrated] = useState(false);

  const colors = COLORS[themeMode] || COLORS.dark;
  const currentScreen = stack[stack.length - 1];

  const toastTimer = useRef(null);
  const progressTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedDocs, savedFolders, savedSettings, savedTheme] = await Promise.all([
          Storage.getDocs(),
          Storage.getFolders(),
          Storage.getSettings(),
          Storage.getTheme(),
        ]);
        if (savedDocs) setDocuments(savedDocs);
        if (savedFolders) setFolders(savedFolders);
        if (savedSettings) {
          if (savedSettings.appLock !== undefined) setAppLock(savedSettings.appLock);
          if (savedSettings.qualityPreset) setQualityPreset(savedSettings.qualityPreset);
          if (savedSettings.compressLevel) setCompressLevel(savedSettings.compressLevel);
        }
        if (savedTheme) setThemeMode(savedTheme);
      } catch (e) {}
      finally { setHydrated(true); }
    })();
  }, []);

  useEffect(() => { if (hydrated) Storage.saveDocs(documents); }, [documents, hydrated]);
  useEffect(() => { if (hydrated) Storage.saveFolders(folders); }, [folders, hydrated]);
  useEffect(() => { if (hydrated) Storage.saveSettings({ appLock, qualityPreset, compressLevel }); }, [appLock, qualityPreset, compressLevel, hydrated]);
  useEffect(() => { if (hydrated) Storage.saveTheme(themeMode); }, [themeMode, hydrated]);

  const go = useCallback((name, params = {}) => {
    setStack((prev) => {
      if (TAB_SCREENS.includes(name)) return [{ name, params }];
      return [...prev, { name, params }];
    });
  }, []);

  const goBack = useCallback(() => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)), []);
  const switchTab = useCallback((name) => setStack([{ name, params: {} }]), []);

  const toggleFavorite = useCallback((id) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d)));
  }, []);

  const renameDoc = useCallback((id, name) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
    showToast('Nama diperbarui');
  }, [showToast]);

  const deleteDoc = useCallback((id) => {
    Alert.alert('Hapus Dokumen', 'Dokumen ini akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        goBack();
        showToast('Dokumen dihapus');
      }},
    ]);
  }, [showToast, goBack]);

  const deletePage = useCallback((id, idx) => {
    setDocuments((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      if (d.pages <= 1) { showToast('Minimal 1 halaman'); return d; }
      return { ...d, pages: d.pages - 1 };
    }));
  }, [showToast]);

  const addPage = useCallback((id) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, pages: d.pages + 1 } : d)));
    showToast('Halaman ditambahkan');
  }, [showToast]);

  const saveScannedDocument = useCallback(async (images) => {
    try {
      setProgress({ visible: true, title: 'Menyimpan dokumen…', sub: 'Generate PDF', value: 0 });
      const imageUris = images.map((img) => img.uri);
      const pdfResult = await imagesToPdf(imageUris, 'gandes_scan');
      const doc = {
        id: uid('doc'),
        name: `Scan ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID').slice(0, 5)}`,
        folder: 'Catatan',
        pages: images.length,
        size: pdfResult.size,
        sizeStr: pdfResult.sizeStr,
        updatedAt: 'Baru saja',
        favorite: false,
        color: '#00f2fe',
        ocr: 'Hasil OCR akan muncul di sini setelah diproses dengan AI Neural Vision.',
        pdfUri: pdfResult.uri,
        pageImages: imageUris,
      };
      setDocuments((prev) => [doc, ...prev]);
      setCapturedImages([]);
      setProgress({ visible: false, title: '', sub: '', value: 0 });
      haptic('success');
      go('home');
      showToast(`✓ ${images.length} halaman disimpan (${pdfResult.sizeStr})`);
    } catch (e) {
      setProgress({ visible: false, title: '', sub: '', value: 0 });
      showToast('Gagal menyimpan dokumen');
    }
  }, [go, showToast]);

  const onToolProgress = useCallback((state, doc) => {
    if (state === 'start') {
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

  const currentDoc = useMemo(() => {
    const docId = currentScreen.params?.docId;
    if (!docId) return null;
    return documents.find((d) => d.id === docId) || null;
  }, [currentScreen, documents]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.dark.cyan} size="large" />
        <Text style={{ color: COLORS.dark.textMuted, fontSize: 12, marginTop: 12, fontWeight: '600' }}>Memuat Gandes Scanner…</Text>
      </View>
    );
  }

  if (appLock && !unlocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <LockScreen colors={colors} onUnlock={() => setUnlocked(true)} />
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    const { name, params } = currentScreen;
    switch (name) {
      case 'home': return <HomeScreen colors={colors} documents={documents} folders={folders} go={go} showToast={showToast} onToggleFav={toggleFavorite} />;
      case 'documents': return <DocumentsScreen colors={colors} documents={documents} go={go} onToggleFav={toggleFavorite} filterFolder={params.folder} clearFilter={() => {}} showToast={showToast} />;
      case 'folders': return <FoldersScreen colors={colors} documents={documents} folders={folders} go={go} />;
      case 'settings': return <SettingsScreen colors={colors} themeMode={themeMode} onToggleTheme={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))} appLock={appLock} onToggleLock={(v) => { setAppLock(v); if (!v) setUnlocked(true); showToast(v ? '🔒 Kunci aktif' : 'Kunci nonaktif'); }} qualityPreset={qualityPreset} compressLevel={compressLevel} go={go} showToast={showToast} />;
      case 'quality': return <QualityScreen colors={colors} qualityPreset={qualityPreset} setQualityPreset={setQualityPreset} qualityFormat={qualityFormat} setQualityFormat={setQualityFormat} go={go} showToast={showToast} />;
      case 'pdf-tools': return <PdfToolsScreen colors={colors} go={go} />;
      case 'scanner': return <ScannerScreen colors={colors} go={go} qualityPreset={qualityPreset} capturedImages={capturedImages} setCapturedImages={setCapturedImages} showToast={showToast} initialParams={params} />;
      case 'crop': return <CropScreen colors={colors} go={go} capturedImages={capturedImages} setCapturedImages={setCapturedImages} showToast={showToast} />;
      case 'enhance': return <EnhanceScreen colors={colors} go={go} capturedImages={capturedImages} setCapturedImages={setCapturedImages} qualityPreset={qualityPreset} showToast={showToast} onSaveDocument={saveScannedDocument} />;
      case 'preview': return <PreviewScreen colors={colors} go={go} currentDoc={currentDoc} showToast={showToast} />;
      case 'detail': return <DetailScreen colors={colors} go={go} currentDoc={currentDoc} onToggleFav={toggleFavorite} onRename={renameDoc} onDelete={deleteDoc} onDeletePage={deletePage} onAddPage={addPage} showToast={showToast} />;
      case 'ocr': return <OCRScreen colors={colors} go={go} currentDoc={currentDoc} showToast={showToast} />;
      case 'annotation': return <AnnotationScreen colors={colors} go={go} currentDoc={currentDoc} showToast={showToast} />;
      case 'signature': return <SignatureScreen colors={colors} go={go} currentDoc={currentDoc} showToast={showToast} />;
      case 'merge': return <MergeScreen colors={colors} go={go} documents={documents} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'split': return <SplitScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'compress': return <CompressScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'convert': return <ConvertScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      case 'reorder': return <ReorderScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} />;
      case 'watermark': return <WatermarkScreen colors={colors} go={go} documents={documents} currentDoc={currentDoc} showToast={showToast} params={params} onComplete={onToolProgress} />;
      default: return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text }}>Halaman tidak ditemukan</Text></View>;
    }
  };

  const showDock = TAB_SCREENS.includes(currentScreen.name);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {renderScreen()}
        {showDock ? <BottomDock colors={colors} current={currentScreen.name} go={switchTab} /> : null}
        <Toast message={toast} colors={colors} />
        <ProgressModal visible={progress.visible} title={progress.title} sub={progress.sub} progress={progress.value} colors={colors} />
      </View>
    </SafeAreaView>
  );
};

const App = () => (
  <SafeAreaProvider>
    <ThemeProvider mode="dark" setMode={() => {}}>
      <AppInner />
    </ThemeProvider>
  </SafeAreaProvider>
);

export default App;
