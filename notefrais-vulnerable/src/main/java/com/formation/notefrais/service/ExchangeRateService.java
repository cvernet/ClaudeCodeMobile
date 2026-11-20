package com.formation.notefrais.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Récupère un taux de change auprès d'un service distant. */
@Service
public class ExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateService.class);

    public BigDecimal fetchRate(String serviceUrl, String currency) {
        String content = fetch(serviceUrl + "?from=" + currency + "&to=EUR");
        try {
            return new BigDecimal(content.trim());
        } catch (NumberFormatException ex) {
            log.warn("Réponse inattendue du service de taux : {}", content);
            return BigDecimal.ONE;
        }
    }

    /** Appelle une URL et renvoie le contenu brut (utilisé aussi par l'outil de test admin). */
    public String fetch(String url) {
        try (InputStream in = new URL(url).openStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return "Erreur : " + ex;
        }
    }
}
