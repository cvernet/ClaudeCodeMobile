package com.formation.notefrais.controller;

import javax.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

/** Aide en ligne, disponible en plusieurs langues. */
@Controller
public class HelpController {

    @GetMapping("/help")
    public String help(@RequestParam(defaultValue = "fr") String lang, HttpSession session, Model model) {
        model.addAttribute("user", session.getAttribute("user"));
        return "help/" + lang;
    }
}
