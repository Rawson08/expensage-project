package com.expensesage.service.impl;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.ForgotPasswordRequest;
import com.expensesage.dto.JwtResponse;
import com.expensesage.dto.LoginRequest;
import com.expensesage.dto.RegisterRequest;
import com.expensesage.dto.ResetPasswordRequest;
import com.expensesage.dto.ResendVerificationRequest; // Added import
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.jwt.JwtUtils;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.AuthService;
import com.expensesage.service.EmailService;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;
    private final String verificationUrlBase;
    private final String passwordResetUrlBase;

    @Autowired
    public AuthServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtUtils jwtUtils,
                           EmailService emailService,
                           @Value("${app.verification.url.base}") String verificationUrlBase,
                           @Value("${app.password-reset.url.base}") String passwordResetUrlBase) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.emailService = emailService;
        this.verificationUrlBase = verificationUrlBase;
        this.passwordResetUrlBase = passwordResetUrlBase;
    }

    @Override
    @Transactional
    public User registerUser(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        User user = new User();
        user.setName(registerRequest.getName());
        user.setEmail(registerRequest.getEmail());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setEmailVerified(false);

        String token = UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(1)); // Token valid for 1 hour

        User savedUser = userRepository.save(user);
        logger.info("User registered successfully with ID: {}", savedUser.getId());

        sendVerificationEmail(savedUser, token);
        return savedUser;
    }

    private void sendVerificationEmail(User user, String token) {
        String verificationUrl = verificationUrlBase + "?token=" + token;
        String subject = "Verify Your Email for ExpenSage";
        String htmlBody = buildEmailHtml(subject,
                                         "Welcome to ExpenSage!",
                                         String.format("Hi %s,", user.getName()),
                                         "Thank you for signing up for ExpenSage. We're excited to have you on board!",
                                         "To get started with your smart expense tracking journey, please verify your email address by clicking the button below:",
                                         "Verify Email",
                                         verificationUrl,
                                         "This verification link will expire in 1 hour.",
                                         "If you didn't create an account with ExpenSage, you can safely ignore this email.");
        try {
            emailService.sendHtmlMessage(user.getEmail(), subject, htmlBody);
            logger.info("Verification email sent to {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Override
    public JwtResponse loginUser(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("Error: User not found with email: " + loginRequest.getEmail()));

        if (!user.isEmailVerified()) {
             logger.warn("Login attempt failed for unverified email: {}", loginRequest.getEmail());
             throw new RuntimeException("Error: Please verify your email address before logging in.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        return new JwtResponse(jwt, userDetails.getId(), userDetails.getUsername(), userDetails.getName());
    }

    @Override
    @Transactional
    public boolean verifyUser(String token) {
        Optional<User> userOptional = userRepository.findByVerificationToken(token);
        if (userOptional.isEmpty()) {
            logger.warn("Verification attempt failed: Token not found - {}", token);
            return false;
        }
        User user = userOptional.get();
        if (user.isEmailVerified()) {
            logger.info("Verification attempt for already verified user: {}", user.getEmail());
            return true;
        }
        if (user.getVerificationTokenExpiry() != null && user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            logger.warn("Verification attempt failed: Token expired for user {}", user.getEmail());
            return false;
        }
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);
        logger.info("Email successfully verified for user: {}", user.getEmail());
        return true;
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest forgotPasswordRequest) {
        Optional<User> userOptional = userRepository.findByEmail(forgotPasswordRequest.getEmail());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            String token = UUID.randomUUID().toString();
            user.setPasswordResetToken(token);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);
            sendPasswordResetEmail(user, token);
            logger.info("Password reset token generated for user: {}", user.getEmail());
        } else {
            logger.warn("Password reset requested for non-existent email: {}", forgotPasswordRequest.getEmail());
        }
    }

    private void sendPasswordResetEmail(User user, String token) {
        String resetUrl = passwordResetUrlBase + "?token=" + token;
        String subject = "Reset Your ExpenSage Password";
        String htmlBody = buildEmailHtml(subject,
                                         "Password Reset Request",
                                         String.format("Hi %s,", user.getName()),
                                         "We received a request to reset the password for your ExpenSage account.",
                                         "If you requested this reset, click the button below to set a new password:",
                                         "Reset Password",
                                         resetUrl,
                                         "This password reset link will expire in 1 hour.",
                                         "If you didn't request a password reset, please ignore this email.");
        try {
            emailService.sendHtmlMessage(user.getEmail(), subject, htmlBody);
            logger.info("Password reset email sent to {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send password reset email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Override
    @Transactional
    public boolean resetPassword(ResetPasswordRequest resetPasswordRequest) {
        Optional<User> userOptional = userRepository.findByPasswordResetToken(resetPasswordRequest.getToken());

        if (userOptional.isEmpty()) {
            logger.warn("Password reset attempt failed: Token not found - {}", resetPasswordRequest.getToken());
            return false;
        }

        User user = userOptional.get();

        if (user.getPasswordResetTokenExpiry() != null && user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            logger.warn("Password reset attempt failed: Token expired for user {}", user.getEmail());
            user.setPasswordResetToken(null);
            user.setPasswordResetTokenExpiry(null);
            userRepository.save(user);
            return false;
        }

        user.setPasswordHash(passwordEncoder.encode(resetPasswordRequest.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
        logger.info("Password successfully reset for user: {}", user.getEmail());
        return true;
    }

    @Override
    @Transactional
    public void resendVerificationEmail(ResendVerificationRequest resendRequest) {
        Optional<User> userOptional = userRepository.findByEmail(resendRequest.getEmail());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (!user.isEmailVerified()) {
                String token = UUID.randomUUID().toString();
                user.setVerificationToken(token);
                user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(1)); // New 1-hour expiry
                userRepository.save(user);
                sendVerificationEmail(user, token);
                logger.info("Resent verification email for user: {}", user.getEmail());
            } else {
                logger.info("Verification email resend requested for already verified user: {}", user.getEmail());
            }
        } else {
            logger.warn("Verification email resend requested for non-existent email: {}", resendRequest.getEmail());
        }
    }

    // Helper to build HTML email body
    private String buildEmailHtml(String emailTitle, String heading, String greeting, String p1, String p2, String buttonText, String buttonUrl, String expiryInfo, String ignoreInfo) {
         return String.format("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title> <!-- Email Title -->
                <style>
                    body { font-family: sans-serif; background-color: #f6f9fc; padding: 40px 0; margin: 0; }
                    .container { background-color: white; border-radius: 8px; margin: 0 auto; padding: 20px; max-width: 600px; border-top: 4px solid #4CAF50; }
                    .heading { font-size: 24px; font-weight: bold; text-align: center; color: #333; margin: 32px 0 0 0; }
                    .text { font-size: 16px; line-height: 24px; color: #333; margin-top: 24px; }
                    .button-section { text-align: center; margin: 32px 0; }
                    .button { background-color: #4F46E5; border-radius: 8px; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; display: inline-block; box-sizing: border-box; }
                    .small-text { font-size: 14px; line-height: 24px; color: #666; }
                    .footer-text { font-size: 12px; line-height: 16px; color: #8898aa; text-align: center; margin: 0; }
                    .footer-link { color: #8898aa; text-decoration: underline; }
                    hr { border: none; border-top: 1px solid #e6ebf1; margin: 24px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="heading">%s</h1> <!-- Heading -->
                    <p class="text">%s</p> <!-- Greeting -->
                    <p class="text">%s</p> <!-- Paragraph 1 -->
                    <p class="text">%s</p> <!-- Paragraph 2 -->
                    <div class="button-section">
                        <a href="%s" class="button">%s</a> <!-- Button URL & Text -->
                    </div>
                    <p class="small-text">%s</p> <!-- Expiry Info -->
                    <hr/>
                    <p class="small-text" style="font-style: italic;">%s</p> <!-- Ignore Info -->
                    <div style="margin-top: 32px;">
                        <p class="footer-text">ExpenSage, Smart Expense Tracking. © %d ExpenSage Inc.</p> <!-- Footer Year -->
                        <p class="footer-text">123 Finance Street, Suite 100, San Francisco, CA 94107</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            emailTitle,
            heading,
            greeting,
            p1,
            p2,
            buttonUrl,
            buttonText,
            expiryInfo,
            ignoreInfo,
            LocalDateTime.now().getYear()
        );
    }

}