// Types related to Group API requests

export interface GroupCreateRequest {
    name: string;
}

export interface AddMemberRequest {
    memberEmail: string;
}

// Add other group request types if needed