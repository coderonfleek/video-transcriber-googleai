// Import the necessary libraries
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require("cors");
const multer  = require('multer');
const path    = require('path');
const fs = require("fs");
const speech = require("@google-cloud/speech");
const ffmpeg = require('ffmpeg-static');
const {execSync: exec}  = require("child_process");
const { stderr } = require('process');



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
//const storage = multer.memoryStorage(); 

const upload = multer({ storage: storage })

const client = new speech.SpeechClient({
  keyFilename: './video-transcriber-lil-0a93cb9d0e37.json'
});

// Create an index route which returns a welcome message
app.get('/', (req, res) => {
  res.send('Welcome to our A.I Backend!');
});

// Create a "message" route which returns a JSON response
app.post('/transcribe', upload.single('file'), async (req, res) => {

  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const videoFilePath = req.file.path;
  const audioFilePath = 'temp_audio.wav';

  fs.writeFileSync(videoFilePath, req.file.buffer);

  // Extract audio from video using ffmpeg-static
  exec(`${ffmpeg} -i ${videoFilePath} -vn -acodec pcm_s16le -ar 16000 -ac 1 ${audioFilePath}`, async (error) => {
      if (error) {
          console.error('Error extracting audio:', error);
          return res.status(500).send('Error extracting audio.');
      }

      const audioBytes = fs.readFileSync(audioFilePath).toString('base64');

      const request = {
          audio: {
              content: audioBytes,
          },
          config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: 'en-US',
          },
      };

      try {
          const [response] = await client.recognize(request);
          const transcription = response.results
              .map(result => result.alternatives[0].transcript)
              .join('\n');

          // Clean up temporary files
          fs.unlinkSync(videoFilePath);
          fs.unlinkSync(audioFilePath);

          res.send(transcription);
      } catch (apiError) {
          console.error('API Error:', apiError);
          res.status(500).send('Error transcribing audio: ' + apiError.message);
      }
  });
  
});

// The port the app will listen on
const PORT = process.env.PORT || 1330;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});