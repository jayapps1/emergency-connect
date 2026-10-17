package com.gec.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReportAttachmentResponseDto(
    UUID id,
    UUID reportId,
    String mediaType,
    String contentType,
    String originalFileName,
    long fileSizeBytes,
    LocalDateTime createdAt
) {}
