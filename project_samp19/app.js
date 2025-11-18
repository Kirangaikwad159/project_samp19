const express = require('express');
const {sequelize, connectDB} = require('./config/connectDB');
const userRoute = require('./route/userRoute');
const logger = require('./winston');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const cors = require('cors');
app.use(cors());

const port = 4000;
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}


const users = [{ id: 1, email: 'vijay@google.com', password: bcrypt.hashSync('vijay@123', 8) }];
const SECRET_KEY = 'ldskflsfsll';


app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email); 

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        SECRET_KEY,
        { expiresIn: '3h' }
    );
    
    res.json({ token });
});



const start = async() => {
    try {
        await connectDB()
        await sequelize.sync({alter:true})
        logger.info('Database synced successfully'); 
    } catch (error) {
        logger.error(`Database connection error: ${error.message}`); 
        console.error(error);
    }
}

app.use('/api/user', userRoute);

app.listen(port, () => {
    console.log('App is listenining at 4000')
});
start();
