package com.expensesage.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.expensesage.dto.ErrorResponseDto;
import com.expensesage.dto.ForgotPasswordRequest;
import com.expensesage.dto.JwtResponse;
import com.expensesage.dto.LoginRequest;
import com.expensesage.dto.RegisterRequest;
import com.expensesage.dto.ResendVerificationRequest; // Added import
import com.expensesage.dto.ResetPasswordRequest;
import com.expensesage.dto.UserResponse;
import com.expensesage.mapper.UserMapper;
import com.expensesage.model.User;
import com.expensesage.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserMapper userMapper;

    @Autowired
    public AuthController(AuthService authService, UserMapper userMapper) {
        this.authService = authService;
        this.userMapper = userMapper;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            User newUser = authService.registerUser(registerRequest);
            UserResponse userResponse = userMapper.toUserResponse(newUser);
            return new ResponseEntity<>(userResponse, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            JwtResponse jwtResponse = authService.loginUser(loginRequest);
            return ResponseEntity.ok(jwtResponse);
        } catch (RuntimeException e) {
            logger.warn("Login failed for {}: {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponseDto(HttpStatus.UNAUTHORIZED, e.getMessage(), "/api/auth/login"));
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyUserAccount(@RequestParam("token") String token) {
        boolean isVerified = authService.verifyUser(token);
        if (isVerified) {
            return ResponseEntity.ok("Email successfully verified. You can now log in.");
        } else {
            // Return specific message for expired/invalid token
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("Email verification failed. The link may be invalid or expired.");
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest forgotPasswordRequest) {
        try {
            authService.forgotPassword(forgotPasswordRequest);
            return ResponseEntity.ok("If an account exists for this email, a password reset link has been sent.");
        } catch (Exception e) {
            logger.error("Unexpected error during forgot password request for email {}: {}", forgotPasswordRequest.getEmail(), e.getMessage(), e);
            return ResponseEntity.ok("If an account exists for this email, a password reset link has been sent.");
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest resetPasswordRequest) {
        boolean success = authService.resetPassword(resetPasswordRequest);
        if (success) {
            return ResponseEntity.ok("Password has been successfully reset. You can now log in with your new password.");
        } else {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("Password reset failed. The link may be invalid or expired.");
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@Valid @RequestBody ResendVerificationRequest resendRequest) {
         try {
            authService.resendVerificationEmail(resendRequest);
            // Always return OK to prevent user enumeration and indicate process started
            return ResponseEntity.ok("If your account exists and is not verified, a new verification email has been sent.");
        } catch (Exception e) {
            // Log unexpected errors but still return OK
            logger.error("Unexpected error during resend verification request for email {}: {}", resendRequest.getEmail(), e.getMessage(), e);
            return ResponseEntity.ok("If your account exists and is not verified, a new verification email has been sent.");
        }
    }

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AuthController.class);

}