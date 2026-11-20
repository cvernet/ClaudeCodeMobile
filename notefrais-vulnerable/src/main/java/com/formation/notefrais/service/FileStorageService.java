package com.formation.notefrais.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

/** Stockage des justificatifs (tickets, factures) sur le disque. */
@Service
public class FileStorageService {

    private final File uploadDir;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) {
        this.uploadDir = new File(uploadDir);
        this.uploadDir.mkdirs();
    }

    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        File target = new File(uploadDir, file.getOriginalFilename());
        file.transferTo(target.getAbsoluteFile());
        return file.getOriginalFilename();
    }

    public byte[] load(String filename) throws IOException {
        File f = new File(uploadDir, filename);
        return Files.readAllBytes(f.toPath());
    }
}
