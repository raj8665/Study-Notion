const Profile = require("../models/Profile");
const User = require("../models/User");

exports.updateProfile = async (req,res) => {
    try{
       // get data
       const {dateOfBirth="" , about="" , contactNumber , gender} = req.body;
       // get userId
       const id = req.user.id;
       // validation 
       if(!contactNumber || !gender || !id){
          return res.status(400).json({
            success:false,
            message:'All feilds are required',
          });
       }
       // find profile
       const userDetails = User.findById(id);
       const profileId = userDetails.additionalDetails;
       const profileDetails = await Profile.findById(profileId);
       // update profile
       profileDetails.dateOfBirth = dateOfBirth;
       profileDetails.gender = gender;
       profileDetails.about = about;
       profileDetails.contactNumber = contactNumber;

       await profileDetails.save();
       // return response 
       return res.status(200).json({
        success:true,
        message:'Profile Updated Successfully',
        profileDetails,
       });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Server Error',
            error: error.message,
           });
    }
}

exports.deleteAccount = async(req,res) => {
      try{
        // get id
        const id = req.user.id;
        // delete profile
        const userDetails = await User.findById(id);
        if(!userDetails){
            return res.status(404).json({
                success:false,
                message:'User not found'
        })
        }
        // delete profile
        await Profile.findByIdAndDelete({_id:userDetails.additionalDetails});
        // delete user
        await User.findByIdAndDelete({_id:id});
        // return response 
        return res.status(200).json({
            success:true,
            message:'User deleted successfully'
        })

      }
      catch(error){
        return res.status(500).json({
            success:false,
            message:'User cannot be deleted successfully'
        })
      }
};

exports.getAllUSerDetails = async(req,res) =>{
    try{
        // get id
       const id = req.user.id;
       // validation and get user details 
       const userDetails = await User.findById(id).populate("additionalDetails").exec();
       // return response 
       return res.status(200).json({
        success:true,
        message:"User data fetched Successfully",
       })
    }
    catch(error){
        return res.status(500).json({
            success:false ,
            message:"Server Error",
            error:error.message,
           })
    }
}