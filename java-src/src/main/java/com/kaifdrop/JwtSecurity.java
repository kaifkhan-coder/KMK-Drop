package com.kaifdrop;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Lightweight standard HMAC-SHA256 JWT implementation for secure peer handshake verification.
 * Architect: Khan Mohammed Kaif
 */
public class JwtSecurity {

    private static final String DEFAULT_SECRET = "KaifDrop_Secure_Master_Key_2026_KMK";

    public static String generateToken(String subject, String role, long expirySeconds) {
        try {
            long nowSec = System.currentTimeMillis() / 1000;
            long expSec = nowSec + expirySeconds;

            String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
            String payloadJson = String.format(
                "{\"sub\":\"%s\",\"role\":\"%s\",\"iat\":%d,\"exp\":%d,\"app\":\"KaifDrop-Secure\"}",
                escape(subject), escape(role), nowSec, expSec
            );

            String encodedHeader = base64UrlEncode(headerJson.getBytes(StandardCharsets.UTF_8));
            String encodedPayload = base64UrlEncode(payloadJson.getBytes(StandardCharsets.UTF_8));
            String dataToSign = encodedHeader + "." + encodedPayload;

            String signature = signHmacSha256(dataToSign, DEFAULT_SECRET);
            return dataToSign + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("JWT generation error", e);
        }
    }

    public static boolean verifyToken(String token) {
        try {
            if (token == null || !token.contains(".")) return false;
            String[] parts = token.split("\\.");
            if (parts.length != 3) return false;

            String dataToSign = parts[0] + "." + parts[1];
            String expectedSignature = signHmacSha256(dataToSign, DEFAULT_SECRET);

            if (!expectedSignature.equals(parts[2])) {
                return false;
            }

            // Parse expiration
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payloadStr = new String(payloadBytes, StandardCharsets.UTF_8);
            if (payloadStr.contains("\"exp\":")) {
                int expIdx = payloadStr.indexOf("\"exp\":") + 6;
                int endIdx = payloadStr.indexOf(",", expIdx);
                if (endIdx == -1) endIdx = payloadStr.indexOf("}", expIdx);
                long exp = Long.parseLong(payloadStr.substring(expIdx, endIdx).trim());
                long nowSec = System.currentTimeMillis() / 1000;
                return nowSec <= exp;
            }

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String signHmacSha256(String data, String secret)
            throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return base64UrlEncode(rawHmac);
    }

    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String escape(String s) {
        return s.replace("\"", "\\\"");
    }
}
