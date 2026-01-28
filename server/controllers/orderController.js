import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Stripe from 'stripe';
import User from '../models/User.js';



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
        success_url: `${origin}/loader?next=/my-orders&session_id={CHECKOUT_SESSION_ID}`,
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

// Stripe Webhooks to verify Payment Status: /stripe

export const stripeWebhooks = async (request, response) => {
    //Stripe Gateway Initialization

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sig = request.headers['stripe-signature'];
    let event;

    try{
        event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }catch(error){
        response.status(400).send(`Webhook Error: ${error.message}`);
    }

    //Handle the event
    switch(event.type){
        case "payment_intent.succeeded":{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            //Getting session Metadata
            const session = await stripeInstance.checkout.sessions.list({payment_intent: paymentIntentId,});
            const {orderId, userId} = session.data[0].metadata;

            //Mark Payment as Paid 
            await Order.findByIdAndUpdate(orderId, {isPaid: true});
            //Clear user cart
            await User.findByIdAndUpdate(userId, {cartItems: {}});
            break;
        }
        case "payment_intent.payment_failed":{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            //Getting session Metadata
            const session = await stripeInstance.checkout.sessions.list({payment_intent: paymentIntentId,});
            const {orderId} = session.data[0].metadata;
            await Order.findByIdAndDelete(orderId);
            break;


        }
        default:
            console.error(`Unhandled event type ${event.type}`);
            break;


    }
    response.json({received: true});
    
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

//Verify Stripe Payment : /api/order/verify-stripe?session_id=...
export const verifyStripe = async (req, res) => {
    try{
        const sessionId = req.query.session_id;
        const userId = req.userId;

        if(!sessionId){
            return res.json({ success: false, message: 'Missing session_id' });
        }

        if(!process.env.STRIPE_SECRET_KEY){
            return res.json({ success: false, message: 'Stripe secret key not configured' });
        }

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);

        if(!session){
            return res.json({ success: false, message: 'Invalid session' });
        }

        const sessionUserId = session.metadata?.userId;
        const orderId = session.metadata?.orderId;

        if(!orderId){
            return res.json({ success: false, message: 'Missing order metadata' });
        }

        if(sessionUserId && sessionUserId !== userId){
            return res.json({ success: false, message: 'User mismatch' });
        }

        if(session.payment_status !== 'paid'){
            return res.json({ success: false, message: 'Payment not completed' });
        }

        await Order.findByIdAndUpdate(orderId, { isPaid: true });
        return res.json({ success: true, message: 'Payment verified' });
    }catch(error){
        return res.json({ success: false, message: error.message });
    }
}
