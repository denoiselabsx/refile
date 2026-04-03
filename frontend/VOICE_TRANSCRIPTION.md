# Voice Transcription with Multi-Language Support

## Overview
The voice transcription feature now supports **regional Indian languages** using OpenAI's Whisper model, which supports 99+ languages including all major Indian languages.

## Supported Languages

### Indian Languages
- 🇮🇳 **Hindi** (हिन्दी) - `hi`
- 🇮🇳 **Tamil** (தமிழ்) - `ta`
- 🇮🇳 **Telugu** (తెలుగు) - `te`
- 🇮🇳 **Kannada** (ಕನ್ನಡ) - `kn`
- 🇮🇳 **Malayalam** (മലയാളം) - `ml`
- 🇮🇳 **Marathi** (मराठी) - `mr`
- 🇮🇳 **Bengali** (বাংলা) - `bn`
- 🇮🇳 **Gujarati** (ગુજરાતી) - `gu`
- 🇮🇳 **Punjabi** (ਪੰਜਾਬੀ) - `pa`
- 🇮🇳 **Urdu** (اردو) - `ur`

### Other Languages
- 🇬🇧 **English** - `en`
- 🌐 **Auto-detect** - Automatically detects the language

## How to Use

1. **Switch to Voice Mode**: Click the "Voice" button in the file upload interface
2. **Select Language**: Choose your preferred language from the dropdown menu
3. **Record Audio**: Press and hold the microphone button to speak
4. **Send or Cancel**: 
   - Slide right to send and transcribe
   - Slide left to cancel the recording
5. **View Transcription**: The transcribed text will appear in green below the recorder

## Technical Details

### API Endpoint
- **Route**: `/api/transcribe`
- **Method**: POST
- **Model**: OpenAI Whisper (`whisper-1`)

### Request Format
```javascript
const formData = new FormData();
formData.append("audio", audioBlob, "recording.webm");
formData.append("language", "hi"); // or "ta", "te", "auto", etc.
```

### Response Format
```json
{
  "text": "Transcribed text content",
  "language": "hi"
}
```

### Language Hints
When you specify a language (e.g., Hindi), the Whisper model uses it as a hint to improve transcription accuracy for that language. Using "auto" allows the model to automatically detect the spoken language.

## Configuration

### Environment Variables
Make sure your `.env` file contains:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Files Modified
- `src/app/api/transcribe/route.js` - API endpoint with language support
- `src/components/file-upload.jsx` - UI with language selector dropdown

## Benefits

1. **Better Accuracy**: Language hints improve transcription quality for regional languages
2. **Wide Coverage**: All major Indian languages supported
3. **Auto-Detection**: Can automatically detect language if unsure
4. **User-Friendly**: Simple dropdown interface for language selection
5. **Real-Time**: Fast transcription with OpenAI's Whisper model

## Examples

### Hindi Transcription
- Select: "🇮🇳 Hindi (हिन्दी)"
- Speak: "इस वीडियो से ऑडियो निकालें"
- Result: "इस वीडियो से ऑडियो निकालें"

### Tamil Transcription
- Select: "🇮🇳 Tamil (தமிழ்)"
- Speak: "இந்த படத்தை சிறிதாக்கு"
- Result: "இந்த படத்தை சிறிதாக்கு"

### Telugu Transcription
- Select: "🇮🇳 Telugu (తెలుగు)"
- Speak: "ఈ PDFలను విలీనం చేయండి"
- Result: "ఈ PDFలను విలీనం చేయండి"

## Troubleshooting

### "Missing credentials" Error
- Check that `OPENAI_API_KEY` is set in your `.env` file
- Restart the development server after adding the key

### Poor Transcription Quality
- Try selecting the specific language instead of auto-detect
- Speak clearly and at a moderate pace
- Reduce background noise

### Language Not in List
- The model supports 99 languages total
- You can add more language codes in `file-upload.jsx`
- See [Whisper language codes](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py) for the full list

## Future Enhancements

- [ ] Add more Indian languages (Odia, Assamese, etc.)
- [ ] Show confidence scores for transcriptions
- [ ] Support for translation after transcription
- [ ] Accent/dialect variations
- [ ] Custom vocabulary for domain-specific terms
