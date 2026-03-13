const Router = require("express").Router()
const apiRoutes = require("./api/index")



Router.use("/api",apiRoutes)




Router.use("/api",(req,res,next)=>{
    res.json({status:"API route no found"})
    next(error)
})





module.exports = Router;