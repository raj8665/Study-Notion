const Course = require("../models/Course");
const Category = require("../models/category");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { convertSecondsToDuration}= require("../utils/secToDuration");
const CourseProgress = require("../models/CourseProgress")
const Section = require("../models/Section")
const SubSection = require("../models/SubSection");


// Function to create a new course
exports.createCourse = async (req, res) => {
	try {
		// Get user ID from request object
		const userId = req.user.id;

		// Get all required fields from request body
		let {
			courseName,
			courseDescription,
			whatYouWillLearn,
			price,
			tag,
			category,
			status,
			instructions,
		} = req.body;

		// Get thumbnail image from request files
		const thumbnail = req.files.thumbnailImage;

		// Check if any of the required fields are missing
		if (!courseName ||
			!courseDescription ||
			!whatYouWillLearn ||
			!price ||
			!tag ||
			!thumbnail ||
			!category
		) {
			return res.status(400).json({
				success: false,
				message: "All Fields are Mandatory",
			});
		}
		// updating status of the course
		if (!status || status === undefined) {
			status = "Draft";
		}
		// Check if the user is an instructor
		const instructorDetails = await User.findById(userId, {
			accountType: "Instructor",
		});

		if (!instructorDetails) {
			return res.status(404).json({
				success: false,
				message: "Instructor Details Not Found",
			});
		}

		// Check if the tag given is valid
		const categoryDetails = await Category.findById(category);
		if (!categoryDetails) {
			return res.status(404).json({
				success: false,
				message: "Category Details Not Found",
			});
		}
		// Upload the Thumbnail to Cloudinary
		const thumbnailImage = await uploadImageToCloudinary(
			thumbnail,
			process.env.FOLDER_NAME,
		);
		console.log(thumbnailImage);
		// Create a new course with the given details
		const newCourse = await Course.create({
			courseName,
			courseDescription,
			instructor: instructorDetails._id,
			whatYouWillLearn: whatYouWillLearn,
			price,
			tag: tag,
			category: categoryDetails._id,
			thumbnail: thumbnailImage.secure_url,
			status: status,
			instructions: instructions,
		});

		// Add the new course to the User Schema of the Instructor
		await User.findByIdAndUpdate(
			{
				_id: instructorDetails._id,
			},
			{
				$push: {
					courses: newCourse._id,
				},
			},
			{ new: true }
		);
		// Add the new course to the Categories
		await Category.findByIdAndUpdate({ _id: category },
			{
				$push: {
					course: newCourse._id,
				},
			},
			{ new: true }
		);
		res.status(200).json({
			success: true,
			data: newCourse,
			message: "Course Created Successfully",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Failed to create course, please try again",
			error: error.message,
		});
	}
};

// to get all the courses
exports.getAllCourses = async (req, res) => {
	try {
		const allCourses = await Course.find(
			{},
			{
				courseName: true,
				price: true,
				thumbnail: true,
				instructor: true,
				ratingAndReviews: true,
				studentsEnroled: true,
			}
		)
			.populate("instructor")
			.exec();
		return res.status(200).json({
			success: true,
			data: allCourses,
		});
	} catch (error) {
		console.log(error);
		return res.status(404).json({
			success: false,
			message: `Can't Fetch Course Data`,
			error: error.message,
		});
	}
};

// want to het all the course details
exports.getCourseDetails = async (req,res)=>{
	try {
    // get id
	const {courseId}=req.body;
    // find Course details
	const courseDetails=await Course.find(
        {_id: courseId})
        .populate(
        {path:"instructor",
	populate:{path:"additionalDetails"}})
	.populate("category")
	.populate({                
        //only populate user name and image    
		path:"ratingAndReviews",
		populate:{path:"user"
		,select:"firstName lastName accountType image"}
	})
	.populate(
    {path:"courseContent",
    populate:{
        path:"subSection",
    }})
	.exec();
    // validation
	if(!courseDetails){
		return res.status(404).json({
            success:false,
            message:"Course Not Found",
        })
	}
    //return response 
	return res.status(200).json({
        success:true,
		message:"Course fetched successfully now",
        data:courseDetails,
    });
		
	} 
    catch (error) {
		console.log(error);
        return res.status(404).json({
            success:false,
			message:`Can't Fetch Course Data`,
			error:error.message,
        })
	}

}

