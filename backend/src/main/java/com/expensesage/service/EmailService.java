package com.expensesage.service;

public interface EmailService {

    /**
     * Sends a simple text email.
     *
     * @param to      The recipient's email address.
     * @param subject The email subject.
     * @param text    The email body content (plain text).
     */
    void sendSimpleMessage(String to, String subject, String text);

    /**
     * Sends an HTML email.
     *
     * @param to       The recipient's email address.
     * @param subject  The email subject.
     * @param htmlBody The email body content as an HTML string.
     */
    void sendHtmlMessage(String to, String subject, String htmlBody);
}