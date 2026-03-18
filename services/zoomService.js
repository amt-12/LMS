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

      console.log('Zoom token response:', JSON.stringify(response.data, null, 2));
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
   * @param {string} role - '0' participant, '1' host
   * @returns {object} signature data
   */
  async generateSignature(meetingNumber, role) {
    role = role || '1'; // default host for admin (ES5 compatible)
    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;
    if (!sdkKey || !sdkSecret) {
      throw new Error('ZOOM_SDK_KEY or ZOOM_SDK_SECRET missing in .env. Create Meeting SDK App at marketplace.zoom.us');
    }

    const timestamp = new Date().getTime() - 24 * 60 * 60 * 1000; // 24h ago per Zoom docs
    const message = sdkKey + meetingNumber + role + timestamp;
    const hash = crypto.createHmac('sha256', sdkSecret)
                      .update(message)
                      .digest('base64url'); // url-safe
    const signature = Buffer.from(hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return {
      sdkKey,
      meetingNumber,
      role,
      signature,
      timestamp
    };
  }
}

module.exports = new ZoomService();
