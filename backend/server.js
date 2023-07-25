// Import the necessary libraries
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require("cors");
const multer  = require('multer');
const path    = require('path');
const fs = require("fs");
const speech = require("@google-cloud/speech");



// Load environment variables from .env file
dotenv.config();

// Create the Express app
const app = express();

// Use body-parser middleware to parse JSON bodies
app.use(bodyParser.json());

// Setup CORs
app.use(cors());


// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })

// Create an index route which returns a welcome message
app.get('/', (req, res) => {
  res.send('Welcome to our A.I Backend!');
});

// Create a "message" route which returns a JSON response
app.post('/transcribe', upload.single('file'), async (req, res) => {


    console.log(req.file.path);

    try {
      const client  = new speech.SpeechClient();
      const fileToTranscribe = fs.readFileSync(req.file.path);
      const fileBase64 = fileToTranscribe.toString('base64');

      const video = {
        content : fileBase64
      }

      const transcriptionConfig = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US'
      }

      const transcriptionRequest = {
        audio : video,
        config: transcriptionConfig
      }

      const [response] = await client.recognize(transcriptionRequest);
      console.log(response);
      const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');

      console.log(`Transcription : ${transcription}`);

      res.send(transcription)

    } catch(error) {
      
      console.log(error)
      
    }
  
});

// The port the app will listen on
const PORT = process.env.PORT || 1330;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});