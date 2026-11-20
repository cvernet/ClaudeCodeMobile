package com.formation.notefrais.controller;

import com.formation.notefrais.model.Expense;
import com.formation.notefrais.repository.AuditRepository;
import com.formation.notefrais.repository.UserRepository;
import com.formation.notefrais.service.ExchangeRateService;
import com.formation.notefrais.service.ExpenseService;
import com.formation.notefrais.service.ImportService;
import com.formation.notefrais.service.ReportService;
import javax.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final AuditRepository auditRepository;
    private final ReportService reportService;
    private final ImportService importService;
    private final ExpenseService expenseService;
    private final ExchangeRateService exchangeRateService;

    public AdminController(UserRepository userRepository, AuditRepository auditRepository,
                           ReportService reportService, ImportService importService,
                           ExpenseService expenseService, ExchangeRateService exchangeRateService) {
        this.userRepository = userRepository;
        this.auditRepository = auditRepository;
        this.reportService = reportService;
        this.importService = importService;
        this.expenseService = expenseService;
        this.exchangeRateService = exchangeRateService;
    }

    @GetMapping
    public String home(HttpSession session, Model model) {
        model.addAttribute("user", session.getAttribute("user"));
        model.addAttribute("users", userRepository.findAll());
        model.addAttribute("audit", auditRepository.latest(30));
        return "admin/index";
    }

    @PostMapping("/export")
    public String export(@RequestParam String name, HttpSession session, Model model) throws Exception {
        model.addAttribute("result", reportService.exportApproved(name));
        return home(session, model);
    }

    @PostMapping("/import")
    public String importXml(@RequestParam MultipartFile file, HttpSession session, Model model) throws Exception {
        List<Expense> expenses = importService.parse(file.getInputStream());
        StringBuilder sb = new StringBuilder();
        for (Expense e : expenses) {
            expenseService.submit(e, "EUR", null);
            sb.append("Importée : ").append(e.getDescription()).append('\n');
        }
        model.addAttribute("result", sb.toString());
        return home(session, model);
    }

    /** Vérifie l'accès à la base de l'ancien outil avant une reprise de données. */
    @PostMapping("/check-db")
    public String checkDb(@RequestParam String jdbcUrl, @RequestParam String dbUser,
                          @RequestParam String dbPassword, HttpSession session, Model model) {
        try (Connection c = DriverManager.getConnection(jdbcUrl, dbUser, dbPassword)) {
            model.addAttribute("result", "Connexion OK : " + c.getMetaData().getDatabaseProductName()
                    + " " + c.getMetaData().getDatabaseProductVersion());
        } catch (Exception e) {
            model.addAttribute("result", "Echec de connexion : " + e.getMessage());
        }
        return home(session, model);
    }

    @GetMapping("/check-url")
    public String checkUrl(@RequestParam String url, HttpSession session, Model model) {
        model.addAttribute("result", exchangeRateService.fetch(url));
        return home(session, model);
    }
}
