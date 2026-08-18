package com.swiftmove.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    // Shared RestTemplate for external calls (ORS geocoding/routing).
    // Without explicit timeouts, a slow/unresponsive 3rd-party API can hang
    // the request thread indefinitely — this was likely the cause of the
    // reported timeout complaints on fare calculation.
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);

        return new RestTemplate(factory);
    }
}