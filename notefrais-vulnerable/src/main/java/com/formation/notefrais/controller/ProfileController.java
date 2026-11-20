package com.formation.notefrais.controller;

import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/profile")
    public String profile(HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        model.addAttribute("user", userRepository.findById(user.getId()));
        return "profile";
    }

    @PostMapping("/profile")
    public String update(@RequestParam String email, @RequestParam String iban,
                         @RequestParam String signature, HttpSession session) {
        User user = (User) session.getAttribute("user");
        userRepository.updateProfile(user.getId(), email, iban, signature);
        session.setAttribute("user", userRepository.findById(user.getId()));
        return "redirect:/profile?saved";
    }
}
