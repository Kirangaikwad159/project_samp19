const jwt = require('jsonwebtoken');
const userModel =require('../model/userModel');


const checkUserAuth = async (req, res, next) => {
    let token;
    const {authorization} = req.headers;

    if (authorization && authorization.startsWith('Bearer')){
        try {
            token = authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!decoded || !decoded.userId){
                return res.status(401).send({"status": "Unauthorized User", "message": "Invalid token"});
            }
            const user = await userModel.findByPk(decoded.userId,{
                attributes: {exclude: ['password']}
            });

            if (!user){
                return res.status(404).send({"status": "Not found", "message": "User NOt found"});
            }
            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).send({"status": "Unauthorized User", "message": "Token verification failed."});
        }
    } else{
        return res.status(401).send({"status": "Unauthorized User", "message": "No Token provided"});
    }
};

module.exports = checkUserAuth;