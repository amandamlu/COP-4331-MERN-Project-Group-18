const Application = require('../models/Application');

function createApplication(userId, fields, session) {
  return new Application({ ...fields, UserId: userId }).save({ session });
}

function updateApplication(userId, applicationId, updates, session) {
  return Application.findOneAndUpdate(
    { _id: applicationId, UserId: userId },
    { $set: updates },
    { returnDocument: 'after', runValidators: true, session },
  );
}

module.exports = { createApplication, updateApplication };
