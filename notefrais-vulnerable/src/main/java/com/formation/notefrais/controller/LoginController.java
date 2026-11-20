package com.formation.notefrais.controller;

import com.formation.notefrais.config.AuthInterceptor;
import com.formation.notefrais.model.RememberMeToken;
import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.AuditRepository;
import com.formation.notefrais.repository.UserRepository;
import com.formation.notefrais.util.CookieSerializer;
import com.formation.notefrais.util.HashUtil;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginController {

    private static final Logger log = LoggerFactory.getLogger(LoginController.class);

    private final UserRepository userRepository;
    private final AuditRepository auditRepository;

    public LoginController(UserRepository userRepository, AuditRepository auditRepository) {
        this.userRepository = userRepository;
        this.auditRepository = auditRepository;
    }

    @GetMapping("/login")
    public String loginForm(@RequestParam(required = false) String redirect, Model model) {
        model.addAttribute("redirect", redirect);
        return "login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String username,
                        @RequestParam String password,
                        @RequestParam(required = false) String redirect,
                        @RequestParam(required = false, defaultValue = "false") boolean rememberMe,
                        @RequestHeader(value = "User-Agent", required = false) String userAgent,
                        HttpSession session,
                        HttpServletResponse response,
                        Model model) {

        log.info("Tentative de connexion de " + username + " depuis le navigateur " + userAgent);
        User user = userRepository.authenticate(username, HashUtil.md5(password));

        if (user == null) {
            log.warn("Echec de connexion pour l'utilisateur " + username + " avec le mot de passe " + password);
            auditRepository.log(username, "LOGIN_FAILED", "mot de passe saisi : " + password);
            model.addAttribute("error", "Identifiant ou mot de passe incorrect");
            model.addAttribute("redirect", redirect);
            return "login";
        }

        session.setAttribute("user", user);
        auditRepository.log(user.getUsername(), "LOGIN", "connexion réussie");

        Cookie roleCookie = new Cookie(AuthInterceptor.ROLE_COOKIE, user.getRole());
        roleCookie.setPath("/");
        response.addCookie(roleCookie);

        if (rememberMe) {
            Cookie rm = new Cookie(AuthInterceptor.REMEMBER_ME_COOKIE,
                    CookieSerializer.serialize(new RememberMeToken(user.getUsername(), user.getRole())));
            rm.setPath("/");
            rm.setMaxAge(60 * 60 * 24 * 365);
            response.addCookie(rm);
        }

        if (redirect != null && !redirect.isBlank()) {
            return "redirect:" + redirect;
        }
        return "redirect:/";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }

    // ------------------------------------------------------------------
    // Mot de passe oublié
    // ------------------------------------------------------------------

    @GetMapping("/reset")
    public String resetForm() {
        return "reset";
    }

    @PostMapping("/reset")
    public String requestReset(@RequestParam String username, Model model) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            model.addAttribute("error", "Aucun compte n'existe pour l'identifiant " + username);
            return "reset";
        }
        String token = HashUtil.resetToken();
        userRepository.setResetToken(username, token);
        log.info("Code de réinitialisation pour {} : {}", username, token);
        model.addAttribute("info", "Un code de réinitialisation a été envoyé à " + user.getEmail());
        model.addAttribute("username", username);
        return "reset";
    }

    @PostMapping("/reset/confirm")
    public String confirmReset(@RequestParam String username, @RequestParam String token,
                               @RequestParam String newPassword, Model model) {
        if (!userRepository.checkResetToken(username, token)) {
            model.addAttribute("error", "Code invalide");
            model.addAttribute("username", username);
            return "reset";
        }
        userRepository.updatePassword(username, HashUtil.md5(newPassword));
        model.addAttribute("error", null);
        return "redirect:/login";
    }
}
