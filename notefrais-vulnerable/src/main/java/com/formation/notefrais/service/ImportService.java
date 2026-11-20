package com.formation.notefrais.service;

import com.formation.notefrais.model.Expense;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

/**
 * Import en masse de notes de frais depuis un fichier XML exporté par l'ancien outil.
 * <pre>
 * &lt;expenses&gt;
 *   &lt;expense userId="3" date="2026-11-01" category="REPAS" ht="20.00" vat="10"&gt;Description&lt;/expense&gt;
 * &lt;/expenses&gt;
 * </pre>
 */
@Service
public class ImportService {

    public List<Expense> parse(InputStream xml) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = dbf.newDocumentBuilder();
        Document doc = builder.parse(xml);

        List<Expense> result = new ArrayList<>();
        NodeList nodes = doc.getElementsByTagName("expense");
        for (int i = 0; i < nodes.getLength(); i++) {
            Element el = (Element) nodes.item(i);
            Expense e = new Expense();
            e.setUserId(Integer.parseInt(el.getAttribute("userId")));
            e.setExpenseDate(LocalDate.parse(el.getAttribute("date")));
            e.setCategory(el.getAttribute("category"));
            e.setAmountHt(new BigDecimal(el.getAttribute("ht")));
            e.setVatRate(new BigDecimal(el.getAttribute("vat")));
            e.setDescription(el.getTextContent());
            result.add(e);
        }
        return result;
    }
}
