const express = require('express');
const checkRole = require('../middleware/checkRole');
const route = express.Router();
const userController = require('../controller/userController');
const checkUserAuth = require('../middleware/auth-middleware');
const path = require('path');
const upload = require('../middleware/multer');
const fs = require('fs');

const { downloadUserPDF, downloadUserExcel, downloadUserDoc } = require('../controller/userController');

route.get('/:id/download/pdf', downloadUserPDF);
route.get('/user/:id/download/excel', downloadUserExcel);

route.post('/register', upload.fields([
    { name: 'profileImage', maxCount: 1},
    { name: 'document', maxCount: 1}
]),
userController.create
);

route.put('/:id', upload.fields([
    {name: 'profileImage', maxCount: 1},
    {name: 'document', maxCount: 1}
]),
userController.update
);

route.delete('/:id', upload.fields([
    {name: 'profileImage', maxCount: 1},
    {name: 'document', maxCount: 1}
]),
userController.deleteUser
);

// route.put('/:id',userController.update);
// route.delete('/:id',userController.deleteUser);
// route.get('/:id',userController.getUser);
route.post('/login',userController.Login);
route.patch('/changepassword',checkUserAuth, userController.changepassword);
route.get('/',userController.getAllUser);

module.exports = route;