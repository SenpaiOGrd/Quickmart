import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    const tokenFromCookie = req.cookies?.token;
    const authHeader = req.headers?.authorization;
    const tokenFromHeader = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;

    const token = tokenFromCookie || tokenFromHeader;

    if(!token){
        return res.json({success: false, message: 'Not Authorized'});
    }

    try{
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        if(tokenDecode.id){
            req.userId = tokenDecode.id;
        }else{
            return res.json({success: false, message: 'Not Authorized'});
        }
        next();
    }catch(error){
        return res.json({success: false, message: error.message});
    }
}

export default authUser;