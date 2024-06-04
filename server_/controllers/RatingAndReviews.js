const RatingAndReview = require("../models/RatingAndReview")
const Course = require("../models/Course");
const { default: mongoose } = require("mongoose");

// createRating
exports.createRating = async (req, res) => {
  try {
    // fetch data 
    const userId = req.user.id;
    // fetch data from req body
    const { rating, review, courseId } = req.body;
    // check if user is enrolled or not
    const courseDetails = await Course.find(
      {
        _id: courseId,
        studentsEnrolled: {
          $elemMatch: { $eq: userId }
        }
      }
    );

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Student not enrolled in course"
      });
    };
    // check if user already reviewed the course 
    const alreadyReviewed = await RatingAndReview.findOne({
      user: userId,
      course: courseId
    });

    if (alreadyReviewed) {
      return res.status(404).json({
        success: false,
        message: "Already reviewed"
      });
    }
    // create rating and Review
    const ratingReview = await RatingAndReview.create({
      rating,
      review,
      course: courseId,
      user: userId,
    });
    // update course with this rating and review
    const updatedCourseDetails = await Course.findByIdAndUpdate({ _id: courseId },
      {
        $push: {
          ratingAndReviews: ratingReview._id
        }
      },
      { new: true },
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


// getAverageRating
exports.getAverageRating = async (req, res) => {
  try {
    // get course ID
    const courseId = req.body.courseId;
    // calculate avg rating
    const result = await RatingAndReview.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId),
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" }
        }
      }
    ]);
    if (result.length > 0) {
      return res.status(200).json({ 
        success:true,
        averageRating: result[0].averageRating,
      });
    }
    else {
      return res.status(200).json({
        message: "Average rating is 0",
        averageRating: 0
      });
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
}

// getAllRaatings
exports.getAllRating = async (req,res) => {
  //get sorted by rating
  try {
      const allReviews = await RatingAndReview.find(
          ).sort({rating: -1})
          .populate({path: "user",
          select: "firstName lastName email image"})
          .populate({path: "course",
          select: "courseName"})
          .exec();
          
      return res.status(200).json({
          success: true,
          message:"all reviews fetched successfully",
          data:allReviews,
      });
  } catch (error) {
      console.log(error);
      res.status(500).json({message: error.message});
  }
}