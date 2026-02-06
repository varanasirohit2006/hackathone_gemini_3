# Image Analysis Troubleshooting Guide

## Quick Test Steps

1. **Open Browser Console** (F12)
2. **Go to** `http://localhost:3000`
3. **Click** "Citizen Scan" button
4. **Upload or use demo image**
5. **Watch the console** for these logs:

Expected console output:
```
🖼️ Starting Image Analysis...
🔑 API Key present: true
📏 Image data length: [some number]
🖼️ Image format: image/jpeg
📊 Base64 data length: [some number]
📤 Sending request to Gemini API...
📥 Raw Gemini Response: [JSON or text]
🔍 Extracted JSON: {...}
✅ Successfully parsed: {...}
📊 Gemini Response: {...}
```

## Common Issues & Fixes

### Issue 1: "API Key Missing"
**Console shows:** `❌ GEMINI_API_KEY not found`
**Fix:** Restart the dev server (Ctrl+C, then `npm run dev`)

### Issue 2: "Gemini API Error"
**Console shows:** `❌ Gemini API Error: [error message]`
**Possible causes:**
- Invalid API key
- Network issue
- Rate limiting

**Fix:** Check the specific error message in console

### Issue 3: Image not uploading
**Console shows:** Nothing or `📏 Image data length: 0`
**Fix:** Make sure you're selecting a valid image file

### Issue 4: JSON parsing error
**Console shows:** `No JSON object found in response`
**Fix:** This is handled automatically now with better parsing

## Manual API Test

Visit: `http://localhost:3000/api/test-gemini`

Expected response:
```json
{
  "success": true,
  "result": {
    "wasteType": "...",
    "hazardLevel": "Low",
    "recommendation": "...",
    "confidence": 0.xx
  }
}
```

If you see `"success": false`, check the error field.

## Still Not Working?

1. **Check API Key validity:**
   - Go to https://aistudio.google.com/app/apikey
   - Verify your key is active
   - Generate a new one if needed

2. **Verify .env.local:**
   - File location: `command_center/.env.local`
   - Content: `GEMINI_API_KEY=your_key_here`
   - No quotes, no spaces around =

3. **Restart everything:**
   ```bash
   # Kill server
   Ctrl + C
   
   # Restart
   npm run dev
   ```

4. **Check browser console:**
   - Look for the detailed logs I added
   - Screenshot any error messages
   - Share the console output
