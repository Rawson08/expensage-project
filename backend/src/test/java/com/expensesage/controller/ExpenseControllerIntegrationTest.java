package com.expensesage.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType; // Import for multipart test
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.ExpenseCreateRequest;
import com.expensesage.dto.ExpenseResponseDto;
import com.expensesage.dto.JwtResponse;
import com.expensesage.dto.LoginRequest;
import com.expensesage.dto.PayerDetailDto;
import com.expensesage.dto.SplitDetailDto;
import com.expensesage.model.SplitType;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExpenseControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    // Removed unused expenseRepository field
    @Autowired private PasswordEncoder passwordEncoder;

    private String tokenUser1;
    private String tokenUser2;
    private User user1;
    private User user2;
    private User user3;

    @BeforeEach
    @SuppressWarnings("unused") // Suppress hint as setup is used by tests accessing fields
    void setUp() throws Exception {
        // Add nulls for new password reset fields in User constructor
        user1 = userRepository.save(new User(null, "AliceExp", "alice-exp-int@example.com", passwordEncoder.encode("pwd1"), null, true, null, null, null, null));
        user2 = userRepository.save(new User(null, "BobExp", "bob-exp-int@example.com", passwordEncoder.encode("pwd2"), null, true, null, null, null, null));
        user3 = userRepository.save(new User(null, "CharlieExp", "charlie-exp-int@example.com", passwordEncoder.encode("pwd3"), null, true, null, null, null, null));

        tokenUser1 = loginAndGetToken("alice-exp-int@example.com", "pwd1");
        tokenUser2 = loginAndGetToken("bob-exp-int@example.com", "pwd2");
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        LoginRequest loginRequest = new LoginRequest(email, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse jwtResponse = objectMapper.readValue(result.getResponse().getContentAsString(), JwtResponse.class);
        return jwtResponse.getToken();
    }

    // Helper to create payer list
    private List<PayerDetailDto> createPayers(User payer, BigDecimal amount) {
        return List.of(new PayerDetailDto(payer.getId(), amount));
    }

    @Test
    void createExpense_EqualSplit_Success() throws Exception {
        BigDecimal totalAmount = new BigDecimal("60.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount); // Alice pays
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), null),
                new SplitDetailDto(user3.getId(), null)
        );
        ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Test Dinner", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EQUAL, splits, null // Added null for notes
        );

        // Create JSON part for multipart request
        MockMultipartFile expenseDataPart = new MockMultipartFile(
            "expenseData", "", "application/json", objectMapper.writeValueAsString(request).getBytes());

        mockMvc.perform(multipart("/api/expenses") // Use multipart request builder
                        .file(expenseDataPart) // Add JSON data part
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description", is("Test Dinner")))
                .andExpect(jsonPath("$.amount", is(60.00)))
                .andExpect(jsonPath("$.payers", hasSize(1)))
                .andExpect(jsonPath("$.payers[0].user.id", is(user1.getId().intValue())))
                .andExpect(jsonPath("$.splits", hasSize(2)))
                .andExpect(jsonPath("$.splits[?(@.owedBy.id == " + user2.getId() + ")].amountOwed", contains(30.00)))
                .andExpect(jsonPath("$.splits[?(@.owedBy.id == " + user3.getId() + ")].amountOwed", contains(30.00)));
    }

     @Test
    void createExpense_ExactSplit_Success() throws Exception {
        BigDecimal totalAmount = new BigDecimal("50.00");
        List<PayerDetailDto> payers = createPayers(user2, totalAmount); // Bob pays
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user1.getId(), new BigDecimal("10.00")),
                new SplitDetailDto(user3.getId(), new BigDecimal("40.00"))
        );
        ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Test Groceries", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EXACT, splits, null
        );

         MockMultipartFile expenseDataPart = new MockMultipartFile(
            "expenseData", "", "application/json", objectMapper.writeValueAsString(request).getBytes());

        mockMvc.perform(multipart("/api/expenses")
                        .file(expenseDataPart)
                        .header("Authorization", "Bearer " + tokenUser2)) // Bob creates
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payers", hasSize(1)))
                .andExpect(jsonPath("$.payers[0].user.id", is(user2.getId().intValue())))
                .andExpect(jsonPath("$.splits", hasSize(2)))
                .andExpect(jsonPath("$.splits[?(@.owedBy.id == " + user1.getId() + ")].amountOwed", contains(10.00)))
                .andExpect(jsonPath("$.splits[?(@.owedBy.id == " + user3.getId() + ")].amountOwed", contains(40.00)));
    }

     @Test
    void createExpense_Unauthorized_Returns401() throws Exception {
         BigDecimal totalAmount = new BigDecimal("10.00");
         List<PayerDetailDto> payers = createPayers(user1, totalAmount);
         List<SplitDetailDto> splits = List.of(new SplitDetailDto(user2.getId(), null));
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Unauthorized Test", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EQUAL, splits, null
        );

         MockMultipartFile expenseDataPart = new MockMultipartFile(
            "expenseData", "", "application/json", objectMapper.writeValueAsString(request).getBytes());

         mockMvc.perform(multipart("/api/expenses").file(expenseDataPart)) // No Authorization header
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getExpenseById_Success() throws Exception {
         // Arrange: Create an expense first
         BigDecimal totalAmount = new BigDecimal("20.00");
         List<PayerDetailDto> payers = createPayers(user1, totalAmount);
         List<SplitDetailDto> splits = List.of(new SplitDetailDto(user2.getId(), null));
         ExpenseCreateRequest createRequest = new ExpenseCreateRequest(
                "Expense To Get", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EQUAL, splits, null
        );
         MockMultipartFile createDataPart = new MockMultipartFile(
            "expenseData", "", "application/json", objectMapper.writeValueAsString(createRequest).getBytes());

         MvcResult createResult = mockMvc.perform(multipart("/api/expenses")
                        .file(createDataPart)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isCreated())
                .andReturn();
         ExpenseResponseDto createdExpense = objectMapper.readValue(createResult.getResponse().getContentAsString(), ExpenseResponseDto.class);
         Long expenseId = (long) createdExpense.getId(); // Cast to Long

         // Act & Assert: Get the expense (Alice requesting)
         mockMvc.perform(get("/api/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(expenseId.intValue())))
                .andExpect(jsonPath("$.description", is("Expense To Get")));

         // Act & Assert: Get the expense (Bob requesting - should also work as he's involved)
          mockMvc.perform(get("/api/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + tokenUser2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(expenseId.intValue())));
    }

     @Test
    void getExpenseById_Forbidden() throws Exception {
         // Arrange: Create an expense involving only Alice and Bob
         BigDecimal totalAmount = new BigDecimal("20.00");
         List<PayerDetailDto> payers = createPayers(user1, totalAmount);
         List<SplitDetailDto> splits = List.of(new SplitDetailDto(user2.getId(), null));
         ExpenseCreateRequest createRequest = new ExpenseCreateRequest(
                "Private Expense", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EQUAL, splits, null
        );
         MockMultipartFile createDataPart = new MockMultipartFile(
            "expenseData", "", "application/json", objectMapper.writeValueAsString(createRequest).getBytes());

         MvcResult createResult = mockMvc.perform(multipart("/api/expenses")
                        .file(createDataPart)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isCreated())
                .andReturn();
         ExpenseResponseDto createdExpense = objectMapper.readValue(createResult.getResponse().getContentAsString(), ExpenseResponseDto.class);
         Long expenseId = (long) createdExpense.getId();

         // Act & Assert: Charlie tries to get the expense (should be forbidden)
         String tokenUser3 = loginAndGetToken("charlie-exp-int@example.com", "pwd3");
         mockMvc.perform(get("/api/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + tokenUser3))
                .andExpect(status().isForbidden());
    }

    // --- Add tests for getMyExpenses, getGroupExpenses, update, delete ---

}