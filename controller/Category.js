const Category = require("../models/category");
const Course = require("../models/Course");

//Creating Tag handler function

exports.createCategory = async(req,res) =>{
    try{
        // fetch data
         const {name, description} = req.body;
        // validation
        if(!name) {
            return res.status(400).json({
                success:false,
                message:'All feilds are required',
            })
        }
        //create entry in db 
        const CategorysDetails = await Category.create({
			name: name,
			description: description,
		});
		console.log(CategorysDetails);
        //return response
		return res.status(200).json({
			success: true,
			message: "Categorys Created Successfully",
		});
	} catch (error) {
		return res.status(500).json({
			success: true,
			message: error.message,
		});
	}
}

// getAllTags handler function
exports.showAllCategory =  async (req,res) =>{
    try{
      const allTags  = await Tag.find({},{name:true, description:true});
      res.status(200).json({
        success:true,
        data: allCategories,
      });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
}

//category Page Details+
exports.categoryPageDetails = async (req, res) => {
	try {
        // get Category ID
		const { categoryId } = req.body;

		// Get courses for the specified category
		const selectedCategory = await Category.findById(categoryId)          //populate instuctor and rating and reviews from courses
			.populate({path:"courses",match:{status:"Published"},populate:([{path:"instructor"},{path:"ratingAndReviews"}])})
			.exec();
		 console.log(selectedCategory);
		// validation
		if (!selectedCategory) {
			console.log("Category not found.");
			return res
				.status(404)
				.json({ success: false, message: "Category not found" });
		}
		// Handle the case when there are no courses
		if (selectedCategory.courses.length === 0) {
			console.log("No courses found for the selected category.");
			return res.status(404).json({
				success: false,
				message: "No courses found for the selected category.",
			});
		}

		const selectedCourses = selectedCategory.courses;

		// Get courses for other categories
		const categoriesExceptSelected = await Category.find({
			_id: { $ne: categoryId },
		}).populate({path:"courses",match:{status:"Published"},populate:([{path:"instructor"},{path:"ratingAndReviews"}])});
		let differentCourses = [];
		for (const category of categoriesExceptSelected) {
			differentCourses.push(...category.courses);
		}

		// Get top-selling courses across all categories
		const allCategories = await Category.find().populate({path:"courses",match:{status:"Published"},populate:([{path:"instructor"},{path:"ratingAndReviews"}])});
		const allCourses = allCategories.flatMap((category) => category.courses);
		const mostSellingCourses = allCourses
			.sort((a, b) => b.sold - a.sold)
			.slice(0, 10);

		res.status(200).json({
			selectedCourses: selectedCourses,
			differentCourses: differentCourses,
			mostSellingCourses: mostSellingCourses,
			success: true,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};