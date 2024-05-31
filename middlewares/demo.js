exports.isDemo = async (req, res, next)=> {
    console.log(req.user.email);
    if (req.user.email === "rajchaturvedi734@gmail.com" || req.user.email === "8665@gmail.com") {
        return res.status(401).json({
            success: false,
            message: "This is a Demo User",
        });
    }
    next();
}