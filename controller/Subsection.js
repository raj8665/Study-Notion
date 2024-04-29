const SubSection = require("../models/SubSection");
const Section = require("../models/Section");
const {uploadImageToCloudinary} = require("../utils/imageUploader");

exports.createSubSection = async (req,res) => {
    try{
        // fetch data from req body 
        const {sectionId, title , timeDuration, description} = req.body;
        // extract file/video
        const video = req.files.videoFile;
        // validation
        if(!sectionId || !title || !timeDuration || !!description ||!video){
            return res.status(400).json({
                success:false,
                message:'All feilds are required',
            })
        }
        // upload video to cloudinary 
        const uploadDetails  = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
        // create sub-Section 
        const subSectionDetails = await SubSection.create({
            title:title,
            timeDuration: timeDuration,
            description: description,
            videoUrl: uploadDetails.secure_url,
        })
        // update section with this subSection object id
        const updatedSection = await Section.findByIdAndUpdate(
              {_id:sectionId},
              { $push:{
                SubSection: subSectionDetails._id,
              },    
        },
        {new:true},
        )
        //return response 
        return res.status(200).json({
            success:true,
            message:'Sub Section Created Successfully',
            updatedSection,
        });
    }
    catch(error){
          return res.status(500).json({
            success:false,
            message:"Internal Server Error",
            error: error.message,
          })
    }
}