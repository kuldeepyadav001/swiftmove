# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM maven:3.9.16-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom first for better Docker layer caching
COPY pom.xml .
RUN mvn -B -DskipTests dependency:go-offline

# Copy source and build the Spring Boot jar
COPY src ./src
RUN mvn -B -DskipTests package

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Optional, useful for debugging inside the container
RUN addgroup -S swiftmove && adduser -S swiftmove -G swiftmove

COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8080
ENV JAVA_OPTS=""

USER swiftmove
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
