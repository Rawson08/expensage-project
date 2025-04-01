package com.expensesage.service;

import com.expensesage.dto.ForgotPasswordRequest;
import com.expensesage.dto.JwtResponse;
import com.expensesage.dto.LoginRequest;
import com.expensesage.dto.RegisterRequest;
import com.expensesage.dto.ResetPasswordRequest;
import com.expensesage.dto.ResendVerificationRequest; // Added import
import com.expensesage.model.User;

public interface AuthService {
    /**
     * Registers a new user in the system and sends a verification email.
     *
     * @param registerRequest DTO containing registration details (name, email, password).
     * @return The newly created User entity.
     * @throws RuntimeException if the email is already taken.
     */
    User registerUser(RegisterRequest registerRequest);

    /**
     * Authenticates a user and generates a JWT token upon successful login.
     * Requires email to be verified.
     *
     * @param loginRequest DTO containing login credentials (email, password).
     * @return A JwtResponse containing the token and user details.
     * @throws org.springframework.security.core.AuthenticationException if authentication fails.
     * @throws RuntimeException if the user's email is not verified or user not found.
     */
    JwtResponse loginUser(LoginRequest loginRequest);

    /**
     * Verifies a user's email address using the provided token.
     *
     * @param token The verification token sent to the user's email.
     * @return true if verification is successful, false otherwise.
     */
    boolean verifyUser(String token);

    /**
     * Initiates the password reset process for a given email address.
     * Generates a reset token, saves it to the user, and sends a password reset email.
     * Does not throw an error if the email doesn't exist to prevent user enumeration.
     *
     * @param forgotPasswordRequest DTO containing the user's email.
     */
    void forgotPassword(ForgotPasswordRequest forgotPasswordRequest);

    /**
     * Resets the user's password using a valid reset token.
     *
     * @param resetPasswordRequest DTO containing the token and the new password.
     * @return true if the password was successfully reset, false otherwise (e.g., token invalid/expired).
     */
    boolean resetPassword(ResetPasswordRequest resetPasswordRequest);

    /**
     * Resends the verification email to the specified user.
     * Generates a new token and expiry if the user exists and is not already verified.
     * Does not throw an error if the email doesn't exist or is already verified.
     *
     * @param resendRequest DTO containing the user's email.
     */
    void resendVerificationEmail(ResendVerificationRequest resendRequest);

}