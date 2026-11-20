package com.formation.notefrais.service;

import com.formation.notefrais.model.Expense;
import com.formation.notefrais.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;

/** Génération et archivage des exports comptables. */
@Service
public class ReportService {

    private final ExpenseRepository repository;
    private final File reportDir;

    public ReportService(ExpenseRepository repository, @Value("${app.report-dir}") String reportDir) {
        this.repository = repository;
        this.reportDir = new File(reportDir).getAbsoluteFile();
        this.reportDir.mkdirs();
    }

    /** Génère un CSV des notes approuvées puis l'archive en .tar.gz. Renvoie la sortie de la commande. */
    public String exportApproved(String archiveName) throws IOException, InterruptedException {
        File csv = new File(reportDir, "export.csv");
        try (PrintWriter w = new PrintWriter(new FileWriter(csv))) {
            w.println("id;salarie;date;categorie;description;ttc;rembourse");
            for (Expense e : repository.findByStatus("APPROVED")) {
                w.println(e.getId() + ";" + e.getOwnerName() + ";" + e.getExpenseDate() + ";"
                        + e.getCategory() + ";" + e.getDescription() + ";" + e.getAmountTtc() + ";"
                        + e.getReimbursable());
            }
        }

        String cmd = "cd " + reportDir + " && tar czf " + archiveName + ".tar.gz export.csv && ls -l " + archiveName + ".tar.gz";
        Process p = new ProcessBuilder("sh", "-c", cmd).redirectErrorStream(true).start();
        String output = new String(p.getInputStream().readAllBytes());
        p.waitFor();
        return output;
    }
}
