package com.expensesage.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.expensesage.service.EmailService; // Keep exception import
import com.expensesage.model.User; // Import User model

import kong.unirest.HttpResponse;
import kong.unirest.JsonNode;
import kong.unirest.Unirest;
import kong.unirest.UnirestException;

@Service
public class MailgunEmailService implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(MailgunEmailService.class);

    @Value("${mailgun.api.key}")
    private String mailgunApiKey;

    @Value("${mailgun.domain}")
    private String mailgunDomain;

    @Value("${mailgun.sender.email}")
    private String senderEmail;

    @Override
    public void sendSimpleMessage(String to, String subject, String text) {
        logger.info("Attempting to send simple text email via Mailgun to: {}, Subject: {}", to, subject);
        try {
            HttpResponse<JsonNode> request = Unirest.post("https://api.mailgun.net/v3/" + mailgunDomain + "/messages")
                    .basicAuth("api", mailgunApiKey)
                    .field("from", senderEmail)
                    .field("to", to)
                    .field("subject", subject)
                    .field("text", text)
                    .asJson();

            logMailgunResponse(request, to);
        } catch (UnirestException e) {
            logger.error("Error sending Mailgun text email to {}: {}", to, e.getMessage(), e);
        }
    }

    @Override
    public void sendInvitationEmail(String recipientEmail, User sender) {
        String senderName = sender != null ? sender.getName() : "Someone";
        // TODO: Generate a real, unique invite link/token
        String inviteLink = "https://expensage.com/invite/placeholder"; // Placeholder link
        String subject = senderName + " invited you to join ExpenseSage!";

        // Approximate HTML structure based on the React template
        String htmlBody = String.format("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
                <style>
                    body { font-family: sans-serif; background-color: #f6f9fc; margin: 0; padding: 40px 0; }
                    .container { background-color: white; border-radius: 8px; margin: 0 auto; padding: 20px; max-width: 600px; border: 1px solid #e6ebf1; }
                    .heading { font-size: 24px; font-weight: bold; text-align: center; color: #333; margin: 32px 0 0 0; }
                    .text { font-size: 16px; line-height: 24px; color: #333; margin: 16px 0; }
                    .text-sm { font-size: 14px; line-height: 24px; color: #666; }
                    .text-xs { font-size: 12px; line-height: 16px; color: #666; }
                    .text-footer { font-size: 12px; line-height: 16px; color: #8898aa; text-align: center; margin: 0; }
                    .button { background-color: #4F46E5; border-radius: 8px; color: white !important; font-weight: bold; padding: 12px 24px; text-decoration: none; display: inline-block; text-align: center; box-sizing: border-box; }
                    .center { text-align: center; margin-top: 32px; margin-bottom: 32px; }
                    .list-item { font-size: 14px; line-height: 24px; color: #666; margin-left: 8px; margin-bottom: 4px; list-style: none; padding-left: 0;} /* Adjusted list style */
                    hr { border: none; border-top: 1px solid #e6ebf1; margin: 24px 0; }
                    a { color: #4F46E5; text-decoration: none; }
                    .footer-link { color: #8898aa; text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="heading">You're invited to ExpenSage!</h1>
                    <p class="text">Hello,</p>
                    <p class="text"><strong>%s</strong> has invited you to use ExpenSage for smart expense tracking and management.</p>
                    <p class="text">ExpenSage helps teams streamline expense reporting, track budgets, and gain insights into spending patterns—all in one place.</p>
                    <div class="center">
                        <a href="%s" class="button">Accept Invitation</a>
                    </div>
                    <p class="text"><strong>With ExpenSage, you can:</strong></p>
                    <ul>
                        <li class="list-item">• Capture receipts instantly with our mobile app</li>
                        <li class="list-item">• Submit expense reports in minutes, not hours</li>
                        <li class="list-item">• Track team spending in real-time</li>
                        <li class="list-item">• Integrate with your accounting software</li>
                    </ul>
                    <p class="text-sm">This invitation link is valid for a limited time. If you need a new invitation, please ask %s to send you another one.</p>
                    <hr />
                    <p class="text-xs italic">If you believe this invitation was sent in error, you can safely ignore this email.</p>
                    <div style="margin-top: 32px;">
                        <p class="text-footer">ExpenSage, Smart Expense Tracking. © %d ExpenSage Inc.</p>
                        <p class="text-footer">123 Finance Street, Suite 100, San Francisco, CA 94107</p>
                        <!-- Unsubscribe link needs a real URL -->
                        <!-- <p class="text-footer"><a href="{{unsubscribeLink}}" class="footer-link">Unsubscribe</a></p> -->
                    </div>
                </div>
            </body>
            </html>
            """,
            subject, senderName, inviteLink, senderName, java.time.Year.now().getValue()
        );

        logger.info("Sending HTML invitation email from {} to {}", senderName, recipientEmail);
        sendHtmlMessage(recipientEmail, subject, htmlBody); // Use the HTML message sender
    }

    @Override
    public void sendHtmlMessage(String to, String subject, String htmlBody) {
        logger.info("Attempting to send HTML email via Mailgun to: {}, Subject: {}", to, subject);
        try {
            HttpResponse<JsonNode> request = Unirest.post("https://api.mailgun.net/v3/" + mailgunDomain + "/messages")
                    .basicAuth("api", mailgunApiKey)
                    .field("from", senderEmail)
                    .field("to", to)
                    .field("subject", subject)
                    .field("html", htmlBody) // Use 'html' field for HTML content
                    .asJson();

            logMailgunResponse(request, to);
        } catch (UnirestException e) {
            logger.error("Error sending Mailgun HTML email to {}: {}", to, e.getMessage(), e);
        }
    }

    // Helper method to log response
    private void logMailgunResponse(HttpResponse<JsonNode> response, String recipient) {
        if (response.isSuccess()) {
            logger.info("Mailgun email sent successfully to {}. Status: {}, Response: {}", recipient, response.getStatus(), response.getBody() != null ? response.getBody().toString() : "N/A");
        } else {
            logger.error("Failed to send Mailgun email to {}. Status: {}, Response: {}",
                    recipient, response.getStatus(), response.getBody() != null ? response.getBody().toString() : "N/A");
        }
    }
}