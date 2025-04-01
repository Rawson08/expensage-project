package com.expensesage.security.services;

import com.expensesage.model.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.Objects;

public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private String email;
    private boolean enabled; // Store enabled status (based on email verification)

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;

    // Updated constructor
    public UserDetailsImpl(Long id, String name, String email, String password, boolean enabled,
                           Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.enabled = enabled; // Assign enabled status
        this.authorities = authorities;
    }

    // Updated build method
    public static UserDetailsImpl build(User user) {
        Collection<? extends GrantedAuthority> authorities = Collections.emptyList(); // Keep authorities simple for now

        return new UserDetailsImpl(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.isEmailVerified(), // Use emailVerified status for enabled flag
                authorities);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    // Account status methods - isEnabled now reflects email verification
    @Override
    public boolean isAccountNonExpired() {
        return true; // Keep as true for now
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // Keep as true for now
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // Keep as true for now
    }

    @Override
    public boolean isEnabled() {
        return enabled; // Return the stored enabled status
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}