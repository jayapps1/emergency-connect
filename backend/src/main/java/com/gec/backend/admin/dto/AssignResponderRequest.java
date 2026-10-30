package com.gec.backend.admin.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class AssignResponderRequest {

    @NotNull
    private UUID responderUserId;

    private String note;

    public AssignResponderRequest() {}

    public AssignResponderRequest(UUID responderUserId, String note) {
        this.responderUserId = responderUserId;
        this.note = note;
    }

    public UUID getResponderUserId() { return responderUserId; }
    public void setResponderUserId(UUID responderUserId) { this.responderUserId = responderUserId; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
