const express = require("express");

const authRoutes = require("./Auth.route");
const studentsRoutes = require("./Students.route");
const courseRoutes = require("./courses.route");
const subjectRoutes = require("./subjects.route");

const liveClassRoutes = require("./liveClasses.route");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/students", studentsRoutes);
router.use("/courses", courseRoutes);
router.use("/subjects", subjectRoutes);
router.use("/live-classes", liveClassRoutes);

module.exports = router;
