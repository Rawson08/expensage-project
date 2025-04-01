package com.expensesage.service.impl;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoField;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.expensesage.dto.OcrResultDto;
import com.expensesage.dto.ReceiptResponse;
import com.expensesage.service.ReceiptScanningService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.Content;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.api.Part;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.ResponseHandler;
import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.TextAnnotation;
import com.google.protobuf.ByteString;

@Service
public class ReceiptScanningServiceImpl implements ReceiptScanningService {

    private static final Logger logger = LoggerFactory.getLogger(ReceiptScanningServiceImpl.class);

    // Injected Beans and Properties
    private final ImageAnnotatorClient visionClient;
    private final VertexAI vertexAI;
    private final ObjectMapper objectMapper;
    private final String gcpProjectId;
    private final String vertexAiLocation;
    private final String vertexAiModelName;

    @Autowired
    public ReceiptScanningServiceImpl(
            ImageAnnotatorClient visionClient,
            VertexAI vertexAI,
            ObjectMapper objectMapper,
            @Value("${gcp.project.id}") String gcpProjectId,
            @Value("${gcp.vertex.ai.location}") String vertexAiLocation,
            @Value("${gcp.vertex.ai.model.name}") String vertexAiModelName) {
        this.visionClient = visionClient;
        this.vertexAI = vertexAI;
        this.objectMapper = objectMapper;
        this.gcpProjectId = gcpProjectId;
        this.vertexAiLocation = vertexAiLocation;
        this.vertexAiModelName = vertexAiModelName.startsWith("gemini-") ? vertexAiModelName : "gemini-1.0-pro-001";
    }