// To get all courses of a particular instructor
exports.getInstructorCourses = async (req, res) => {
	try {
		// Get user ID from request object
		const userId = req.user.id;

		// Find all courses of the instructor
		const allCourses = await Course.find({ instructor: userId });

		// Return all courses of the instructor
		res.status(200).json({
			success: true,
			data: allCourses,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Failed to fetch courses",
			error: error.message,
		});
	}
}

//if user(instructor) want to edit course details
exports.editCourse = async (req, res) => {
	try {
	  const { courseId } = req.body
	  const updates = req.body
	  const course = await Course.findById(courseId)
  
	  if (!course) {
		return res.status(404).json({
			 error: "Course not found"
			 });   
	  }
  
      // what if thumbnail image is not their
	  if (req.files) {
		console.log("thumbnail update")
		const thumbnail = req.files.thumbnailImage
		const thumbnailImage = await uploadImageToCloudinary(
		  thumbnail,
		  process.env.FOLDER_NAME
		)
		course.thumbnail = thumbnailImage.secure_url
	  }
  
	  // Update only the fields that are present in the request body
	  for (const key in updates) {
		if (updates.hasOwnProperty(key)) {
		  if (key === "tag" || key === "instructions") {
			course[key] = JSON.parse(updates[key])
		  } else {
			course[key] = updates[key]
		  }
		}
	  }
  
	  await course.save()
        
	  // what if instructor update the course
	  const updatedCourse = await Course.findOne({
		_id: courseId,
	  })
		.populate({
		  path: "instructor",
		  populate: {
			path: "additionalDetails",
		  },
		})
		.populate("category")
		.populate("ratingAndReviews")
		.populate({
		  path: "courseContent",
		  populate: {
			path: "subSection",
		  },
		})
		.exec()
  
	  res.json({
		success: true,
		message: "Course updated successfully",
		data: updatedCourse,
	  })
	} catch (error) {
	  console.error(error)
	  res.status(500).json({
		success: false,
		message: "Internal server error",
		error: error.message,
	  })
	}
  }

    // To get full course details
	exports.getFullCourseDetails = async (req, res) => {
		try {
			// fetch data of the course 
		  const { courseId } = req.body
		  // user 
		  const userId = req.user.id
		  const courseDetails = await Course.findOne({
			_id: courseId,
		  })
			.populate({
			  path: "instructor",
			  populate: {
				path: "additionalDetails",
			  },
			})
			.populate("category")
			.populate("ratingAndReviews")
			.populate({
			  path: "courseContent",
			  populate: {
				path: "subSection",
			  },
			})
			.exec()
	
		  let courseProgressCount = await CourseProgress.findOne({
			courseID: courseId,
			userID: userId,
		  })

		  console.log("courseProgressCount : ", courseProgressCount)
	  
		  if (!courseDetails) {
			return res.status(400).json({
			  success: false,
			  message: `Could not find course with id: ${courseId}`,
			})
		  }
	        
		  //  Take a eye on status later 
		  if (courseDetails.status === "Draft") {
		    return res.status(403).json({
		      success: false,
		      message: `Accessing a draft course is forbidden`,
		    });
		  }
	    // counting length of the video by its subsection
		  let totalDurationInSeconds = 0;
		  courseDetails.courseContent.forEach((content) => {
			content.subSection.forEach((subSection) => {
			  const timeDurationInSeconds = parseInt(subSection.timeDuration)
			  totalDurationInSeconds += timeDurationInSeconds;
			})
		  })
	  
		  const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

		  return res.status(200).json({
			success: true,
			data: {
			  courseDetails,
			  totalDuration,
			  completedVideos: courseProgressCount?.completedVideos
				? courseProgressCount?.completedVideos
				: ["none"],
			},
		  })
		} catch (error) {
		  return res.status(500).json({
			success: false,
			message: error.message,
		  })
		}
	  }

