import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Stripe from 'stripe';




//Place Order COD : /api/order/cod
export const placeOrderCOD = async (req, res) => {
    try{
        const { items, address } = req.body;
        const userId = req.userId;
        if(!address||items.length===0){
            return res.json({success: false, message: 'Invalid Data'});
        }
        //Calculate Amount Using Items
        let amount = await items.reduce(async (acc , item)=>{
            const product = await Product.findById(item.product); 
            const unitPrice = product.offerPrice ?? product.offerprice;
            return (await acc) + (unitPrice * item.quantity);
        },0)

        //Add tax Charge (2%)
        amount+= Math.floor(amount * 0.02);

        await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: 'COD',
            
        });
        res.json({success: true, message: 'Order Placed Successfully'});
    }catch(error){
        return res.json({success: false, message: error.message});
    }
}


//Place Order Stripe : /api/order/stripe
export const placeOrderStripe = async (req, res) => {
    try{
        const { items, address } = req.body;
        const userId = req.userId;
        const origin = req.headers.origin || process.env.FRONTEND_URL;

        if(!origin){
            return res.json({ success: false, message: 'Missing request origin' });
        }

        if(!address || !Array.isArray(items) || items.length === 0){
            return res.json({success: false, message: 'Invalid Data'});
        }

        if(!process.env.STRIPE_SECRET_KEY){
            return res.json({ success: false, message: 'Stripe secret key not configured' });
        }

        let productData = [];
        //Calculate Amount Using Items
        let amount = await items.reduce(async (acc , item)=>{
            const product = await Product.findById(item.product); 
            const unitPrice = product?.offerPrice ?? product?.offerprice ?? product?.price;
            productData.push({
                name: product.name,
                price: unitPrice,
                quantity: item.quantity,
            })
            
            return (await acc) + unitPrice * item.quantity;
        },0)

        //Add tax Charge (2%)
        amount+= Math.floor(amount * 0.02);

        const order= await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: 'Online',
            
        });
        //Stripe Gateway Integration
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

        //create line items for stripe

        const line_items = productData.map((item) => {
            return {
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.floor((item.price + item.price * 0.02) * 100), // amount in paise
                },
                quantity: item.quantity,
            }
          
    });

    //create session

    const session = await stripeInstance.checkout.sessions.create({
        line_items,
        mode: 'payment',
        success_url: `${origin}/loader?next=/my-orders`,
        cancel_url: `${origin}/cart`,
        metadata: {
            orderId: order._id.toString(),
            userId,
        },
    })

        res.json({success: true, url: session.url});
    }catch(error){
        return res.json({success: false, message: error.message});
    }
}

//Get Orders by User Id : /api/order/user

export const getUserOrders= async (req, res) => {
    try{
        const userId = req.userId;
        const orders = await Order.find({
            userId,
            $or: [{paymentType: 'COD'}, {isPaid: true}],
        }).populate('items.product address').sort({createdAt: -1});
        res.json({success: true, orders});
    }catch(error){
         res.json({success: false, message: error.message});
    }
}

//Get All Orders ( for seller / admin ) : /api/order/seller
export const getAllOrders= async (req, res) => {
    try{
        const orders = await Order.find({
            $or: [{paymentType: 'COD'}, {isPaid: true}],
        }).populate('items.product address');
        res.json({success: true, orders});
    }catch(error){
         res.json({success: false, message: error.message});
    }
}
