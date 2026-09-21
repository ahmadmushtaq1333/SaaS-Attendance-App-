import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SIZE = 220;

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, onScanned }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanlineAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      // Start scan line animation
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
        ])
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

  // Request permission as soon as modal opens
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
      // Do NOT use pageSheet — it clips the camera on some Android versions
      presentationStyle="fullScreen"
    >
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Text style={{ fontSize: 20 }}>📷</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>QR Attendance Scanner</Text>
              <Text style={styles.headerSub}>Point camera at instructor's QR code</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Camera Area */}
        <View style={styles.cameraArea}>
          {!permission ? (
            <ActivityIndicator color={Colors.emerald} size="large" />
          ) : !permission.granted ? (
            /* Permission Denied State */
            <View style={styles.permissionBox}>
              <Text style={{ fontSize: 48, textAlign: 'center' }}>📵</Text>
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionDesc}>
                We need access to your camera to scan the QR code shown by your instructor.
              </Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* CameraView has NO children — overlay is an absolute sibling */
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />

              {/* Overlay sits on top of camera feed as an absolute sibling */}
              <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                <View style={styles.overlayBand} />
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  <View style={styles.frame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    <Animated.View
                      style={[styles.scanLine, { transform: [{ translateY: scanlineAnim }] }]}
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

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60, // safe area
    paddingBottom: 16,
    backgroundColor: Colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.emeraldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera
  cameraArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Wrapper holds CameraView + overlay as siblings (CameraView must have no children)
  cameraWrapper: {
    flex: 1,
  },

  // Overlay sits on top of live camera feed
  overlay: {
    flex: 1,
    flexDirection: 'column',
  },
  overlayBand: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  overlayBottom: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },

  // The transparent QR target box
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.emerald,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },

  // Animated scan line
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: Colors.emerald,
    shadowColor: Colors.emerald,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },

  scanLabel: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },

  // Permission screen
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  permissionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  permissionBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },

  // Cancel
  cancelBtn: {
    margin: 20,
    backgroundColor: Colors.glassA,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: FontSize.md,
  },
});
