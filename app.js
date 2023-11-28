// index.js
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
    user: "root",
    password:"rishabh@5678",
    database:"profile",

});

// Configure AWS SDK
AWS.config.update({
  accessKeyId: 'AKIAYAE335IHUBIDDLVC',
  secretAccessKey: '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',
  region: 'ap-south-1', 
});

const s3 = new AWS.S3();
const bucketName = 'awsupload-files';

// Multer middleware for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve HTML file for registration and login
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle registration form submission
app.post('/register', upload.single('avatar'), async (req, res) => {
  const { username, email, password } = req.body;
  const avatar = req.file;

  // Upload avatar to S3
  const params = {
    Bucket: bucketName,
    Key: `avatars/${Date.now()}-${avatar.originalname}`,
    Body: avatar.buffer,
    ContentType: avatar.mimetype,
  };

  try {
    const s3Data = await s3.upload(params).promise();

    // Save user data to MySQL
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO users (username, email, password, avatarUrl) VALUES (?, ?, ?, ?)',
      [username, email, password, s3Data.Location]
    );
    connection.release();

    res.json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error:'internal server error'  });
  }
});

// Serve HTML file for the user profile
app.get('/profile', (req, res) => {
  res.sendFile(__dirname + '/profile.html');
});

// API endpoint to get user profile data
app.get('/api/getProfile', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM users ');
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('All rows:', rows);

    const user = rows[2];
    res.json({
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
