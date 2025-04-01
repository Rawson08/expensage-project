package com.expensesage.config;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class R2Config {

    @Value("${r2.endpoint.url}")
    private String endpointUrl;

    @Value("${r2.access.key.id}")
    private String accessKeyId;

    @Value("${r2.secret.access.key}")
    private String secretAccessKey;

    @Value("${r2.region}")
    private String region;

    @Bean
    public S3Client s3Client() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId, secretAccessKey);
        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(credentials);

        return S3Client.builder()
                .region(Region.of(region)) // Add region setting back
                .endpointOverride(URI.create(endpointUrl))
                .credentialsProvider(credentialsProvider)
                .build();
    }
}