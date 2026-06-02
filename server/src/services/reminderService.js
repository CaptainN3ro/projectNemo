const cron = require('node-cron');
const { Reminder, Pet, User } = require('../models');
const { Op } = require('sequelize');

async function createReminder({ userId, petId, refType, refId, message, remindAt }) {
  return Reminder.create({ user_id: userId, pet_id: petId, ref_type: refType, ref_id: refId, message, remind_at: remindAt });
}

async function processDueReminders() {
  try {
    const due = await Reminder.findAll({
      where: { sent: false, remind_at: { [Op.lte]: new Date() } },
      include: [{ model: Pet, attributes: ['name'] }, { model: User, attributes: ['email', 'name'] }]
    });

    if (!due.length) return;

    const { sendReminderEmail } = require('./emailService');

    for (const reminder of due) {
      try {
        await sendReminderEmail({
          to: reminder.User.email,
          petName: reminder.Pet.name,
          message: reminder.message,
          date: reminder.remind_at
        });
        await reminder.update({ sent: true, sent_at: new Date() });
      } catch (err) {
        console.error(`Failed to send reminder ${reminder.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Reminder processing error:', err.message);
  }
}

function startReminderScheduler() {
  // Check every 15 minutes
  cron.schedule('*/15 * * * *', processDueReminders);
  console.log('Reminder scheduler started (every 15 minutes)');
}

module.exports = { createReminder, startReminderScheduler, processDueReminders };
