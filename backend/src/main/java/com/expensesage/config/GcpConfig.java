package com.expensesage.config;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vision.v1.ImageAnnotatorClient;

@Configuration
public class GcpConfig {

    private static final Logger logger = LoggerFactory.getLogger(GcpConfig.class);

    // Keep properties needed for client configuration
    @Value("${gcp.vertex.ai.location}")
    private String vertexAiLocation;

    @Value("${gcp.project.id}")
    private String gcpProjectId;

    // Removed ResourceLoader injection and credentials path value

    // Removed explicit googleCredentials() bean method.
    // Clients will now use Application Default Credentials (ADC).

    @Bean
    public ImageAnnotatorClient imageAnnotatorClient() throws IOException {
        logger.info("Creating ImageAnnotatorClient bean using ADC");
        // Let the client library find credentials automatically (e.g., via GOOGLE_APPLICATION_CREDENTIALS)
        try {
             return ImageAnnotatorClient.create();
        } catch (IOException e) {
            logger.error("Failed to create ImageAnnotatorClient using ADC", e);
            throw e;
        }
    }

    @Bean
    public VertexAI vertexAIClient() { // Removed throws IOException
        logger.info("Creating VertexAI bean for project {} in location {} using ADC", gcpProjectId, vertexAiLocation);
         // Let the client library find credentials automatically
         // Constructor does not throw IOException
        return new VertexAI(gcpProjectId, vertexAiLocation);
    }

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jsonCustomizer() {
        logger.info("Registering JavaTimeModule for Jackson ObjectMapper");
        return builder -> {
            builder.modules(new JavaTimeModule());
            builder.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        };
    }
}