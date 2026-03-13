const express = require("express");

const authRoutes = require("./Auth.route");
// const courseRoutes = require("./courseRoutes");
// const subjectRoutes = require("./subjectRoutes");
// const lectureRoutes = require("./lectureRoutes");
// const liveClassRoutes = require("./liveClassRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
// router.use("/courses", courseRoutes);
// router.use("/subjects", subjectRoutes);
// router.use("/lectures", lectureRoutes);
// router.use("/live-classes", liveClassRoutes);

module.exports = router;