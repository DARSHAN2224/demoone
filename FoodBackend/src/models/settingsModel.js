import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: String
}, { timestamps: true });

settingsSchema.statics.initialize = async function () {
  const existing = await this.findOne({ key: 'enableTestingMode' });
  if (!existing) {
    await this.create({
      key: 'enableTestingMode',
      value: true,
      description: 'Globally enables or disables all testing-related features and APIs.'
    });
    // eslint-disable-next-line no-console
    console.log('⚙️ Initialized "enableTestingMode" setting.');
  }
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;


