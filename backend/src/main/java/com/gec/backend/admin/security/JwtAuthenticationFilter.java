package com.gec.backend.admin.security;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.publicuser.entity.PublicUserEntity;
import com.gec.backend.publicuser.repository.PublicUserRepository;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final AdminUserRepository adminUserRepository;
    private final PublicUserRepository publicUserRepository;

    public JwtAuthenticationFilter(
        JwtTokenProvider tokenProvider,
        AdminUserRepository adminUserRepository,
        PublicUserRepository publicUserRepository
    ) {
        this.tokenProvider = tokenProvider;
        this.adminUserRepository = adminUserRepository;
        this.publicUserRepository = publicUserRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        try {
            String jwt = getJwtFromRequest(request);
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String userType = tokenProvider.getUserTypeFromToken(jwt);
                String username = tokenProvider.getUsernameFromToken(jwt);

                if ("PUBLIC".equalsIgnoreCase(userType)) {
                    Optional<PublicUserEntity> publicUserOpt = publicUserRepository.findByPhoneNumberNormalized(username);
                    if (publicUserOpt.isPresent() && "ACTIVE".equalsIgnoreCase(publicUserOpt.get().getStatus())) {
                        PublicUserEntity publicUser = publicUserOpt.get();
                        PublicUserPrincipal principal = new PublicUserPrincipal(publicUser);
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities()
                        );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                } else {
                    Optional<AdminUserEntity> userOpt = adminUserRepository.findByEmailIgnoreCase(username);

                    if (userOpt.isPresent() && userOpt.get().isActive() && !userOpt.get().isLocked()) {
                        AdminUserEntity user = userOpt.get();
                        AdminUserPrincipal principal = new AdminUserPrincipal(user);
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities()
                        );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        if (user.isMustChangePassword()) {
                            String uri = request.getRequestURI();
                            if (!uri.endsWith("/auth/change-password") && !uri.endsWith("/auth/logout") && !uri.endsWith("/auth/me")) {
                                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                response.setContentType("application/json");
                                response.getWriter().write("{\"code\":\"PASSWORD_CHANGE_REQUIRED\",\"message\":\"You must change your temporary password before continuing.\"}");
                                return;
                            }
                        }
                    }
                }
            }
        } catch (Exception ex) {
            // Ignore invalid token
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
