package com.formation.notefrais.controller;

import com.formation.notefrais.model.Expense;
import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.ExpenseRepository;
import com.formation.notefrais.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API JSON consommée par l'application mobile et l'outil comptable. */
@RestController
@RequestMapping("/api")
public class ApiController {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public ApiController(ExpenseRepository expenseRepository, UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/expenses")
    public List<Expense> expenses(@RequestParam int userId,
                                  @RequestParam(required = false) String q,
                                  @RequestParam(required = false) String sort) {
        return expenseRepository.search(userId, q, sort);
    }

    @GetMapping("/users/{id}")
    public User user(@PathVariable int id) {
        return userRepository.findById(id);
    }
}
