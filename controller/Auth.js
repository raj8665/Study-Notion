const User = require("../models/User");
const OTP = require("../models//OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//sendOTP
exports.sendOTP = async (req,res) =>{
   try {
    // fetch email from request body 
    const {email} = req.body;

    // Check if user already exist
    const checkUserPresent  = await User.findOne({email});

    // if user already exist , then retuen a response 
    if(checkUserPresent){
        return res.status(401).json({
            success:false,
            message:'USer already registered',
        })
    }
    // genrate otp
    var otp = otpGenerator.generate(6, {
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false,
    })
    console.log("OTP generated: ", otp);

    // check unique otp or not
    const result = await OTP.findOne({otp: otp});
    while(result) {
        otp = otpGenerator(6, {
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false,
        });
        result = await OTP.findOne({otp: otp});
    }

    const otpPayload = {email,otp};

    // create an entry for OTP
    const otpBody = await OTP.create(otpPayload);
    console.log(otpBody);

    // return response successfully 
    res.status(200).json({
        success:true,
        message:'OTP Sent Successfully',
        otp,
    })

    }
    catch(error) {
       console.log(error);
       return res.status(500).json({
        success:false,
        message:error.message,
       })
    }
};

// signup 
exports.signUp = async (req,res) => {

    //data fetch from request body
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;
    
        // validating data 
        if(!firstName || !lastName || !email || !password || !confirmPassword ||!otp){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            })
        }
        
        //matching of password and confirm password if they are same or not
        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password and ConfirmPassword do not match, please try again "
            })
        }
    
        //check user already exist 
        const existingUser = await User.findOne({email});
        if(existingUser) {
            return res.status(400).json({
                success:false,
                message:"User is already registered"
            })
        }
    
        // find most recent OTP stored for the user
         const recentOtp = await OTP.find({email}).sort({createdAt:-1}).limit(1);
         console.log(recentOtp);
    
         // validate OTP
         if(recentOtp.length==0){
            //OTP not found
            return res.status(400).json({
                success:false,
                message:"OTP not found",
            })
         } else if(otp!== recentOtp.otp){
               return res.status(400).json({
                success:false,
                message:"Invalid OTP",
               });
         }
    
         // Hash Password
         const hashedPassword = await bcrypt.hash(password, 10);
    
         // create entry in DB
         const profileDetails = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null,
         })
    
         const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password:hashedPassword,
            accountType,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
         })

         return res.status(200).json({
            success:true,
            message:'User is registered Successfully',
            user,
         })
    }
    catch(error){
           console.log(error);
           return res.status(500).json({
            success:false,
            message:'User cannot be registered, Please try again'
           })
    }
}

// login
exports.login = async(req,res) =>{
    try {
        //get data from req body
        const {email,password} = req.body;
        // validation data 
        if(!email || !response) {
           return res.status(403).json({
            success:false,
            message: 'All fields are required, please try again',
           })
        }
        //User check exist or not
        const user = await User.findOne({email}). populate("additionalDetails");
        if(!user) {
            return res.status(401).json({
                success:false,
                message: 'User is not registered, please signup first',
            })
        } 

        //generate JWT, after password matching
        if(await bcrypt.compare(password, user.password)){
            const payload = {
                email: user.email,
                id: user._id,
                accountType:user.accountType,

            }
         const token = jwt.sign(payload, process.env.JWT_SECRET,{
            expiresIn:"2h",
         });
         user.token = token;
         user.password = undefined;

         // create cookie and send response 
         const options = {
            expires: new Date(Date.now() + 3*24*60*60*1000),
            httpOnly: true,
         }
         res.cookie("token" , token, options).status(200).json({
            success:true,
            token,
            user,
            message:"Logged in Successfully"
         })
        }

        else {
            return res.status(401).json({
                success:false,
                message:"Password is incorrect"
            });
        }

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Login failure, please try again',
        })

    }
};

//changePassword 
exports.changePassword = async(rea,res) => {
    //get data from req body
}