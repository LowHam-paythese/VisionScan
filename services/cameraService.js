const { change_cam_ip } = require('../api');

/**
 * Changes a camera's IP address.
 * @param {string} currentIp 
 * @param {string} newIp 
 * @param {string} username 
 * @param {string} password 
 * @param {string} subnet 
 * @returns {Promise<any>}
 */
const updateCameraIp = async (currentIp, newIp, username, password, subnet = '255.255.255.0') => {
    try {
        const result = await change_cam_ip(currentIp, newIp, subnet, username, password);
        return { success: true, data: result };
    } catch (error) {
        console.error('Update Camera IP error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    updateCameraIp
};
