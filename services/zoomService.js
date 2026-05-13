const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class ZoomService {
  constructor() {
    this.apiUrl = 'https://api.zoom.us/v2';
    this.oauthUrl = 'https://zoom.us/oauth/token';
    this.accessToken = null;
    this.expiry = 0;
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
  }

  async getAccessToken() {
    // Check if token is still valid (with 5min buffer)
    if (this.accessToken && Date.now() < this.expiry - 300000) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        this.oauthUrl,
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.expiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Zoom OAuth token error:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom access token: ' + (error.response?.data?.message || error.message));
    }
  }

  async createMeeting(topic, startTime, duration = 60) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(`${this.apiUrl}/users/me/meetings`, {
        topic,
        type: 2, // Scheduled
        start_time: new Date(startTime).toISOString(),
        duration,
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          password: this.generatePassword(),
          auto_recording: 'none',
          hd_video: false,          // disable HD to reduce latency on mobile WebViews
          audio: 'voip',            // force VoIP audio only for simpler audio streams
        },
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const meeting = response.data;
      return {
        meetingId: meeting.id,
        joinUrl: meeting.join_url,
        password: meeting.password,
        startUrl: meeting.start_url,
      };
    } catch (error) {
      console.error('Zoom API error:', error.response?.data || error.message);
      if (error.response?.data?.code === 4711) {
        throw new Error(`Zoom scopes missing: ${error.response.data.message}. Add 'meeting:write:meeting,meeting:write:meeting:admin' scopes to your Zoom Server-to-Server app.`);
      }
      throw new Error('Failed to create Zoom meeting: ' + (error.response?.data?.message || error.message));
    }
  }

  generatePassword() {
    return Math.random().toString(36).slice(-8).toUpperCase();
  }

  /**
   * Generate Meeting SDK signature for secure join
   * @param {string} meetingNumber - Zoom meeting ID
   * @param {string|number} role - 0 participant, 1 host
   * @returns {object} signature data
   */
  async generateSignature(meetingNumber, role) {
    const jwt = require('jsonwebtoken');
    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      throw new Error('ZOOM_SDK_KEY or ZOOM_SDK_SECRET missing in .env');
    }

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const payload = {
      sdkKey: sdkKey,
      mn: meetingNumber,
      role: parseInt(role),
      iat: iat,
      exp: exp,
      appKey: sdkKey,
      tokenExp: iat + 60 * 60 * 2
    };


    const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

    return {
      sdkKey,
      meetingNumber,
      role,
      signature,
      timestamp: iat
    };
  }

  /**
   * Get ZAK token for a user
   * @param {string} userId - Zoom user ID or email (defaults to 'me')
   * @returns {string} zak token
   */
  async getZakToken(userId = 'me') {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(`${this.apiUrl}/users/${userId}/token`, {
        params: { type: 'zak' },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data.token;
    } catch (error) {
      console.error('Zoom ZAK token error:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom ZAK token: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * End a live meeting for all participants
   * @param {string} meetingId - Zoom meeting ID
   * @returns {object} response data
   */
  async endMeeting(meetingId) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.put(`${this.apiUrl}/meetings/${meetingId}/status`, {
        action: 'end'
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Zoom End Meeting error:', error.response?.data || error.message);
      throw new Error('Failed to end Zoom meeting: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Get all completed cloud recordings for the user
   * @param {string} userId - Zoom user ID or email (defaults to 'me')
   * @param {boolean} retry - Allow retrying once on scope error
   * @returns {Array} List of recordings
   */
  /**
   * Update a Zoom meeting (topic, start_time, duration)
   * @param {string} meetingId - Zoom meeting ID
   * @param {string} topic - New meeting title
   * @param {Date|string} startTime - New start time
   * @param {number} duration - Duration in minutes
   */
  async updateMeeting(meetingId, topic, startTime, duration) {
    try {
      const accessToken = await this.getAccessToken();
      await axios.patch(`${this.apiUrl}/meetings/${meetingId}`, {
        topic,
        start_time: new Date(startTime).toISOString(),
        duration,
        timezone: 'UTC',
        settings: {
          auto_recording: 'none'
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return { success: true };
    } catch (error) {
      console.error('Zoom Update Meeting error:', error.response?.data || error.message);
      throw new Error('Failed to update Zoom meeting: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Delete a Zoom meeting
   * @param {string} meetingId - Zoom meeting ID
   */
  async deleteMeeting(meetingId) {
    try {
      const accessToken = await this.getAccessToken();
      await axios.delete(`${this.apiUrl}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return { success: true };
    } catch (error) {
      console.error('Zoom Delete Meeting error:', error.response?.data || error.message);
      throw new Error('Failed to delete Zoom meeting: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Delete a Zoom cloud recording.
   * Zoom records are tied to a meeting; deleting the meeting removes its cloud recording (depending on Zoom retention/settings).
   *
   * @param {string} meetingId - Zoom meeting ID (used by front-end as rec.meetingId)
   */
  async deleteRecording(meetingId) {
    try {
      const accessToken = await this.getAccessToken();
      
      // 1. Delete the recordings permanently from the cloud
      try {
        await axios.delete(`${this.apiUrl}/meetings/${meetingId}/recordings`, {
          params: { action: 'delete' },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (recError) {
        console.warn(`Zoom recordings for meeting ${meetingId} could not be deleted or already deleted:`, recError.response?.data || recError.message);
      }

      // 2. Delete the meeting itself
      try {
        await axios.delete(`${this.apiUrl}/meetings/${meetingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (meetError) {
        console.warn(`Zoom meeting ${meetingId} could not be deleted or already deleted:`, meetError.response?.data || meetError.message);
      }

      return { success: true };
    } catch (error) {
      console.error('Zoom Delete Recording wrapper error:', error.message);
      throw new Error('Failed to process Zoom recording deletion.');
    }
  }


  /**
   * Get cloud recordings for the user across the last N months.
   * Zoom API requires a 'from' date; max range per call is 1 month.
   * @param {string} userId - Zoom user ID or email (defaults to 'me')
   * @param {number} monthsBack - How many months back to search (default 6)
   * @param {boolean} retry - Allow retrying once on scope error
   * @returns {Array} List of recording meetings
   */
  async getRecordings(userId = 'me', monthsBack = 6, retry = true) {
    try {
      const accessToken = await this.getAccessToken();

      // Zoom API only accepts max 1 month per request, so we page through months
      const allMeetings = [];
      const seen = new Set();
      const now = new Date();

      for (let i = 0; i < monthsBack; i++) {
        const to = new Date(now);
        to.setMonth(to.getMonth() - i);
        const from = new Date(to);
        from.setMonth(from.getMonth() - 1);

        const fromStr = from.toISOString().split('T')[0]; // yyyy-MM-dd
        const toStr = to.toISOString().split('T')[0];


        const response = await axios.get(`${this.apiUrl}/users/${userId}/recordings`, {
          params: { from: fromStr, to: toStr, page_size: 300 },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const meetings = response.data.meetings || [];

        for (const m of meetings) {
          if (!seen.has(m.uuid)) {
            seen.add(m.uuid);
            allMeetings.push(m);
          }
        }
      }

      return allMeetings;
    } catch (error) {
      console.error('Zoom Get Recordings error:', error.response?.data || error.message);

      const errorCode = error.response?.data?.code ? Number(error.response.data.code) : null;

      // If scopes are invalid, the token might be cached from before the user added the scope
      if (errorCode === 4711 && retry) {
        this.accessToken = null;
        this.expiry = 0;
        return this.getRecordings(userId, monthsBack, false);
      }

      if (errorCode === 4711) {
        throw new Error(`Zoom scopes missing: ${error.response?.data?.message || ''}. Add 'cloud_recording:read:list_user_recordings' or 'cloud_recording:read:list_user_recordings:admin' scopes to your Zoom Server-to-Server OAuth App.`);
      }
      throw new Error('Failed to get Zoom recordings: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Get meeting details by ID
   * @param {string} meetingId - Zoom meeting ID
   * @returns {object} meeting details
   */
  async getMeetingDetails(meetingId) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(`${this.apiUrl}/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      console.error('Zoom getMeetingDetails error:', error.response?.data || error.message);
      throw new Error('Failed to get meeting details: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Update meeting password (set to false to remove passcode requirement)
   * @param {string} meetingId - Zoom meeting ID
   * @param {boolean|string} password - false to remove, string for new password
   * @returns {object} update result
   */
  async updateMeetingPassword(meetingId, password = false) {
    try {
      const accessToken = await this.getAccessToken();
      await axios.patch(`${this.apiUrl}/meetings/${meetingId}`, {
        password: password,
        settings: {
          password: password,
          auto_recording: 'none'
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return { success: true, meetingId, password: password };
    } catch (error) {
      console.error('Zoom updateMeetingPassword error:', error.response?.data || error.message);
      throw new Error('Failed to update meeting password: ' + (error.response?.data?.message || error.message));
    }
  }

}

module.exports = new ZoomService();

