package com.swiftmove.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate-limiting filter for sensitive endpoints (auth, password reset).
 *
 * Uses bucket4j with a token-bucket algorithm — each IP gets N tokens,
 * consumed on each request, refilled at a steady rate. When the bucket
 * is empty, requests get 429 Too Many Requests.
 *
 * Why IP-based: at this stage we don't have user identification before
 * login. IP is the best available key. If the app sits behind a proxy
 * (Nginx, Cloudflare), swap getClientIp() to read X-Forwarded-For.
 *
 * Limits chosen for a logistics app:
 *   Login:           5 attempts / minute  (brute-force protection)
 *   Register:        3 attempts / minute  (spam prevention)
 *   Forgot password: 2 attempts / minute  (OTP spam prevention)
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // Bucket per IP, per endpoint pattern
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    // Bandwidth configs
    private static final Bandwidth LOGIN_LIMIT    = Bandwidth.classic(5,  Refill.greedy(5,  Duration.ofMinutes(1)));
    private static final Bandwidth REGISTER_LIMIT = Bandwidth.classic(3,  Refill.greedy(3,  Duration.ofMinutes(1)));
    private static final Bandwidth FORGOT_LIMIT   = Bandwidth.classic(2,  Refill.greedy(2,  Duration.ofMinutes(1)));

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String ip = getClientIp(request);

        Bandwidth limit = getLimitForPath(path);
        if (limit == null) {
            // Not a rate-limited endpoint
            filterChain.doFilter(request, response);
            return;
        }

        String key = ip + ":" + path;
        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder().addLimit(limit).build());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded: IP={} path={}", ip, path);
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again in a minute.\"}");
        }
    }

    private Bandwidth getLimitForPath(String path) {
        if (path.endsWith("/api/auth/login") || path.endsWith("/api/auth/register"))
            return path.endsWith("/login") ? LOGIN_LIMIT : REGISTER_LIMIT;
        if (path.endsWith("/api/auth/forgot-password"))
            return FORGOT_LIMIT;
        return null;
    }

    /**
     * Read client IP — checks X-Forwarded-For first (for proxied deployments),
     * falls back to remoteAddr.
     */
    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Take the first IP in the chain (the original client)
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
