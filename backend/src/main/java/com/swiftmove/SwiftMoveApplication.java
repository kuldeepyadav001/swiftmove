package com.swiftmove;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
@EnableAsync
public class SwiftMoveApplication {
    public static void main(String[] args) {
        Path cwd = Paths.get(System.getProperty("user.dir"));
        Path envFile = cwd.resolve(".env");

        if (!Files.exists(envFile)) {
            envFile = cwd.resolve("backend").resolve(".env");
        }

        if (!Files.exists(envFile)) {
            envFile = cwd.resolve("swiftmove-Backend").resolve(".env");
        }

        var builder = Dotenv.configure()
                .ignoreIfMissing()
                .systemProperties();

        if (Files.exists(envFile)) {
            builder.directory(envFile.getParent().toString())
                    .filename(envFile.getFileName().toString());
        }

        builder.load();
        SpringApplication.run(SwiftMoveApplication.class, args);
    }
}
