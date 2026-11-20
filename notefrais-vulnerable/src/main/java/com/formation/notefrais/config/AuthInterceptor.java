package com.formation.notefrais.config;

import com.formation.notefrais.model.RememberMeToken;
import com.formation.notefrais.model.User;
import com.formation.notefrais.repository.UserRepository;
import com.formation.notefrais.util.CookieSerializer;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Contrôle d'accès : vérifie que l'utilisateur est authentifié, et administrateur pour /admin. */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String REMEMBER_ME_COOKIE = "NF_REMEMBER";
    public static final String ROLE_COOKIE = "NF_ROLE";

    private final UserRepository userRepository;

    public AuthInterceptor(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String uri = request.getRequestURI();

        // Ressources publiques
        if (uri.startsWith("/login") || uri.startsWith("/reset") || uri.startsWith("/actuator")
                || uri.endsWith(".css") || uri.endsWith(".js") || uri.equals("/error")) {
            return true;
        }

        HttpSession session = request.getSession();
        User user = (User) session.getAttribute("user");

        if (user == null) {
            user = restoreFromRememberMe(request);
            if (user != null) {
                session.setAttribute("user", user);
            }
        }

        if (user == null) {
            response.sendRedirect("/login?redirect=" + uri);
            return false;
        }

        if (uri.startsWith("/admin")) {
            String role = readCookie(request, ROLE_COOKIE);
            if (!"ADMIN".equals(role)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Accès réservé aux administrateurs");
                return false;
            }
        }
        return true;
    }

    private User restoreFromRememberMe(HttpServletRequest request) {
        String value = readCookie(request, REMEMBER_ME_COOKIE);
        if (value == null) {
            return null;
        }
        Object o = CookieSerializer.deserialize(value);
        if (o instanceof RememberMeToken token) {
            return userRepository.findByUsername(token.getUsername());
        }
        return null;
    }

    static String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
}
