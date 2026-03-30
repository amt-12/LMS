# TODO: Fix /api/live-classes 500 Error

## Steps:
- [x] Step 1: Edit LMS-backend/controller/zoom/getLiveClassesController.js to fix req.user._id → req.user.userId and add null check
- [ ] Step 2: Restart backend server
- [ ] Step 3: Test GET /api/live-classes endpoint with valid token
- [ ] Step 4: Verify fix and check for similar issues in other controllers
- [ ] Step 5: Mark complete and attempt_completion

Current: Completed Steps 1 & 4 (also fixed profile.js consistency). Next: Restart server and test.
