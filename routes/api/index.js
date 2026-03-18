const express = require("express");

const authRoutes = require("./Auth.route");
const studentsRoutes = require("./Students.route");
// const courseRoutes = require("./courseRoutes");
// const subjectRoutes = require("./subjectRoutes");
// const lectureRoutes = require("./lectureRoutes");

const liveClassRoutes = require("./liveClasses.route");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/students", studentsRoutes);
router.use("/live-classes", liveClassRoutes);
// router.use("/courses", courseRoutes);
// router.use("/subjects", subjectRoutes);
// router.use("/lectures", lectureRoutes);

module.exports = router;
