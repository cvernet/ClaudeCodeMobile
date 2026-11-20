package com.formation.notefrais.controller;

import com.formation.notefrais.model.Expense;
import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.AuditRepository;
import com.formation.notefrais.repository.ExpenseRepository;
import com.formation.notefrais.repository.UserRepository;
import com.formation.notefrais.service.ExpenseService;
import com.formation.notefrais.service.FileStorageService;
import com.formation.notefrais.service.NotificationService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Controller
@RequestMapping("/expenses")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final AuditRepository auditRepository;
    private final ExpenseService expenseService;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;

    public ExpenseController(ExpenseRepository expenseRepository, UserRepository userRepository,
                             AuditRepository auditRepository, ExpenseService expenseService,
                             FileStorageService fileStorageService, NotificationService notificationService) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.auditRepository = auditRepository;
        this.expenseService = expenseService;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String q,
                       @RequestParam(required = false) String sort,
                       HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        model.addAttribute("user", user);
        model.addAttribute("q", q);
        model.addAttribute("expenses", expenseRepository.search(user.getId(), q, sort));
        return "expenses/list";
    }

    @GetMapping("/new")
    public String form(HttpSession session, Model model) {
        model.addAttribute("user", session.getAttribute("user"));
        model.addAttribute("expense", new Expense());
        return "expenses/form";
    }

    @PostMapping
    public String create(@ModelAttribute Expense expense,
                         @RequestParam(required = false) MultipartFile receipt,
                         @RequestParam(defaultValue = "EUR") String currency,
                         @RequestParam(required = false) String rateUrl,
                         HttpSession session) throws IOException {
        User user = (User) session.getAttribute("user");
        if (expense.getUserId() == null) {
            expense.setUserId(user.getId());
        }
        expense.setReceiptPath(fileStorageService.store(receipt));
        expenseService.submit(expense, currency, rateUrl);
        auditRepository.log(user.getUsername(), "EXPENSE_CREATED", expense.getDescription());
        return "redirect:/expenses";
    }

    @GetMapping("/{id}")
    public String view(@PathVariable int id, HttpSession session, Model model) {
        model.addAttribute("user", session.getAttribute("user"));
        model.addAttribute("expense", expenseRepository.findById(id));
        return "expenses/view";
    }

    /** File des notes à valider (managers). */
    @GetMapping("/pending")
    public String pending(HttpSession session, Model model) {
        model.addAttribute("user", session.getAttribute("user"));
        model.addAttribute("expenses", expenseRepository.findByStatus("SUBMITTED"));
        return "expenses/pending";
    }

    @PostMapping("/{id}/decision")
    public String decide(@PathVariable int id, @RequestParam String decision,
                         HttpSession session, Model model) {
        User manager = (User) session.getAttribute("user");
        Expense expense = expenseRepository.findById(id);
        String status = "approve".equals(decision) ? "APPROVED" : "REJECTED";
        expenseRepository.updateStatus(id, status);
        auditRepository.log(manager.getUsername(), "EXPENSE_" + status, "note " + id);

        String message = notificationService.buildMessage(manager, expense,
                "APPROVED".equals(status) ? "approuvée" : "refusée");
        model.addAttribute("user", manager);
        model.addAttribute("notification", message);
        model.addAttribute("expenses", expenseRepository.findByStatus("SUBMITTED"));
        return "expenses/pending";
    }

    @GetMapping("/{id}/delete")
    public String delete(@PathVariable int id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        expenseRepository.delete(id);
        auditRepository.log(user.getUsername(), "EXPENSE_DELETED", "note " + id);
        return "redirect:/expenses";
    }

    @GetMapping("/receipt")
    public ResponseEntity<byte[]> receipt(@RequestParam String file) throws IOException {
        byte[] content = fileStorageService.load(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file + "\"")
                .body(content);
    }
}
