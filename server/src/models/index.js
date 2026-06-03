const User = require('./User');
const Pet = require('./Pet');
const VetVisit = require('./VetVisit');
const VetVisitAttachment = require('./VetVisitAttachment');
const AttachmentType = require('./AttachmentType');
const VetVisitQuickAction = require('./VetVisitQuickAction');
const Medication = require('./Medication');
const BloodWork = require('./BloodWork');
const StoolEntry = require('./StoolEntry');
const UrineEntry = require('./UrineEntry');
const BehaviorEntry = require('./BehaviorEntry');
const FeedingPlan = require('./FeedingPlan');
const FeedingEntry = require('./FeedingEntry');
const Vaccination = require('./Vaccination');
const Event = require('./Event');
const Reminder = require('./Reminder');
const SmtpSettings = require('./SmtpSettings');
const Plugin = require('./Plugin');
const WeightEntry = require('./WeightEntry');
const AppSettings = require('./AppSettings');
const SiteSettings = require('./SiteSettings');
const PasswordResetToken = require('./PasswordResetToken');
const EmailVerificationToken = require('./EmailVerificationToken');

// Associations
User.hasMany(Pet, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Pet.belongsTo(User, { foreignKey: 'user_id' });

Pet.hasMany(VetVisit, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
VetVisit.belongsTo(Pet, { foreignKey: 'pet_id' });

VetVisit.hasMany(VetVisitAttachment, { foreignKey: 'vet_visit_id', onDelete: 'CASCADE' });
VetVisitAttachment.belongsTo(VetVisit, { foreignKey: 'vet_visit_id' });
VetVisitAttachment.belongsTo(AttachmentType, { foreignKey: 'type_id' });
AttachmentType.hasMany(VetVisitAttachment, { foreignKey: 'type_id' });

Pet.hasMany(Medication, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
Medication.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(BloodWork, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
BloodWork.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(StoolEntry, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
StoolEntry.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(UrineEntry, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
UrineEntry.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(BehaviorEntry, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
BehaviorEntry.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(FeedingPlan, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
FeedingPlan.belongsTo(Pet, { foreignKey: 'pet_id' });

FeedingPlan.hasMany(FeedingEntry, { foreignKey: 'feeding_plan_id', onDelete: 'CASCADE' });
FeedingEntry.belongsTo(FeedingPlan, { foreignKey: 'feeding_plan_id' });

Pet.hasMany(Vaccination, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
Vaccination.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(Event, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
Event.belongsTo(Pet, { foreignKey: 'pet_id' });

User.hasMany(Reminder, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Pet.hasMany(Reminder, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
Reminder.belongsTo(User, { foreignKey: 'user_id' });
Reminder.belongsTo(Pet, { foreignKey: 'pet_id' });

Pet.hasMany(WeightEntry, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
WeightEntry.belongsTo(Pet, { foreignKey: 'pet_id' });

User.hasMany(PasswordResetToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(EmailVerificationToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
EmailVerificationToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User, Pet, VetVisit, VetVisitAttachment, AttachmentType, VetVisitQuickAction,
  Medication, BloodWork, StoolEntry, UrineEntry, BehaviorEntry,
  FeedingPlan, FeedingEntry, Vaccination, Event, Reminder, SmtpSettings, Plugin,
  WeightEntry, AppSettings, SiteSettings, PasswordResetToken, EmailVerificationToken
};
