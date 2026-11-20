FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/notefrais-1.0.0.jar app.jar
ENV UPLOAD_DIR=/app/uploads REPORT_DIR=/app/reports
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
