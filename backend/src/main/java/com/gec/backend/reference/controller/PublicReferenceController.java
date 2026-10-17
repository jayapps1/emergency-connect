package com.gec.backend.reference.controller;

import com.gec.backend.reference.entity.RegionRefEntity;
import com.gec.backend.reference.repository.RegionRefRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/regions")
public class PublicReferenceController {

    private final RegionRefRepository regionRepository;

    public PublicReferenceController(RegionRefRepository regionRepository) {
        this.regionRepository = regionRepository;
    }

    @GetMapping
    public ResponseEntity<List<RegionRefEntity>> getPublicRegions() {
        return ResponseEntity.ok(regionRepository.findByActiveTrueOrderByNameAsc());
    }
}
