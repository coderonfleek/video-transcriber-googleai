// Import the necessary libraries
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require("cors");
const multer  = require('multer');
const path    = require('path');
const fs = require("fs");
const speech = require("@google-cloud/speech");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
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

ffmpeg.setFfmpegPath(ffmpegPath);


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
  const audioFilePath = `${videoFilePath}.wav`;

  //fs.writeFileSync(videoFilePath, req.file.buffer);

  ffmpeg(videoFilePath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', async () => {
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
      })
      .on('error', (err) => {
          console.error('Error with ffmpeg:', err);
          res.status(500).send('Error processing video.');
      })
      .save(audioFilePath);
  
});

// The port the app will listen on
const PORT = process.env.PORT || 1330;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});