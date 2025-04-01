package com.expensesage.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is; // Added import
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content; // Ensure cleanup
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.LoginRequest;
import com.expensesage.dto.RegisterRequest;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest // Load the full application context
@AutoConfigureMockMvc // Configure MockMvc for sending HTTP requests
@Transactional // Roll back transactions after each test to keep tests isolated
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc; // For simulating HTTP requests

    @Autowired
    private ObjectMapper objectMapper; // For converting objects to/from JSON

    @Autowired
    private UserRepository userRepository; // To interact with the DB directly for setup/assertions

    @Autowired
    private PasswordEncoder passwordEncoder; // To hash passwords for setup

    @BeforeEach
    void setUp() {
        // Clean up potentially existing users before each test if needed,
        // but @Transactional should handle this.
        // userRepository.deleteAll();
    }

    @Test
    void registerUser_Success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest("New User", "newuser@example.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated()) // Expect HTTP 201 Created
                .andExpect(jsonPath("$.id", is(notNullValue()))) // Expect an ID in the response
                .andExpect(jsonPath("$.name", is("New User")))
                .andExpect(jsonPath("$.email", is("newuser@example.com")));

        // Verify user exists in DB
        assertTrue(userRepository.findByEmail("newuser@example.com").isPresent());
    }

    @Test
    void registerUser_EmailAlreadyExists_ReturnsBadRequest() throws Exception {
        // Arrange: Create an existing user (add nulls for new password reset fields)
        userRepository.save(new User(null, "Existing User", "existing@example.com", passwordEncoder.encode("password"), null, true, null, null, null, null));

        RegisterRequest registerRequest = new RegisterRequest("Another User", "existing@example.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest()) // Expect HTTP 400 Bad Request
                .andExpect(content().string(containsString("Error: Email is already in use!")));
    }

     @Test
    void registerUser_InvalidInput_ReturnsBadRequest() throws Exception {
        // Arrange: Invalid email, short password
        RegisterRequest registerRequest = new RegisterRequest("Nu", "invalid-email", "pass");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest()) // Expect HTTP 400 Bad Request due to validation
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                // Check for presence of expected validation errors
                .andExpect(jsonPath("$.details", hasItems(
                    // containsString("name:"), // Name "Nu" is valid (2 chars)
                    containsString("email: Invalid email format"),
                    containsString("password: Password must be at least 6 characters long") // Updated validation message
                )));
    }


    @Test
    void loginUser_Success() throws Exception {
         // Arrange: Create an existing user (add nulls for new password reset fields)
        String rawPassword = "password123";
        userRepository.save(new User(null, "Login User", "login@example.com", passwordEncoder.encode(rawPassword), null, true, null, null, null, null));

        LoginRequest loginRequest = new LoginRequest("login@example.com", rawPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk()) // Expect HTTP 200 OK
                .andExpect(jsonPath("$.token", is(notNullValue()))) // Expect a JWT token
                .andExpect(jsonPath("$.type", is("Bearer")))
                .andExpect(jsonPath("$.email", is("login@example.com")))
                .andExpect(jsonPath("$.name", is("Login User")));
    }

    @Test
    void loginUser_IncorrectPassword_ReturnsUnauthorized() throws Exception {
         // Arrange: Create an existing user (add nulls for new password reset fields)
        String correctPassword = "password123";
        userRepository.save(new User(null, "Login User", "loginfail@example.com", passwordEncoder.encode(correctPassword), null, true, null, null, null, null));

        LoginRequest loginRequest = new LoginRequest("loginfail@example.com", "wrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized()) // Expect HTTP 401 Unauthorized
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", is("Bad credentials"))); // Check exact message
    }

     @Test
    void loginUser_UserNotFound_ReturnsUnauthorized() throws Exception {
        // Arrange: User does not exist
        LoginRequest loginRequest = new LoginRequest("nosuchuser@example.com", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized()) // Expect HTTP 401 Unauthorized
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", is("User not found with email: nosuchuser@example.com"))); // Check exact message
    }
}