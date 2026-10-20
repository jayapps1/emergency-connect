package com.gec.backend.publicuser.security;

import com.gec.backend.publicuser.entity.PublicUserEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class PublicUserPrincipal implements UserDetails {

    private final PublicUserEntity user;

    public PublicUserPrincipal(PublicUserEntity user) {
        this.user = user;
    }

    public UUID getId() { return user.getId(); }
    public PublicUserEntity getUser() { return user; }
    public String getPhoneNumberNormalized() { return user.getPhoneNumberNormalized(); }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_PUBLIC_USER"));
    }

    @Override
    public String getPassword() { return ""; }

    @Override
    public String getUsername() { return user.getPhoneNumberNormalized(); }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return !"DISABLED".equalsIgnoreCase(user.getStatus()); }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return "ACTIVE".equalsIgnoreCase(user.getStatus()); }
}
