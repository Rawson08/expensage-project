# Stage 1: Build the application using Maven
FROM maven:3.9-eclipse-temurin-17 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven wrapper files (if using mvnw) - Optional but good practice
# COPY .mvn/ .mvn
# COPY mvnw pom.xml ./
# If not using wrapper, just copy pom.xml
COPY pom.xml ./

# Download dependencies (this layer is cached if pom.xml doesn't change)
RUN mvn dependency:go-offline -B

# Copy the source code
COPY src ./src

# Build the application JAR
# Use mvnw if copied, otherwise use mvn
# RUN ./mvnw package -DskipTests
RUN mvn package -DskipTests

# Stage 2: Create the final image using a minimal JRE
FROM eclipse-temurin:17-jre-jammy

# Set the working directory
WORKDIR /app

# Define arguments for user/group (optional, good practice for security)
ARG APP_USER=expensesage
ARG APP_GROUP=expensesage
ARG UID=1001
ARG GID=1001

# Create group and user
RUN groupadd -g ${GID} ${APP_GROUP} || true && \
    useradd -u ${UID} -g ${APP_GROUP} -m -s /bin/sh ${APP_USER}

# Copy the JAR file from the build stage
# Adjust the JAR file name if your artifactId/version is different in pom.xml
COPY --from=build /app/target/expensesage-0.0.1-SNAPSHOT.jar app.jar

# Change ownership to the non-root user
RUN chown ${APP_USER}:${APP_GROUP} app.jar

# Switch to the non-root user
USER ${APP_USER}

# Expose the port the application runs on (defined in application.properties)
EXPOSE 8081

# Command to run the application, adding JVM argument to open invoke package for Mailgun lib
ENTRYPOINT ["java", "--add-opens", "java.base/java.lang.invoke=ALL-UNNAMED", "-jar", "/app/app.jar"]

# Optional: Add healthcheck
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://localhost:8081/actuator/health || exit 1
# Note: Requires adding spring-boot-starter-actuator dependency to pom.xml