//Deletion of Course
exports.deleteCourse = async (req, res) => {
	try {
		// fetch data 
	  const { courseId } = req.body;
	  // Find the course
	  const course = await Course.findById(courseId)
	  if (!course) {
		return res.status(404).json({
			 message: "Course not found" 
			});
	  }

	  // Unenroll students from the course
	  const studentsEnrolled = course.studentsEnrolled
	  for (const studentId of studentsEnrolled) {
		await User.findByIdAndUpdate(studentId, {
		  $pull: { 
			courses: courseId
		 },
		})
	  }

	  // Delete sections and sub-sections
	  const courseSections = course.courseContent
	  for (const sectionId of courseSections) {
		// Delete sub-sections of the section
		const section = await Section.findById(sectionId)
		if (section) {
		  const subSections = section.subSection
		  for (const subSectionId of subSections) {
			await SubSection.findByIdAndDelete(subSectionId);
		  }
		}
  
		// Delete the section
		await Section.findByIdAndDelete(sectionId);
	  }
  
	  // Delete the course
	  await Course.findByIdAndDelete(courseId)

	  //Delete course id from Category
	  await Category.findByIdAndUpdate(course.category._id, {
		$pull: { courses: courseId },
	     })
	
	//Delete course id from Instructor
	await User.findByIdAndUpdate(course.instructor._id, {
		$pull: { courses: courseId },
		 })
  
	  return res.status(200).json({
		success: true,
		message: "Course deleted successfully",
	  })
	} catch (error) {
	  console.error(error)
	  return res.status(500).json({
		success: false,
		message: "Server error",
		error: error.message,
	  })
	}
  }

  //search course by title,description and tags array
  exports.searchCourse = async (req, res) => {
	try {
		// fetching searchQuery from body
	  const  { searchQuery }  = req.body
	//   console.log("searchQuery : ", searchQuery)
	  const courses = await Course.find({
		$or: [
		  { courseName: { $regex: searchQuery, $options: "i" } },
		  { courseDescription: { $regex: searchQuery, $options: "i" } },
		  { tag: { $regex: searchQuery, $options: "i" } },
		],
  })
  .populate({
	path: "instructor",  })
  .populate("category")
  .populate("ratingAndReviews")
  .exec();

  return res.status(200).json({
	success: true,
	data: courses,
	  })
	} catch (error) {
	  return res.status(500).json({
		success: false,
		message: error.message,
	  })
	}		
}				

//mark lecture as completed
exports.markLectureAsComplete = async (req, res) => {
	// fetch data
	const { courseId, subSectionId, userId } = req.body;
	// if feilds not available
	if (!courseId || !subSectionId || !userId) {
	  return res.status(400).json({
		success: false,
		message: "Missing required fields",
	  })
	}
	try {
	progressAlreadyExists = await CourseProgress.findOne({
				  userID: userId,
				  courseID: courseId,
				})
	  const completedVideos = progressAlreadyExists.completedVideos
	  if (!completedVideos.includes(subSectionId)) {
		await CourseProgress.findOneAndUpdate(
		  {
			userID: userId,
			courseID: courseId,
		  },
		  {
			$push: { completedVideos: subSectionId },
		  }
		)
	  }else{
		return res.status(400).json({
			success: false,
			message: "Lecture already marked as complete",
		  })
	  }
	  await CourseProgress.findOneAndUpdate(
		{
		  userId: userId,
		  courseID: courseId,
		},
		{
		  completedVideos: completedVideos,
		}
	  )
	return res.status(200).json({
	  success: true,
	  message: "Lecture marked as complete",
	})
	} catch (error) {
	  return res.status(500).json({
		success: false,
		message: error.message,
	  })
	}

}


	
	

