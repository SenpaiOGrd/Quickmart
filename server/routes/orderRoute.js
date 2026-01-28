import express from 'express';
import authUser from '../middlewares/authUser.js';
import { placeOrderCOD } from '../controllers/orderController.js';
import { getUserOrders, verifyStripe } from '../controllers/orderController.js';
import authSeller from '../middlewares/authSeller.js';
import { getAllOrders } from '../controllers/orderController.js';
import { placeOrderStripe } from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.post('/cod',authUser,placeOrderCOD);
orderRouter.get('/my-orders', authUser, getUserOrders);
orderRouter.get('/user',authUser,getUserOrders);
orderRouter.get('/verify-stripe', authUser, verifyStripe);
orderRouter.get('/seller',authSeller,getAllOrders);
orderRouter.post('/stripe',authUser,placeOrderStripe)

export default orderRouter;