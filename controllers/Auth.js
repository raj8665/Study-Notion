
const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Profile = require("../models/Profile");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mailTemplates/passwordUpdate");
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
    console.log("Result is Generate OTP Func");
	console.log("OTP", otp);
	console.log("Result", result);
    while(result) {
        otp = otpGenerator(6, {
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false,
        });
    }
    const otpPayload = {email,otp};
    // create an entry for OTP
    const otpBody = await OTP.create(otpPayload);
    console.log("OTP Body",otpBody);

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
        error:error.message,
       });
    }
};

// signup 
exports.signUp = async (req, res) => {
	try {
		// Destructure fields from the request body
		const {
			firstName,
			lastName,
			email,
			password,
			confirmPassword,
			accountType,
			contactNumber,
			otp,
		} = req.body;
		// Check if All Details are there or not
		if (
			!firstName ||
			!lastName ||
			!email ||
			!password ||
			!confirmPassword ||
			!otp
		) {
			return res.status(403).send({
				success: false,
				message: "All Fields are required",
			});
		}
		// Check if password and confirm password match
		if (password !== confirmPassword) {
			return res.status(400).json({
				success: false,
				message:
					"Password and Confirm Password do not match. Please try again.",
			});
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User already exists. Please sign in to continue.",
			});
		}

		// Find the most recent OTP for the email
		const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
		console.log(response);
		if (response.length === 0) {
			// OTP not found for the email
			return res.status(400).json({
				success: false,
				message: "The OTP is not valid",
			});
		} else if (otp !== response[0].otp) {
			// Invalid OTP
			return res.status(400).json({
				success: false,
				message: "The OTP is not valid",
			});
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create the user
		let approved = "";
		approved === "Instructor" ? (approved = false) : (approved = true);

		// Create the Additional Profile For User
		const profileDetails = await Profile.create({
			gender: null,
			dateOfBirth: null,
			about: null,
			contactNumber: null,
		});
		const user = await User.create({
			firstName,
			lastName,
			email,
			contactNumber,
			password: hashedPassword,
			accountType: accountType,
			approved: approved,
			additionalDetails: profileDetails._id,
			image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
		});

		return res.status(200).json({
			success: true,
			user,
			message: "User registered successfully",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "User cannot be registered. Please try again.",
		});
	}
};

// login
exports.login = async(req,res) =>{
    try {
        //get data from req body
        const {email,password} = req.body;
        // validation data 
        if(!email || !password) {
           return res.status(400).json({
            success:false,
            message: 'Please fill up all the required feilds',
           });
        }
        //User check exist or not
        const user = await User.findOne({email}). populate("additionalDetails");
        if(!user) {
            return res.status(401).json({
                success:false,
                message: 'User is not registered, please signup to continue',
            })
        } 

        //generate JWT, after password matching
        if(await bcrypt.compare(password, user.password)){
            const token = jwt.sign(
				{ email: user.email, 
                  id: user._id, 
                  accountType: user.accountType 
                },
				process.env.JWT_SECRET,
				{
					expiresIn: "24h",
				}
			);
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
    try{
          //get data from req body
          const userDetails = await User.findById(req.user.id);
          // get old password , new Password and confirm new password from request body
          const { oldPassword, newPassword, confirmNewPassword } = req.body;

          // validation 
          const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password,
		);
		if(oldPassword === newPassword){
			return res.status(400).json({
				success: false,
				message: "New Password cannot be same as Old Password",
			});
		}
        // while comparing what if old password do not matches
        if (!isPasswordMatch) {
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect"});
		}
        // what if newPassword and confirmNew Password do not matches
        if (newPassword !== confirmNewPassword) {
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

		// Updating the password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);
        // aware user about his updated new password via sending mail notification
        try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				"Study Notion - Password Updated",
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there is an error sending the email
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}
        // return the response
        return res.status(200).json({
             success: true, 
             message: "Password updated successfully" 
        });
    }
    catch(error){
        console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});     
    }
   
};