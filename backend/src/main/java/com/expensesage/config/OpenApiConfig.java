package com.expensesage.config;

// import io.swagger.v3.oas.models.Components;
// import io.swagger.v3.oas.models.OpenAPI;
// import io.swagger.v3.oas.models.info.Info;
// import io.swagger.v3.oas.models.security.SecurityRequirement;
// import io.swagger.v3.oas.models.security.SecurityScheme;
// import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

        /*
         * @Bean
         * public OpenAPI customOpenAPI() {
         * final String securitySchemeName = "bearerAuth"; // Can be any name
         * 
         * return new OpenAPI()
         * .info(new Info()
         * .title("ExpenseSage API")
         * .version("v1.0")
         * .description("API for managing expenses, groups, and balances, similar to Splitwise."
         * ))
         * // Add security scheme component
         * .components(new Components()
         * .addSecuritySchemes(securitySchemeName, new SecurityScheme()
         * .name(securitySchemeName)
         * .type(SecurityScheme.Type.HTTP) // Type is HTTP
         * .scheme("bearer") // Scheme is Bearer
         * .bearerFormat("JWT") // Format is JWT
         * )
         * )
         * // Add security requirement globally (applies Bearer auth to all endpoints
         * except explicitly excluded)
         * .addSecurityItem(new SecurityRequirement().addList(securitySchemeName));
         * }
         */
}