# 🎯 Citizen App - Quick Test Guide

## ✅ What's Now Working

### 1. 🎤 Voice Transcription (WORKING ✓)
- Uses Web Speech API
- Real-time transcription as you speak
- Shows live preview while recording

### 2. 📸 Image Analysis (FIXED ✓)
- Connects to Gemini 1.5 Flash API
- Analyzes waste type, hazard level, recommendation
- Falls back to simulation if API error

### 3. 📍 GPS Location (FIXED ✓)
- Requests real browser geolocation
- Shows actual coordinates when locked
- Fallback to NYC coordinates if denied

## 🧪 How to Test

### Step 1: Open Browser Console
Press **F12** and go to **Console** tab

### Step 2: Test Image Analysis
1. Click "Citizen Scan"
2. Upload a real photo of garbage/waste
3. **Look for these console logs:**
   ```
   🖼️ Starting Image Analysis...
   ✅ API Key loaded successfully
   📸 Image format: image/jpeg
   📤 Calling Gemini API...
   📥 Raw response: {...}
   ✅ Parsed successfully: {...}
   📊 Gemini Response: {...}
   ```

**Expected Result:** 
- Spinner shows "Gemini AI Processing
"
- After 2-3 seconds, you see the analysis screen
- Shows waste type, hazard level, recommendation

**If it says "Simulation":** Check console for error message

### Step 3: Test Voice Recognition
1. Click "Record Voice"
2. **Grant microphone permission** when asked
3. Speak clearly: "I'm reporting garbage overflow on Main Street"
4. See your words appear in blue "Live Transcription" box
5. Click again to stop

**Expected Result:**
- Button turns red with "Listening..."
- Blue box appears showing your exact words
- Words added to report preview

### Step 4: Test GPS Location
1. Click "Pin Location"
2. **Grant location permission** when asked
3. Look for coordinates to appear

**Expected Result:**
- Button shows "Locating..." with spinner
- Changes to green "Location Pinned"
- Shows coordinates like: `40.7128° N, -74.0060° W`
- Console shows: `📍 GPS Location obtained: {lat: ..., lng: ...}`

## 🔍 Debugging Tips

### Image Analysis Not Working?
**Check console for:**
- `❌ No API key found` → Restart server (Ctrl+C, `npm run dev`)
- `❌ Error in analyzeImageWithGemini:` → Note the specific error
- `⚠️ Gemini Error:` followed by fallback → API issue, using simulation

### Voice Not Working?
- Make sure you're using **Chrome or Edge**
- Grant microphone permission
- Speak clearly and loudly

### Location Not Working?
- Grant location permission in browser
- If denied, it uses NYC coordinates as fallback (40.7128° N, -74.0060° W)

## 📝 Expected Full Flow

1. Click "Citizen Scan"
2. Upload photo → See "Gemini AI Processing" → See analysis
3. Click "Record Voice" → Speak → Stop → See transcript
4. Click "Pin Location" → See coordinates
5. All three show in "Report Preview" box
6. Click "Submit Issue" → Report submitted!

## 🚨 Common Issues

**"Module not found" error:**
- Already fixed - removed test route that was causing it

**Image stuck on "Processing":**
- Check browser console for exact error
- Verify `.env.local` has your API key
- Try restarting: `Ctrl+C` then `npm run dev`

**Transcription says random phrases:**
- Old version - should be fixed now
- Make sure you reloaded the page after build

---

💡 **Pro Tip:** Keep the browser console open while testing to see all the detailed logs!
