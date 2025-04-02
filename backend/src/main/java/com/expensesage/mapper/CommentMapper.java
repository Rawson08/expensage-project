package com.expensesage.mapper;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.expensesage.dto.CommentResponseDto;
import com.expensesage.model.Comment;

@Component
public class CommentMapper {

    @Autowired
    private UserMapper userMapper;

    public CommentResponseDto toCommentResponseDto(Comment comment) {
        if (comment == null) {
            return null;
        }

        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .author(userMapper.toUserResponse(comment.getAuthor())) // Map author
                .expenseId(comment.getExpense() != null ? comment.getExpense().getId() : null) // Get expense ID
                .build();
    }

    public List<CommentResponseDto> toCommentResponseDtoList(List<Comment> comments) {
        return comments.stream()
                .map(this::toCommentResponseDto)
                .collect(Collectors.toList());
    }
}