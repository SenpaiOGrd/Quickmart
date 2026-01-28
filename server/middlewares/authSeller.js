import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
    const sellerTokenFromCookie = req.cookies?.sellerToken;
    const authHeader = req.headers?.authorization;
    const sellerTokenFromHeader = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;

    const sellerToken = sellerTokenFromCookie || sellerTokenFromHeader;

    if(!sellerToken){
        return res.json({success: false, message: 'Not Authorized'});
    }
    try{
            const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET);
            if(tokenDecode.email === process.env.SELLER_EMAIL){
                next();
            }else{
                return res.json({success: false, message: 'Not Authorized'});
            }
            
        }catch(error){
            return res.json({success: false, message: error.message});
        }
}
export default authSeller;