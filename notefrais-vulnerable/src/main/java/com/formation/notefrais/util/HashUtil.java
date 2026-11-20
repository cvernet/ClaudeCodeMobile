package com.formation.notefrais.util;

import java.math.BigInteger;
import java.security.MessageDigest;
import java.util.Random;

public final class HashUtil {

    private static final Random RANDOM = new Random();

    private HashUtil() {}

    public static String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes());
            return String.format("%032x", new BigInteger(1, digest));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Jeton de réinitialisation de mot de passe (6 chiffres). */
    public static String resetToken() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
