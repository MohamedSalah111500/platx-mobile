import * as Crypto from 'expo-crypto';

export interface PkcePair {
  verifier: string;
  challenge: string;
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomHex(): string {
  return Crypto.randomUUID().replace(/-/g, '');
}

export async function createPkcePair(): Promise<PkcePair> {
  const verifier = randomHex() + randomHex();
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return { verifier, challenge: toBase64Url(digest) };
}