    // --- Patterns and Date Formatters (Keep as before) ---
    private static final Pattern AMOUNT_LINE_PATTERN = Pattern.compile(
        "^(.*?)(total|amount|balance|charge|due|subtotal|sub-total)[:\\s]*[$€£]?\\s*([\\d,]+\\.\\d{2})$", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
    private static final Pattern GENERIC_AMOUNT_PATTERN = Pattern.compile(
        "[$€£]?\\s*([\\d,]+\\.\\d{2})");
    private static final Pattern DATE_PATTERN = Pattern.compile(
        "(\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}|\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,]?\\s+\\d{1,2}[.,]?\\s+\\d{2,4})", Pattern.CASE_INSENSITIVE);
    private static final List<DateTimeFormatter> DATE_FORMATTERS = createDateFormatters();

    private static List<DateTimeFormatter> createDateFormatters() {
        DateTimeFormatter slashDashDotTwoOrFourYear = new DateTimeFormatterBuilder()
                .appendPattern("[M/d/][M-d-][M.d.][MM/dd/][MM-dd-][MM.dd.]")
                .optionalStart().appendPattern("yyyy").optionalEnd()
                .optionalStart().appendValueReduced(ChronoField.YEAR, 2, 2, Year.now().getValue() - 80).optionalEnd()
                .toFormatter(Locale.ENGLISH);
         DateTimeFormatter yearFirst = new DateTimeFormatterBuilder()
                .appendPattern("[yyyy/MM/dd][yyyy-MM-dd][yyyy.MM.dd]")
                .toFormatter(Locale.ENGLISH);
        DateTimeFormatter monthName = new DateTimeFormatterBuilder()
                .appendPattern("[MMM][MMMM]")
                .optionalStart().appendLiteral(".").optionalEnd()
                .appendLiteral(" ").appendPattern("d")
                .optionalStart().appendLiteral(",").optionalEnd()
                .appendLiteral(" ").appendPattern("[yyyy][yy]")
                .parseDefaulting(ChronoField.YEAR_OF_ERA, Year.now().getValue())
                .toFormatter(Locale.ENGLISH);
        return List.of(slashDashDotTwoOrFourYear, yearFirst, monthName);
    }


    @Override
    public OcrResultDto processReceipt(MultipartFile file) throws IOException {
        logger.info("Processing receipt file (basic OCR): {}", file.getOriginalFilename());
        String fullText = callGoogleVisionOCRInternal(file); // Use internal method

        if (fullText == null || fullText.isBlank()) {
            logger.warn("No text found in the image or empty response from Vision API.");
            return new OcrResultDto(null, null, null, null, Collections.emptyList(), "");
        }

        List<String> lines = fullText.lines().collect(Collectors.toList());
        logger.debug("OCR Full Text:\n{}", fullText);

        BigDecimal totalAmount = findTotalAmount(fullText, lines);
        LocalDate date = findDate(fullText);
        String vendor = findVendor(lines);
        String currency = guessCurrency(fullText);

        return new OcrResultDto(totalAmount, date, vendor, currency, lines, fullText);
    }

    // --- Parsing Helper Methods (Keep as before) ---
    private BigDecimal findTotalAmount(String fullText, List<String> lines) {
        BigDecimal maxAmount = null;
        BigDecimal amountNearKeyword = null;
        int lineNumNearKeyword = -1;
        for (int i = 0; i < lines.size(); i++) {
            Matcher matcher = AMOUNT_LINE_PATTERN.matcher(lines.get(i));
            if (matcher.find()) {
                try {
                    String amountStr = matcher.group(3).replace(",", "");
                    BigDecimal currentAmount = new BigDecimal(amountStr);
                    logger.debug("Found amount near keyword '{}' on line {}: {}", matcher.group(2), i, currentAmount);
                    boolean isPrimaryKeyword = matcher.group(2).matches("(?i)total|amount|charge|due");
                    if (amountNearKeyword == null || (isPrimaryKeyword && currentAmount.compareTo(amountNearKeyword) > 0)) {
                        amountNearKeyword = currentAmount;
                        lineNumNearKeyword = i;
                    } else if (currentAmount.compareTo(amountNearKeyword) > 0 && lineNumNearKeyword < i) {
                         amountNearKeyword = currentAmount;
                         lineNumNearKeyword = i;
                    }
                } catch (Exception e) { logger.warn("Could not parse potential amount from line: {}", lines.get(i)); }
            }
        }
        Matcher genericMatcher = GENERIC_AMOUNT_PATTERN.matcher(fullText);
        while (genericMatcher.find()) {
             try {
                String amountStr = genericMatcher.group(1).replace(",", "");
                BigDecimal currentAmount = new BigDecimal(amountStr);
                 if (maxAmount == null || currentAmount.compareTo(maxAmount) > 0) { maxAmount = currentAmount; }
            } catch (Exception e) { logger.warn("Could not parse generic amount: {}", genericMatcher.group(1)); }
        }
        if (amountNearKeyword != null) { logger.info("Using amount found near keyword: {}", amountNearKeyword); return amountNearKeyword; }
        else if (maxAmount != null) { logger.info("Using largest amount found overall: {}", maxAmount); return maxAmount; }
        else { logger.warn("Could not extract total amount."); return null; }
    }
    private LocalDate findDate(String text) {
         Matcher matcher = DATE_PATTERN.matcher(text);
         LocalDate bestDate = null;
         while (matcher.find()) {
             String dateStr = matcher.group(1).replace('.', '-').replace('/', '-');
             logger.debug("Found potential date string: {}", dateStr);
             for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                 try {
                     LocalDate parsedDate = LocalDate.parse(dateStr, formatter);
                     if (parsedDate.isAfter(LocalDate.now().plusYears(1)) || parsedDate.isBefore(LocalDate.now().minusYears(20))) {
                         logger.debug("Parsed date {} seems out of reasonable range, skipping.", parsedDate); continue;
                     }
                     if (bestDate == null) { bestDate = parsedDate; logger.info("Parsed date: {}", bestDate); }
                 } catch (DateTimeParseException e) { /* Ignore */ }
             }
         }
         if (bestDate == null) { logger.warn("Could not parse a valid date from the text."); }
         return bestDate;
    }
    private String findVendor(List<String> lines) {
        for (int i = 0; i < Math.min(lines.size(), 5); i++) {
            String line = lines.get(i).trim();
            if (!line.isEmpty() && line.length() > 2 &&
                !line.matches("(?i).*\\d{2,}.*") && !line.matches("(?i).*(total|amount|cash|change|tax|vat).*") &&
                !line.matches("(?i).*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*") &&
                !line.matches("(?i).*(street|st|road|rd|ave|blvd|city|state|zip).*")) {
                 logger.info("Guessed vendor: {}", line); return line;
            }
        }
        for (String line : lines) {
             if (!line.trim().isEmpty()) { logger.info("Falling back to first non-empty line as vendor: {}", line.trim()); return line.trim(); }
        }
        logger.warn("Could not guess vendor name."); return null;
    }
     private String guessCurrency(String text) {
         String lowerText = text.toLowerCase();
         if (text.contains("$") || lowerText.contains("usd") || lowerText.contains("dollar")) return "USD";
         if (text.contains("€") || lowerText.contains("eur")) return "EUR";
         if (text.contains("£") || lowerText.contains("gbp")) return "GBP";
         logger.warn("Could not guess currency, defaulting to null."); return null;
     }

    // --- Method for OCR + Gemini Parsing ---

    @Override
    public ReceiptResponse scanAndParseReceipt(MultipartFile receiptFile) throws IOException, Exception {
        logger.info("Scanning and parsing receipt file: {}", receiptFile.getOriginalFilename());

        // Step 1: Get raw text from Google Cloud Vision
        String rawText = callGoogleVisionOCRInternal(receiptFile);
        if (rawText == null || rawText.isBlank()) {
            logger.warn("OCR returned no text for file: {}", receiptFile.getOriginalFilename());
            throw new Exception("OCR could not extract text from the receipt.");
        }
        logger.debug("Raw OCR Text for Parsing:\n{}", rawText);

        // Step 2: Call Gemini to parse the raw text
        String structuredJson = callGeminiToParseReceipt(rawText);
        if (structuredJson == null || structuredJson.isBlank()) {
             logger.error("Gemini parsing returned empty result for file: {}", receiptFile.getOriginalFilename());
             throw new Exception("Failed to parse receipt text using AI model.");
        }
        // Clean potential markdown formatting from Gemini response
        structuredJson = structuredJson.replace("```json", "").replace("```", "").trim();
        logger.debug("Cleaned Structured JSON from Gemini:\n{}", structuredJson);


        // Step 3: Map the structured JSON to our DTO
        ReceiptResponse response = mapJsonToReceiptResponse(structuredJson);
        if (response == null) {
             logger.error("Failed to map Gemini JSON to ReceiptResponse for file: {}", receiptFile.getOriginalFilename());
             throw new Exception("Failed to interpret the parsed receipt data.");
        }

        return response;
    }

