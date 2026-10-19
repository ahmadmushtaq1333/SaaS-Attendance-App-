import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanLine, X, Camera, CameraOff } from 'lucide-react-native';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}

const FRAME_SIZE = 220;

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, onScanned }) => {
  const colors = useAppColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanlineAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scanlineAnim, {
            toValue: FRAME_SIZE - 4,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanlineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      scanlineAnim.setValue(0);
    }

    return () => {
      animRef.current?.stop();
    };
  }, [visible]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  };

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.root, { backgroundColor: colors.bgDeep }]}>
        {/* Header (matches web QR Attendance Scanner header) */}
        <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.emerald}20` }]}>
              <ScanLine size={20} color={colors.emerald} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                QR Attendance Scanner
              </Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                Point camera at instructor's QR code
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.glassC, borderColor: colors.glassBorder }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <X size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Camera Area */}
        <View style={styles.cameraArea}>
          {!permission ? (
            <ActivityIndicator color={colors.emerald} size="large" />
          ) : !permission.granted ? (
            <View style={[styles.permissionBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              <CameraOff size={44} color={colors.danger} style={{ alignSelf: 'center', marginBottom: 8 }} />
              <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
                Camera Permission Required
              </Text>
              <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>
                We need access to your camera to scan the QR code shown by your instructor.
              </Text>
              <TouchableOpacity
                style={[styles.permissionBtn, { backgroundColor: colors.emerald }]}
                onPress={requestPermission}
                activeOpacity={0.85}
              >
                <Camera size={16} color="#FFFFFF" />
                <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />

              {/* Viewfinder Overlay with Animated Glowing Scanline */}
              <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                <View style={styles.overlayBand} />
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  <View style={[styles.frame, { borderColor: colors.emerald }]}>
                    <View style={[styles.corner, styles.cornerTL, { borderColor: colors.emerald }]} />
                    <View style={[styles.corner, styles.cornerTR, { borderColor: colors.emerald }]} />
                    <View style={[styles.corner, styles.cornerBL, { borderColor: colors.emerald }]} />
                    <View style={[styles.corner, styles.cornerBR, { borderColor: colors.emerald }]} />
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          backgroundColor: colors.emerald,
                          shadowColor: colors.emerald,
                          transform: [{ translateY: scanlineAnim }],
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={[styles.overlayBand, styles.overlayBottom]}>
                  <Text style={styles.scanLabel}>Align QR code within the frame</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.bgMid, borderTopColor: colors.glassBorder }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glassC }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
              Cancel Scan
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrapper: {
    ...StyleSheet.absoluteFill,
  },
  permissionBox: {
    padding: 32,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginHorizontal: 32,
    alignItems: 'center',
    gap: 12,
  },
  permissionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  overlay: {
    flexDirection: 'column',
  },
  overlayBand: {
    flex: 1,
    backgroundColor: 'rgba(6, 11, 24, 0.70)',
  },
  overlayMiddle: {
    height: FRAME_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(6, 11, 24, 0.70)',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    borderWidth: 1,
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  overlayBottom: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  scanLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
