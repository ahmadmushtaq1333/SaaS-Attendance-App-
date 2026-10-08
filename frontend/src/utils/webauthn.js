// Convert base64url string to ArrayBuffer
function base64urlToBuffer(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// Convert ArrayBuffer to base64url string
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export const WebAuthnClient = {
  isSupported() {
    return typeof window !== "undefined" && window.PublicKeyCredential !== undefined;
  },

  async register(challengeOptions) {
    // Decode challenge and user.id from base64url to ArrayBuffer
    const publicKey = {
      ...challengeOptions,
      challenge: base64urlToBuffer(challengeOptions.challenge),
      user: {
        ...challengeOptions.user,
        id: base64urlToBuffer(challengeOptions.user.id),
      },
    };

    if (publicKey.excludeCredentials) {
      publicKey.excludeCredentials = publicKey.excludeCredentials.map((cred) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      }));
    }

    const credential = await navigator.credentials.create({ publicKey });

    // Encode response ArrayBuffers to base64url
    return {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
        attestationObject: bufferToBase64url(credential.response.attestationObject),
      },
    };
  },

  async authenticate(challengeOptions) {
    // Decode challenge from base64url to ArrayBuffer
    const publicKey = {
      ...challengeOptions,
      challenge: base64urlToBuffer(challengeOptions.challenge),
    };

    if (publicKey.allowCredentials) {
      publicKey.allowCredentials = publicKey.allowCredentials.map((cred) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      }));
    }

    const credential = await navigator.credentials.get({ publicKey });

    // Encode response ArrayBuffers to base64url
    return {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: bufferToBase64url(credential.response.authenticatorData),
        clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
        signature: bufferToBase64url(credential.response.signature),
        userHandle: credential.response.userHandle ? bufferToBase64url(credential.response.userHandle) : null,
      },
    };
  },
};