    // --- Private Helper Methods ---

    /**
     * Internal method to call Google Cloud Vision API using the injected client.
     */
    private String callGoogleVisionOCRInternal(MultipartFile file) throws IOException {
        logger.debug("Calling Google Vision API for file: {}", file.getOriginalFilename());
        try {
            ByteString imgBytes = ByteString.readFrom(file.getInputStream());
            Image img = Image.newBuilder().setContent(imgBytes).build();
            Feature feat = Feature.newBuilder().setType(Feature.Type.DOCUMENT_TEXT_DETECTION).build();
            AnnotateImageRequest request =
                    AnnotateImageRequest.newBuilder().addFeatures(feat).setImage(img).build();

            // Use the injected visionClient bean
            BatchAnnotateImagesResponse response = visionClient.batchAnnotateImages(List.of(request));

            if (response.getResponsesCount() <= 0 || !response.getResponses(0).hasFullTextAnnotation()) {
                 logger.warn("No text found in the image or empty response from Vision API for file: {}", file.getOriginalFilename());
                 return null;
            }

            AnnotateImageResponse res = response.getResponses(0);

            if (res.hasError()) {
                logger.error("Vision API Error for file {}: {}", file.getOriginalFilename(), res.getError().getMessage());
                throw new RuntimeException("Error processing image with Vision API: " + res.getError().getMessage());
            }

            TextAnnotation annotation = res.getFullTextAnnotation();
            return annotation.getText();

        } catch (Exception e) {
            logger.error("Failed to process receipt with Google Vision API for file: {}", file.getOriginalFilename(), e);
            throw new IOException("Failed to process receipt image via Vision API.", e);
        }
    }

    /**
     * Calls the Gemini model via Vertex AI GenerativeModel API to parse raw OCR text.
     */
    private String callGeminiToParseReceipt(String rawText) throws IOException {
        try {
            // Construct the prompt
            String prompt = String.format(
                """
                You are a receipt data extractor. Given the following raw OCR text from a receipt, \
                extract the store name, date (in YYYY-MM-DD format), total amount, and a list of items with their names and prices. \
                Return the result as a structured JSON object in the following format ONLY:
                {
                  "storeName": "Example Store",
                  "date": "YYYY-MM-DD",
                  "totalAmount": 123.45,
                  "items": [
                    { "name": "Item 1", "price": 100.00 },
                    { "name": "Item 2", "price": 23.45 }
                  ]
                }

                If a value cannot be determined, use null or an empty list/string as appropriate for the JSON structure. \
                Ensure the output is valid JSON.

                OCR Text:
                %s
                """, rawText);

            // Initialize the GenerativeModel using the injected VertexAI client
            GenerativeModel model = new GenerativeModel(vertexAiModelName, vertexAI);

            // Create the Content object with the user role
            Content content = Content.newBuilder()
                .setRole("user") // Specify the role
                .addParts(Part.newBuilder().setText(prompt))
                .build();

            logger.info("Calling Vertex AI Gemini model: {}", vertexAiModelName);

            // Generate content using the structured Content object
            GenerateContentResponse response = model.generateContent(Collections.singletonList(content));

            // Extract the text response
            String textResponse = ResponseHandler.getText(response);
            logger.debug("Raw Vertex AI Gemini Response Text: {}", textResponse);
            return textResponse;

        } catch (Exception e) {
             logger.error("Error calling Vertex AI GenerativeModel service", e);
             throw new IOException("Failed to call AI model for parsing.", e);
        }
    }

     /**
      * Maps the JSON string (from Gemini) to a ReceiptResponse DTO using Jackson.
      */
    private ReceiptResponse mapJsonToReceiptResponse(String structuredJson) {
         try {
             // Use the injected objectMapper bean
             ReceiptResponse response = objectMapper.readValue(structuredJson, ReceiptResponse.class);
             logger.info("Successfully mapped JSON to ReceiptResponse");
             return response;
         } catch (JsonProcessingException e) {
             logger.error("Error parsing structured JSON from AI model: {}", structuredJson, e);
             return null;
         }
    }

    // Helper to escape strings for JSON embedding (Keep as before)
    private String escapeJsonString(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\b", "\\b")
                    .replace("\f", "\\f")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }
}