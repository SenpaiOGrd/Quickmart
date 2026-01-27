import Address from '../models/Address.js';

//Add Address : /api/address/add

export const addAddress = async (req, res) => {
    try{
        const { address } = req.body;

        if (!address || typeof address !== 'object') {
            return res.json({ success: false, message: 'Invalid address payload' });
        }

        // Accept both `zipCode` and legacy `zipcode`
        const normalizedAddress = {
            ...address,
            zipCode: address.zipCode ?? address.zipcode,
        };
        delete normalizedAddress.zipcode;

        const userId = req.userId;
        await Address.create({ ...normalizedAddress, userId });
        res.json({success: true, message: 'Address Added Successfully'});
    }catch(error){
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}

//Get Address :/api/address/get
export const getAddress = async (req, res) => {
    try{
        const userId = req.userId;
        const addresses = await Address.find({userId});
        res.json({success: true, addresses});
    }catch(error){
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}
