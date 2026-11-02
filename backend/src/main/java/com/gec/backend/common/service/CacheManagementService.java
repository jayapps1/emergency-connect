package com.gec.backend.common.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.config.CacheConfig;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CacheManagementService {

    private final CacheManager cacheManager;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public CacheManagementService(CacheManager cacheManager, AdminScopeService scopeService, AuditService auditService) {
        this.cacheManager = cacheManager;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public List<Map<String, Object>> getCacheMetrics() {
        if (!scopeService.isSystemAdmin()) {
            throw new AccessDeniedException("Only System Administrators can access cache diagnostics.");
        }

        List<Map<String, Object>> metrics = new ArrayList<>();
        for (String cacheName : cacheManager.getCacheNames()) {
            Cache cache = cacheManager.getCache(cacheName);
            Map<String, Object> statMap = new HashMap<>();
            statMap.put("cacheName", cacheName);
            statMap.put("provider", "Caffeine");

            if (cache instanceof CaffeineCache caffeineCache) {
                com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache = caffeineCache.getNativeCache();
                CacheStats stats = nativeCache.stats();
                statMap.put("estimatedSize", nativeCache.estimatedSize());
                statMap.put("hitCount", stats.hitCount());
                statMap.put("missCount", stats.missCount());
                statMap.put("hitRate", String.format("%.2f%%", stats.hitRate() * 100));
                statMap.put("evictionCount", stats.evictionCount());
            } else {
                statMap.put("estimatedSize", 0);
                statMap.put("hitCount", 0);
                statMap.put("missCount", 0);
                statMap.put("hitRate", "0.00%");
                statMap.put("evictionCount", 0);
            }
            metrics.add(statMap);
        }
        return metrics;
    }

    public Map<String, Object> clearCache(String cacheName) {
        if (!scopeService.isSystemAdmin()) {
            throw new AccessDeniedException("Only System Administrators can clear application caches.");
        }

        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            auditService.logAction(
                scopeService.getCurrentPrincipal().getId(),
                "CACHE_EVICTED",
                "SYSTEM_CACHE",
                null,
                null,
                "Cleared application cache: " + cacheName,
                null,
                null
            );
            return Map.of("cacheName", cacheName, "cleared", true);
        }
        return Map.of("cacheName", cacheName, "cleared", false);
    }

    public Map<String, Object> clearAllCaches() {
        if (!scopeService.isSystemAdmin()) {
            throw new AccessDeniedException("Only System Administrators can clear application caches.");
        }

        for (String cacheName : cacheManager.getCacheNames()) {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        }

        auditService.logAction(
            scopeService.getCurrentPrincipal().getId(),
            "ALL_CACHES_EVICTED",
            "SYSTEM_CACHE",
            null,
            null,
            "Cleared all application reference caches",
            null,
            null
        );

        return Map.of("clearedAll", true, "cacheCount", cacheManager.getCacheNames().size());
    }
}
