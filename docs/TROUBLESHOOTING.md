# Troubleshooting & FAQ Guide

This guide provides solutions for common issues, build errors, and runtime questions.

---

## 1. Common Issues & Solutions

### Issue 1: `GEMINI_API_KEY is not defined`
- **Symptom**: Console warning appears on server startup; AI features (Syllabus Importer, Feedback AI Tagging) fall back to default behavior.
- **Solution**: Set `GEMINI_API_KEY` in environment variables or Settings.

### Issue 2: Mintlify Schema Validation Error
- **Symptom**: `Invalid docs.json: #.theme: Invalid discriminator value` or `#.navigation: Invalid type`.
- **Solution**: Ensure `docs.json` complies with Mintlify schema (`$schema: "https://mintlify.com/docs.json"`). Theme must be one of `mint`, `maple`, `palm`, `willow`, `linden`, `almond`, `aspen`, `luma`, or `sequoia`. `navigation` must be an array of objects containing `group` and `pages`.

### Issue 3: Direct Feedback Send Button Disabled
- **Symptom**: Send Feedback button remains greyed out in the modal.
- **Solution**: Verify that all validation constraints are satisfied:
  - Name is provided.
  - Message contains **only alphanumeric characters and spaces** (no punctuation or symbols).
  - Message has at least 2 words.
  - Message length is between 5 and 255 characters.

### Issue 4: Custom Motivation Message Not Updating on Dashboard
- **Symptom**: Dashboard card still displays default daily quote after saving motivation in settings.
- **Solution**: Open **Settings -> Portal Tab**, enter your text in **User Motivation Message**, and click **Save Settings**. The dashboard updates instantly.
