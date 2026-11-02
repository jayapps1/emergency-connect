package com.gec.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Caches stable reference data while write operations evict related entries so
 * public and administrative reads remain fast without serving stale updates.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String CACHE_PUBLIC_AGENCIES = "publicAgencies";
    public static final String CACHE_PUBLIC_STATIONS = "publicStationsByAgency";
    public static final String CACHE_INCIDENT_CATEGORIES = "incidentCategories";
    public static final String CACHE_SAFETY_INFO = "safetyInformation";
    public static final String CACHE_ROLES = "roles";
    public static final String CACHE_PERMISSIONS = "permissions";
    public static final String CACHE_STATIONS_BY_REGION = "stationsByRegion";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCacheNames(List.of(
            CACHE_PUBLIC_AGENCIES,
            CACHE_PUBLIC_STATIONS,
            CACHE_INCIDENT_CATEGORIES,
            CACHE_SAFETY_INFO,
            CACHE_ROLES,
            CACHE_PERMISSIONS,
            CACHE_STATIONS_BY_REGION
        ));
        cacheManager.setCaffeine(
            Caffeine.newBuilder()
                .initialCapacity(100)
                .maximumSize(500)
                .expireAfterWrite(15, TimeUnit.MINUTES)
                .recordStats()
        );
        return cacheManager;
    }
}
