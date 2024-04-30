const RatingAndReview=require("../models/RatingAndReview")
const Course = require("../models/Course");
const { default: mongoose } = require("mongoose");

// createRating
exports.createRating = async (req,res)=>{
  try {
    // fetch data 
    const userId=req.user.id;
    // fetch data from req body
    const {rating, review,courseId} = req.body;
    // check if user is enrolled or not
    const courseDetails= await Course.find(
    {_id: courseId,
     studentsEnrolled: {
        $elemMatch:{$eq:userId}}
    }
    );
     
     if(!courseDetails){
         return res.status(404).json({
            success:false,
            message: "Student not enrolled in course"
        });
     };
     // check if user already reviewed the course 
     const alreadyReviewed =await RatingAndReview.findOne({
        user:userId,
     course:courseId});
 
     if(alreadyReviewed){
         return res.status(404).json({
            success: false,
            message: "Already reviewed"
        });
     }
     // create rating and Review
     const ratingReview= await RatingAndReview.create({rating,
         review,
         course:courseId,
         user:userId,
        });
        // update course with this rating and review
        const updatedCourseDetails = await Course.findByIdAndUpdate({_id:courseId},
             {
             $push:{
             ratingAndReviews: ratingReview._id
         }
        },
        {new:true},
    );
    console.log(updatedCourseDetails);
        // return response 
     return res.status(200).json({
        success: true,
        message: "Rating and Review added successfully",
        ratingReview,
    });
    
  } 
  catch (error) {
    console.log(error);
    res.status(500).json({
        message: error.message
    }); 
  }
}
