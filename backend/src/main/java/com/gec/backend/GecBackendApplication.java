package com.gec.backend;

import com.gec.backend.messaging.arkesel.ArkeselProperties;
import com.gec.backend.messaging.arkesel.GecOtpProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({ArkeselProperties.class, GecOtpProperties.class})
public class GecBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(GecBackendApplication.class, args);
    }
}
