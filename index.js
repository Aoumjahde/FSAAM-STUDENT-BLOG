// SERVER - FINAL CORRECTED CODE
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const validator = require('validator');
const fs = require('fs');

const jwtSecret = process.env.JWT_SECRET;
const app = express();
const PORT = process.env.PORT || 5500;

// Favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// MongoDB Models
const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  imageUrl: String,
  author: String,
  timestamp: String,
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
});

const Post = mongoose.model('Post', PostSchema);
const User = mongoose.model('User', UserSchema);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    console.error('Authorization header is missing or invalid');
    return res.sendStatus(401);
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// User registration
app.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).send({ success: false, error: 'Username and password required' });
    }

    const sanitizedUsername = validator.escape(username);
    const sanitizedPassword = validator.escape(password);

    const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);

    const newUser = new User({
      username: sanitizedUsername,
      password: hashedPassword,
      role: role || 'user',
    });

    await newUser.save();
    res.status(201).send({ success: true, message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).send({ success: false, error: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).send({ success: false, error: 'Internal Server Error' });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send({ success: false, error: 'Username and password required' });
    }

    const sanitizedUsername = validator.escape(username);
    const sanitizedPassword = validator.escape(password);

    const user = await User.findOne({ username: sanitizedUsername });
    
    if (!user) {
      return res.status(401).send({ success: false, error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.password);
    
    if (isPasswordValid) {
      const accessToken = jwt.sign(
        { username: user.username, role: user.role },
        jwtSecret,
        { expiresIn: '24h' }
      );
      res.status(200).send({ 
        success: true, 
        token: accessToken, 
        role: user.role,
        username: user.username 
      });
    } else {
      res.status(401).send({ success: false, error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ success: false, error: 'Internal server error' });
  }
});

// Read all posts
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ timestamp: -1 });
    res.status(200).send(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send({ error: 'Failed to fetch posts' });
  }
});

// Create new post
app.post('/posts', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Forbidden: Admin access required' });
    }

    const { title, content, imageUrl, author, timestamp } = req.body;

    if (!title || !content) {
      return res.status(400).send({ error: 'Title and content are required' });
    }

    const newPost = new Post({
      title: validator.escape(title),
      content: validator.escape(content),
      imageUrl: imageUrl || '',
      author: author || 'Anonymous',
      timestamp: timestamp || new Date().toISOString(),
    });

    const savedPost = await newPost.save();
    res.status(201).send(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Get single post
app.get('/post/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).send('Invalid post ID');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Read the HTML template from the file
    fs.readFile(path.join(__dirname, 'post-details.html'), 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML template:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Replace placeholders in the HTML with actual post data
      const postDetailHtml = data
        .replace(/\${post.imageUrl}/g, post.imageUrl || '')
        .replace(/\${post.title}/g, post.title)
        .replace(/\${post.timestamp}/g, post.timestamp)
        .replace(/\${post.author}/g, post.author)
        .replace(/\${post.content}/g, post.content);

      res.status(200).send(postDetailHtml);
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete post
app.delete('/posts/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Forbidden: Admin access required' });
    }

    const postId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).send({ error: 'Invalid post ID' });
    }

    const deletedPost = await Post.findByIdAndDelete(postId);
    
    if (!deletedPost) {
      return res.status(404).send({ error: 'Post not found' });
    }

    res.status(200).send({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Update Post
app.put('/posts/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Forbidden: Admin access required' });
    }

    const { title, content } = req.body;
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).send({ error: 'Invalid post ID' });
    }

    if (!title || !content) {
      return res.status(400).send({ error: 'Title and content are required' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { 
        title: validator.escape(title), 
        content: validator.escape(content) 
      },
      { new: true, runValidators: true }
    );

    if (!updatedPost) {
      return res.status(404).send({ error: 'Post not found' });
    }

    res.status(200).send(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
  });
}).catch(error => {
  console.error('❌ Failed to start server:', error);
});