import express from 'express';
import { register, login,isAuth,logout, updateUserCart } from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';

const userRouter = express.Router();

userRouter.post('/register',register)
userRouter.post('/login',login)
userRouter.get('/is-auth',authUser, isAuth)
userRouter.post('/update', authUser, updateUserCart)
userRouter.get('/logout', authUser, logout)


export default userRouter;