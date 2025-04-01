package com.expensesage.repository;

import com.expensesage.model.Group;
import com.expensesage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {

    // Find groups where a specific user is a member
    List<Group> findByMembersContains(User user);

    // You can add more custom query methods here later, e.g.,
    // Optional<Group> findByIdAndMembersContains(Long groupId, User user);
}