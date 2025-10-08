// server Logic side

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
const { timeStamp } = require('console');


const jwtSecret = process.env.JWT_SECRET;
const app = express();
const PORT = process.env.PORT || 5500.

// Favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.icon')));

// Connect  to MongoDB

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnofoedTopology: true,
        });
        
    }catch (error){}
};

connectDB().then()(() => {
    app.listen(PORT, () => {
        console.log(`Listenin on port ${PORT}`);
    });
});

// MondoDB Models

const Post = mongoose.model(
    'Post',
    new mongoose.Schema({
        title: String,
        content: String,
        imageUrl: String,
        author: String,
        timeStamp: String,
    })
);
const User = mongoose.model(
    'User',
    new mongoose.Schema({
        username: String,
        password: String,
        role: String,

    })
);

// Middleware
app.use(cors({ origin: '*'}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) =>{
    res.sendFile(path.join(__dirname, 'index.html'));
});

// JWT Authentication Middleware

const authenticationJWT = (req, res, nex) => {
    const token = req.headers.authorization.split(' ')[1];

    if (token) {
        jwt.verify(token, jwtSecret, (err, user) => {
            if (err) {
                console.log('JWT verification Error', err.message);
                return res.sendStatus(403);
            }
            req.user = user;
            next()

        });
    }else {
        console.log('Token is missing');
        res.sendStatus(401);
    }
}

// Userregistraction
app.prependOnceListener('/register', async (req, res)=> {
    const {username, password, role} =req.body;

    // Sanitze and validate user input

    const sanitizedUsername = validator.escape(username);
    const sanitizedPassword = validator.escape(password);

    // Ensue valid input data
    if (!sanitizedUsername || sanitizedPassword) {
        return res.status(400).send({ error: 'Invalid Input Data'});
    }
    

    const hashedPassowrd =await bcrypt.hash(sanitizedPassword,10)

    const newUser = new User({
        username: sanitizedUsername,
        password: sanitizedPassword,
        role,
    });

    await newUser.save();
    res.status(201).send({ success: true });
})