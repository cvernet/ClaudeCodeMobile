package com.formation.notefrais.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.formation.notefrais.model.Expense;
import com.formation.notefrais.model.ExpenseBatch;
import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.ExpenseRepository;
import com.formation.notefrais.repository.UserRepository;
import com.formation.notefrais.service.ExpenseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API JSON consommée par l'application mobile et l'outil comptable. */
@RestController
@RequestMapping("/api")
public class ApiController {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final ExpenseService expenseService;
    private final ObjectMapper batchMapper;

    public ApiController(ExpenseRepository expenseRepository, UserRepository userRepository,
                         ExpenseService expenseService) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.expenseService = expenseService;
        // Les métadonnées sont de type libre : on conserve le type d'origine de chaque objet.
        this.batchMapper = new ObjectMapper().findAndRegisterModules();
        this.batchMapper.enableDefaultTyping();
    }

    @GetMapping("/expenses")
    public List<Expense> expenses(@RequestParam int userId,
                                  @RequestParam(required = false) String q,
                                  @RequestParam(required = false) String sort) {
        return expenseRepository.search(userId, q, sort);
    }

    /** Réception d'un lot de notes de frais (synchronisation de l'application mobile). */
    @PostMapping(value = "/expenses/batch", consumes = "application/json")
    public String batch(@RequestBody String json) throws Exception {
        ExpenseBatch batch = batchMapper.readValue(json, ExpenseBatch.class);
        for (Expense e : batch.getExpenses()) {
            expenseService.submit(e, "EUR", null);
        }
        return batch.getExpenses().size() + " note(s) importée(s) depuis " + batch.getSource();
    }

    @GetMapping("/users/{id}")
    public User user(@PathVariable int id) {
        return userRepository.findById(id);
    }
}
