package com.expensesage.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.AddMemberRequest;
import com.expensesage.dto.GroupCreateRequest;
import com.expensesage.dto.JwtResponse;
import com.expensesage.dto.LoginRequest;
import com.expensesage.model.Group;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.GroupService;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GroupControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private GroupService groupService; // Inject service for setup

    private String tokenUser1;
    private String tokenUser2;
    private User user1;
    private User user2;
    // Removed unused user3 field

    @BeforeEach
    @SuppressWarnings("unused") // Suppress hint as setup is used by tests accessing fields
    void setUp() throws Exception {
        // Create users (add nulls for new password reset fields)
        user1 = userRepository.save(new User(null, "AliceGrp", "alice-grp-int@example.com", passwordEncoder.encode("pwd1"), null, true, null, null, null, null));
        user2 = userRepository.save(new User(null, "BobGrp", "bob-grp-int@example.com", passwordEncoder.encode("pwd2"), null, true, null, null, null, null));
        // Removed assignment to unused user3

        // Login users to get tokens
        tokenUser1 = loginAndGetToken("alice-grp-int@example.com", "pwd1");
        tokenUser2 = loginAndGetToken("bob-grp-int@example.com", "pwd2");
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

    @Test
    void createGroup_Success() throws Exception {
        GroupCreateRequest request = new GroupCreateRequest("Trip Group");

        mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Trip Group")))
                .andExpect(jsonPath("$.members", hasSize(1)))
                .andExpect(jsonPath("$.members[0].id", is(user1.getId().intValue())));
    }

    @Test
    void getMyGroups_Success() throws Exception {
        groupService.createGroup("Alice Group 1", user1);
        groupService.createGroup("Alice Group 2", user1);
        groupService.createGroup("Bob Group", user2);

        mockMvc.perform(get("/api/groups")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void getGroupDetails_Success() throws Exception {
         Group group = groupService.createGroup("Detailed Group", user1);
         // Use the updated service method signature
         groupService.addMemberToGroup(group.getId(), new AddMemberRequest(user2.getEmail()), user1);

         mockMvc.perform(get("/api/groups/" + group.getId())
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Detailed Group")))
                .andExpect(jsonPath("$.members", hasSize(2)));

          mockMvc.perform(get("/api/groups/" + group.getId())
                        .header("Authorization", "Bearer " + tokenUser2))
                .andExpect(status().isOk());
    }

     @Test
    void getGroupDetails_Forbidden_NotMember() throws Exception {
         Group group = groupService.createGroup("Private Group", user1);

         mockMvc.perform(get("/api/groups/" + group.getId())
                        .header("Authorization", "Bearer " + tokenUser2))
                .andExpect(status().isForbidden());
    }

    @Test
    void addMember_Success() throws Exception {
        Group group = groupService.createGroup("Add Member Test", user1);
        // Use the correct constructor for AddMemberRequest
        AddMemberRequest request = new AddMemberRequest(user2.getEmail());

        mockMvc.perform(post("/api/groups/" + group.getId() + "/members")
                        .header("Authorization", "Bearer " + tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members", hasSize(2)))
                .andExpect(jsonPath("$.members[?(@.id == " + user2.getId() + ")]", hasSize(1)));
    }

     @Test
    void addMember_AlreadyMember_BadRequest() throws Exception {
        Group group = groupService.createGroup("Already Member Test", user1);
        // Use the updated service method signature
        groupService.addMemberToGroup(group.getId(), new AddMemberRequest(user2.getEmail()), user1);
        // Use the correct constructor for AddMemberRequest
        AddMemberRequest request = new AddMemberRequest(user2.getEmail());

        mockMvc.perform(post("/api/groups/" + group.getId() + "/members")
                        .header("Authorization", "Bearer " + tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("User is already a member")));
    }

    @Test
    void removeMember_Success() throws Exception {
         Group group = groupService.createGroup("Remove Member Test", user1);
         // Use the updated service method signature
         groupService.addMemberToGroup(group.getId(), new AddMemberRequest(user2.getEmail()), user1);

         mockMvc.perform(delete("/api/groups/" + group.getId() + "/members/" + user2.getId())
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members", hasSize(1)))
                .andExpect(jsonPath("$.members[0].id", is(user1.getId().intValue())));
    }

     @Test
    void removeMember_RemoveLastMember_BadRequest() throws Exception {
         Group group = groupService.createGroup("Last Member Test", user1);

         mockMvc.perform(delete("/api/groups/" + group.getId() + "/members/" + user1.getId())
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Cannot remove the last member")));
    }
}