package com.formation.notefrais.controller;

import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.ExpenseRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    private final ExpenseRepository expenseRepository;

    public DashboardController(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    @GetMapping("/")
    public String dashboard(HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        model.addAttribute("user", user);
        model.addAttribute("totals", expenseRepository.monthlyTotals(user.getId()));
        model.addAttribute("pending", expenseRepository.totalPending());
        return "dashboard";
    }
}
