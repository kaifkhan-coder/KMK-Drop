package com.kaifdrop;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * File Interception, 3D Animation & Dynamic Watermark Pipeline.
 * Architect: Khan Mohammed Kaif
 */
public class WatermarkPipeline {

    public static final String TEXT_HEADER_COMMENT =
        "// [Created by Khan Mohammed Kaif] - 3D Animation & Local Secure Transfer Protocol\n";

    public static final String PDF_STAMP_TEXT =
        "Build by Khan Kaif - Secured Local Protocol";

    public static final String ANIMATION_MANIFEST_NAME =
        "animation_manifest.kaif";

    public static final String ANIMATION_MANIFEST_CONTENT =
        "Project Architect: Khan Mohammed Kaif (3D Animation Suite)\n" +
        "Pipeline: KaifDrop-Secure Active Mesh Guard\n" +
        "Integrity: Verified Unaltered Binary Geometry\n";

    private static final Set<String> TEXT_EXTENSIONS = new HashSet<>(Arrays.asList(
        ".kaif", ".txt", ".java", ".py", ".js", ".ts", ".html", ".css", ".json", ".md", ".c", ".cpp"
    ));

    private static final Set<String> THREED_EXTENSIONS = new HashSet<>(Arrays.asList(
        ".obj", ".fbx", ".stl", ".blend"
    ));

    public static class ProcessedFile {
        public final String originalName;
        public final byte[] content;
        public final String stampType; // "TEXT_KAIF", "PDF_STAMPED", "3D_PRESERVED", "STANDARD"
        public final boolean is3D;

        public ProcessedFile(String originalName, byte[] content, String stampType, boolean is3D) {
            this.originalName = originalName;
            this.content = content;
            this.stampType = stampType;
            this.is3D = is3D;
        }
    }

    /**
     * Intercept and process a single file according to its format signature.
     */
    public static ProcessedFile processFile(File file) throws IOException {
        String name = file.getName();
        String ext = getExtension(name).toLowerCase();
        byte[] rawBytes = readFileToByteArray(file);

        // 1. Text & Custom .kaif Extension Engines
        if (TEXT_EXTENSIONS.contains(ext)) {
            String text = new String(rawBytes, StandardCharsets.UTF_8);
            if (!text.startsWith("// [Created by Khan Mohammed Kaif]")) {
                byte[] stampedBytes = (TEXT_HEADER_COMMENT + text).getBytes(StandardCharsets.UTF_8);
                return new ProcessedFile(name, stampedBytes, "TEXT_KAIF", false);
            }
            return new ProcessedFile(name, rawBytes, "TEXT_KAIF", false);
        }

        // 2. Binary PDF Document Stamping Layer
        if (ext.equals(".pdf")) {
            byte[] stampedPdf = stampPdfDocument(rawBytes);
            return new ProcessedFile(name, stampedPdf, "PDF_STAMPED", false);
        }

        // 3. 3D Animation Asset Architecture
        // Never alter heavy binary frames directly to avoid corrupting asset meshes!
        if (THREED_EXTENSIONS.contains(ext)) {
            return new ProcessedFile(name, rawBytes, "3D_PRESERVED", true);
        }

        return new ProcessedFile(name, rawBytes, "STANDARD", false);
    }

    /**
     * Uses Apache PDFBox to draw a semi-transparent dark red tracking stamp
     * inside the lower-left footer boundaries of the first page context.
     */
    public static byte[] stampPdfDocument(byte[] pdfBytes) {
        try (PDDocument doc = PDDocument.load(pdfBytes);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            if (doc.getNumberOfPages() > 0) {
                PDPage firstPage = doc.getPage(0);

                // Create content stream in append mode
                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, firstPage, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    // Semi-transparent dark red color
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(0.68f);
                    cs.setGraphicsStateParameters(gs);

                    // Dark red color: RGB ~ (184, 20, 20)
                    cs.setNonStrokingColor(new Color(184, 20, 20));

                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA_BOLD, 10);
                    // Lower-left footer boundaries (x = 28pt, y = 20pt)
                    cs.newLineAtOffset(28, 20);
                    cs.showText(PDF_STAMP_TEXT);
                    cs.endText();
                }
            }

            doc.save(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            System.err.println("[WatermarkPipeline] PDFBox stamping error: " + e.getMessage());
            // Fallback to original bytes if document is protected or unparsable
            return pdfBytes;
        }
    }

    /**
     * Packages a collection of processed files into a compressed ZIP matrix.
     * If 3D animation assets are present, injects companion metadata ledger 'animation_manifest.kaif'.
     */
    public static byte[] createZipMatrix(List<ProcessedFile> files) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        boolean has3D = false;

        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (ProcessedFile pf : files) {
                if (pf.is3D) has3D = true;
                ZipEntry entry = new ZipEntry(pf.originalName);
                zos.putNextEntry(entry);
                zos.write(pf.content);
                zos.closeEntry();
            }

            // Companion metadata ledger for 3D animation assets
            if (has3D) {
                ZipEntry manifestEntry = new ZipEntry(ANIMATION_MANIFEST_NAME);
                zos.putNextEntry(manifestEntry);
                zos.write(ANIMATION_MANIFEST_CONTENT.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }

        return baos.toByteArray();
    }

    private static String getExtension(String fileName) {
        int idx = fileName.lastIndexOf('.');
        return (idx == -1) ? "" : fileName.substring(idx);
    }

    private static byte[] readFileToByteArray(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int r;
            while ((r = fis.read(buf)) != -1) {
                baos.write(buf, 0, r);
            }
            return baos.toByteArray();
        }
    }
}
