import user_model from "../models/user_model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function register(req, res) {

    try {

        const {name, email, password} = req.body;

        if(!name || !email || !password) {
            return res.status(400).json({status: 0, message: "All fields are required"});
        }

        const user = await user_model.findOne({email});

        if(user) {
            return res.status(400).json({status: 0, message: "User already exists"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new user_model({name, email, password: hashedPassword});

        await newUser.save();

        return res.status(201).json({status: 1, message: "User created successfully"});
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message);
    }

}

async function login(req, res) {
    try {
        const {email, password} = req.body;

        const user = await user_model.findOne({email});

        if(!user) {
            return res.status(200).json({status: 0, message: "User not found"});
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if(!isPasswordCorrect) {
            return res.status(200).json({status: 0, message: "Invalid password"});
        }

        // console.log(process.env.SCRETE_KEY);
        const token = jwt.sign({id: user._id}, process.env.SCRETE_KEY, {expiresIn: "1h"});

        return res.status(200).json({status: 1, message: "Login successful", token , user: {name: user.name, email: user.email, _id: user._id}});    

    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message);

    }
}


async function getAllUsers(req, res) {
    try {
        const users = await user_model.find({}, { password: 0 }); // Exclude password field
        
        if (!users || users.length === 0) {
            return res.status(200).json({ status: 0, message: "No users found" });
        }

        return res.status(200).json({ 
            status: 1, 
            message: "Users fetched successfully",
            users: users
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message);
    }
}





export default {
    register,
    login,
    getAllUsers
}
