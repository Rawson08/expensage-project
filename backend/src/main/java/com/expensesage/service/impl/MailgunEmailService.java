package com.expensesage.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.expensesage.service.EmailService; // Keep exception import

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