const Router = require("express").Router()
const apiRoutes = require("./api/index")



Router.use("/api",apiRoutes)




Router.use("/api",(req,res,next)=>{
    res.status(404).json({status:"API route not found"})
    next()
})





module.exports = Router;