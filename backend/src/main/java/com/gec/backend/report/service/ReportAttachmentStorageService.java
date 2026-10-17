package com.gec.backend.report.service;

import com.gec.backend.common.exception.ResourceNotFoundException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class ReportAttachmentStorageService {

    private final Path storageDirectory = Paths.get("uploads", "report_attachments").toAbsolutePath().normalize();

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime", "video/x-matroska");

    private static final long MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    private static final long MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

    public ReportAttachmentStorageService() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize report attachment storage directory", e);
        }
    }

    public String storeFile(MultipartFile file, String mediaType) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty attachment file.");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        long fileSize = file.getSize();

        if ("IMAGE".equalsIgnoreCase(mediaType)) {
            if (!ALLOWED_IMAGE_TYPES.contains(contentType) && !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Unsupported image format. Allowed: JPEG, PNG, WEBP.");
            }
            if (fileSize > MAX_IMAGE_SIZE_BYTES) {
                throw new IllegalArgumentException("Image file exceeds maximum limit of 10 MB.");
            }
        } else if ("VIDEO".equalsIgnoreCase(mediaType)) {
            if (!ALLOWED_VIDEO_TYPES.contains(contentType) && !contentType.startsWith("video/")) {
                throw new IllegalArgumentException("Unsupported video format. Allowed: MP4, WEBM, MOV.");
            }
            if (fileSize > MAX_VIDEO_SIZE_BYTES) {
                throw new IllegalArgumentException("Video file exceeds maximum limit of 50 MB.");
            }
        } else {
            throw new IllegalArgumentException("Invalid media type. Expected IMAGE or VIDEO.");
        }

        String storageKey = UUID.randomUUID().toString() + ".bin";
        Path destination = storageDirectory.resolve(storageKey).normalize();

        if (!destination.getParent().equals(storageDirectory)) {
            throw new IllegalArgumentException("Cannot store file outside current storage directory.");
        }

        try {
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return storageKey;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store report attachment file.", e);
        }
    }

    public Resource loadAttachmentResource(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new ResourceNotFoundException("Attachment file not found.");
        }

        Path file = storageDirectory.resolve(storageKey).normalize();
        if (!file.getParent().equals(storageDirectory) || !Files.exists(file) || !Files.isReadable(file)) {
            throw new ResourceNotFoundException("Attachment file not found: " + storageKey);
        }

        return new FileSystemResource(file.toFile());
    }
}
