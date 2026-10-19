/**
 * webauthn.ts
 * -----------
 * Passkey / FIDO2 WebAuthn client for React Native mobile app.
 * Uses `react-native-passkeys` backed by Android Credential Manager and iOS ASAuthorizationController.
 */

import * as Passkey from 'react-native-passkeys';

export const WebAuthnClient = {
  isSupported(): boolean {
    return Passkey.isSupported();
  },

  /**
   * Registers a new passkey credential with the device authenticator.
   * @param challengeOptions Raw JSON from GET /auth/webauthn/register/challenge/
   */
  async register(challengeOptions: any) {
    if (!Passkey.isSupported()) {
      throw new Error('Biometric passkeys are not supported on this device.');
    }
    const credential = await Passkey.create(challengeOptions);
    if (!credential) {
      throw new Error('Passkey registration was cancelled.');
    }
    return credential;
  },

  /**
   * Authenticates using an existing registered passkey credential.
   * @param challengeOptions Raw JSON from GET /auth/webauthn/auth/challenge/
   */
  async authenticate(challengeOptions: any) {
    if (!Passkey.isSupported()) {
      throw new Error('Biometric passkeys are not supported on this device.');
    }
    const credential = await Passkey.get(challengeOptions);
    if (!credential) {
      throw new Error('Passkey authentication was cancelled.');
    }
    return credential;
  },
};
