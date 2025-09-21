import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Settings from '../models/settingsModel.js';

export const checkTestingMode = asyncHandler(async (req, res, next) => {
  const setting = await Settings.findOne({ key: 'enableTestingMode' });
  if (!setting || setting.value !== true) {
    throw new ApiError(403, 'Forbidden', 'Testing mode is currently disabled by an administrator.');
  }
  next();
});


