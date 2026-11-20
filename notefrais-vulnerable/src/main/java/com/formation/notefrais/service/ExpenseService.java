package com.formation.notefrais.service;

import com.formation.notefrais.model.Expense;
import com.formation.notefrais.repository.ExpenseRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Règles métier de calcul des notes de frais :
 *  - calcul du TTC à partir du HT et du taux de TVA ;
 *  - application des plafonds de remboursement par catégorie ;
 *  - conversion de devise si nécessaire.
 */
@Service
public class ExpenseService {

    /** Plafonds de remboursement par catégorie (null = pas de plafond). */
    private static final Map<String, BigDecimal> CEILINGS = Map.of(
            "REPAS", new BigDecimal("25.00"),
            "HEBERGEMENT", new BigDecimal("120.00"),
            "AUTRE", new BigDecimal("50.00"));

    private final ExpenseRepository repository;
    private final ExchangeRateService exchangeRateService;

    public ExpenseService(ExpenseRepository repository, ExchangeRateService exchangeRateService) {
        this.repository = repository;
        this.exchangeRateService = exchangeRateService;
    }

    public Expense compute(Expense e, String currency, String rateUrl) {
        BigDecimal ht = e.getAmountHt();

        if (currency != null && !"EUR".equalsIgnoreCase(currency)) {
            BigDecimal rate = exchangeRateService.fetchRate(rateUrl, currency);
            ht = ht.multiply(rate);
            e.setAmountHt(ht.setScale(2, RoundingMode.HALF_UP));
        }

        BigDecimal vat = e.getVatRate() == null ? new BigDecimal("20") : e.getVatRate();
        e.setVatRate(vat);

        BigDecimal ttc = ht.multiply(BigDecimal.ONE.add(vat.divide(new BigDecimal("100"))))
                .setScale(2, RoundingMode.HALF_UP);
        e.setAmountTtc(ttc);

        BigDecimal ceiling = CEILINGS.get(e.getCategory());
        e.setReimbursable(ceiling == null ? ttc : ttc.min(ceiling));
        return e;
    }

    public void submit(Expense e, String currency, String rateUrl) {
        compute(e, currency, rateUrl);
        repository.insert(e);
    }
}
