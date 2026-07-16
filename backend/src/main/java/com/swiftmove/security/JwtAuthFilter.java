package com.swiftmove.security;

import com.swiftmove.service.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

@SuppressWarnings("NullableProblems")
    @Override
    protected void doFilterInternal( HttpServletRequest request,
                                    HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response); return;
        }
        final String jwt = authHeader.substring(7);

        // A bad token (expired, malformed, wrong signature, ...) is not a
        // server error — it just means this request isn't authenticated.
        // Swallow JwtException here and let the request continue as
        // anonymous; Spring Security's normal authorization rules further
        // down the chain will then correctly return a clean 401 instead of
        // this filter crashing the whole request with a 500.
        String email = null;
        try {
            email = jwtService.extractUsername(jwt);
        } catch (JwtException | IllegalArgumentException ignored) {
            // token invalid/expired — proceed unauthenticated
        }

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            if (jwtService.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}