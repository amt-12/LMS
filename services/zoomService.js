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

      // console.log('Zoom token response:', JSON.stringify(response.data, null, 2));
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

    console.log('--- Zoom Signature Debug ---');
    console.log('SDK Key:', sdkKey.substring(0, 5) + '...');
    console.log('SDK Secret ends with:', sdkSecret.substring(sdkSecret.length - 5));
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
    console.log('Generated Signature (truncated):', signature.substring(0, 10) + '...');

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
}

module.exports = new ZoomService();
