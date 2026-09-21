/**
 * deviceFingerprint.ts
 * --------------------
 * Generates a stable SHA-256 hex fingerprint from React Native device constants.
 * Uses only packages already in the project (expo constants built into expo SDK).
 *
 * On Android, `Constants.deviceName` and platform-specific constants give us
 * enough entropy to uniquely identify the physical device.
 *
 * NOTE: This runs inside the JS engine (Hermes), which does not have
 * the Web Crypto API. We use a pure-JS SHA-256 implementation instead.
 */

import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';

// Tiny pure-JS SHA-256 (no native bindings needed, no extra package)
function sha256(message: string): string {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];

  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) { bytes.push(0xc0|(c>>6)); bytes.push(0x80|(c&63)); }
    else { bytes.push(0xe0|(c>>12)); bytes.push(0x80|((c>>6)&63)); bytes.push(0x80|(c&63)); }
  }
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = (message.length * 8);
  bytes.push(0,0,0,0,(bitLen>>>24)&0xff,(bitLen>>>16)&0xff,(bitLen>>>8)&0xff,bitLen&0xff);

  for (let i = 0; i < bytes.length; i += 64) {
    const W: number[] = [];
    for (let j = 0; j < 16; j++) {
      W[j] = (bytes[i+j*4]<<24)|(bytes[i+j*4+1]<<16)|(bytes[i+j*4+2]<<8)|bytes[i+j*4+3];
    }
    for (let j = 16; j < 64; j++) {
      const s0 = ((W[j-15]>>>7)|(W[j-15]<<25)) ^ ((W[j-15]>>>18)|(W[j-15]<<14)) ^ (W[j-15]>>>3);
      const s1 = ((W[j-2]>>>17)|(W[j-2]<<15)) ^ ((W[j-2]>>>19)|(W[j-2]<<13)) ^ (W[j-2]>>>10);
      W[j] = (W[j-16] + s0 + W[j-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let j = 0; j < 64; j++) {
      const S1 = ((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
      const ch = (e&f)^(~e&g);
      const temp1 = (h+S1+ch+K[j]+W[j]) >>> 0;
      const S0 = ((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
      const maj = (a&b)^(a&c)^(b&c);
      const temp2 = (S0+maj) >>> 0;
      [h,g,f,e,d,c,b,a] = [g,f,e,(d+temp1)>>>0,c,b,a,(temp1+temp2)>>>0];
    }
    H = H.map((v,i) => (v + [a,b,c,d,e,f,g,h][i]) >>> 0);
  }
  return H.map(v => v.toString(16).padStart(8,'0')).join('');
}

export function getDeviceFingerprint(): string {
  const { width, height } = Dimensions.get('screen');

  const components = [
    Platform.OS,
    Platform.Version?.toString() ?? 'unknown',
    Constants.deviceName ?? 'unknown',
    Constants.modelName ?? Constants.platform?.ios?.model ?? 'unknown',
    width.toString(),
    height.toString(),
    Constants.sessionId ?? 'no-session',          // unique per install
    Constants.executionEnvironment ?? 'unknown',
  ];

  return sha256(components.join('|'));
}
