package com.expensesage.service;

import com.expensesage.model.User;

/**
 * Service interface for handling email sending operations.
 */
public interface EmailService {

    /**
     * Sends an invitation email to a potential new user.
     *
     * @param recipientEmail The email address to send the invitation to.
     * @param sender         The user who is sending the invitation.
     */
    void sendInvitationEmail(String recipientEmail, User sender);

    /**
     * Sends a simple plain text email.
     *
     * @param to      The recipient's email address.
     * @param subject The email subject.
     * @param text    The plain text body of the email.
     */
    void sendSimpleMessage(String to, String subject, String text);

    /**
     * Sends an email with HTML content.
     *
     * @param to       The recipient's email address.
     * @param subject  The email subject.
     * @param htmlBody The HTML body of the email.
     */
    void sendHtmlMessage(String to, String subject, String htmlBody);

}