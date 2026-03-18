const LiveClass = require('../../models/LiveClass');
const zoomService = require('../../services/zoomService');

const createLiveClassController = async (req, res) => {
  try {
    const { title, subject, startTime, duration } = req.body;
const createdBy = req.user.userId || req.user.id;

    const zoomMeeting = await zoomService.createMeeting(title, startTime, duration);

    const liveClass = new LiveClass({
      title,
      subject,
      zoomMeetingId: zoomMeeting.meetingId,
      joinUrl: zoomMeeting.joinUrl,
      password: zoomMeeting.password,
      startTime: new Date(startTime),
      duration,
      createdBy
    });

    await liveClass.save();

    res.status(201).json({
      success: true,
      data: liveClass
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
module.exports = {createLiveClassController}

