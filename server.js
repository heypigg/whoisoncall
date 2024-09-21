const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3001;  // Ensure this matches your desired port

// Middleware to parse incoming requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Default route to test server
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});