package com.formation.notefrais.service;

import com.formation.notefrais.model.Expense;
import com.formation.notefrais.model.User;
import org.apache.commons.text.StringSubstitutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Génère les messages de notification envoyés lors du traitement d'une note de frais. */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public String buildMessage(User manager, Expense expense, String decision) {
        String template = "Bonjour, votre note de frais n°" + expense.getId()
                + " (" + expense.getAmountTtc() + " EUR) a été " + decision + ".\n"
                + manager.getSignature();
        // Interpolation des variables éventuelles (${date:...}, ${env:...}, etc.)
        String message = StringSubstitutor.createInterpolator().replace(template);
        log.info("Notification envoyée : {}", message);
        return message;
    }
}
