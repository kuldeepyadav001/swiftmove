package com.swiftmove.security;

import com.swiftmove.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Validates JWT on every STOMP CONNECT frame. The token is passed via the
 * STOMP "Authorization" header (same format as HTTP: "Bearer <token>").
 * Invalid/expired/missing tokens cause the CONNECT to be rejected with a
 * STOMP ERROR frame — no anonymous WebSocket connections possible.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("WebSocket CONNECT rejected: missing/invalid Authorization header");
                return null; // reject connection
            }

            String jwt = authHeader.substring(7);
            String email = null;
            try {
                email = jwtService.extractUsername(jwt);
            } catch (Exception e) {
                log.warn("WebSocket CONNECT rejected: invalid token — {}", e.getMessage());
                return null;
            }

            if (email != null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    accessor.setUser(auth);
                } else {
                    log.warn("WebSocket CONNECT rejected: token invalid for user {}", email);
                    return null;
                }
            } else {
                log.warn("WebSocket CONNECT rejected: could not extract user from token");
                return null;
            }
        }

        return message;
    }
}
