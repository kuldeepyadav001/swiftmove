package com.swiftmove.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();

    @Data
    public static class Jwt {
        private String secret;
        private long expiration;
    }

    @Data
    public static class Cors {
        private String allowedOrigins;
    }
}