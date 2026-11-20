FROM maven:3.8-openjdk-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

# Serveur d'applications de production : Tomcat 9 / JDK 17
FROM tomcat:9.0.60-jdk17-temurin
RUN rm -rf /usr/local/tomcat/webapps/*
COPY --from=build /src/target/notefrais-1.0.0.war /usr/local/tomcat/webapps/ROOT.war
ENV UPLOAD_DIR=/usr/local/tomcat/uploads REPORT_DIR=/usr/local/tomcat/reports
EXPOSE 8080
CMD ["catalina.sh", "run"]
