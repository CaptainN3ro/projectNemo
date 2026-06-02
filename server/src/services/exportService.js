const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');
const {
  Pet, VetVisit, Medication, BloodWork, StoolEntry, BehaviorEntry,
  FeedingPlan, FeedingEntry, Vaccination, Event, WeightEntry
} = require('../models');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Strip DB-internal fields that must not be re-used on import
function cleanRecord(record) {
  const obj = record.toJSON ? record.toJSON() : { ...record };
  delete obj.id;
  delete obj.user_id;
  delete obj.pet_id;
  delete obj.feeding_plan_id;
  delete obj.created_at;
  delete obj.updated_at;
  return obj;
}

// Resolve a /uploads/... URL to an absolute disk path
function diskPath(urlPath) {
  if (!urlPath) return null;
  return path.join(UPLOAD_DIR, urlPath.replace(/^\/uploads\//, ''));
}

async function exportPet(petId, userId) {
  const pet = await Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
  if (!pet) throw new Error('Pet not found');

  const zip      = new AdmZip();
  const addFiles = []; // { diskPath, archivePath }

  function scheduleFile(urlPath, archiveDir) {
    if (!urlPath) return;
    const abs = diskPath(urlPath);
    if (abs && fs.existsSync(abs)) {
      addFiles.push({ diskPath: abs, archivePath: `files/${archiveDir}/${path.basename(abs)}` });
    }
  }

  // ── Pet ───────────────────────────────────────────────────────────────────
  const petData = cleanRecord(pet);
  scheduleFile(pet.photo_path, 'images');

  // ── Core tables ───────────────────────────────────────────────────────────
  const vetVisits    = (await VetVisit.findAll({ where: { pet_id: petId } })).map(cleanRecord);
  const medications  = (await Medication.findAll({ where: { pet_id: petId } })).map(cleanRecord);

  const bloodWorkRaw = await BloodWork.findAll({ where: { pet_id: petId } });
  const bloodWork    = bloodWorkRaw.map(r => { scheduleFile(r.file_path, 'bloodwork'); return cleanRecord(r); });

  const stoolRaw     = await StoolEntry.findAll({ where: { pet_id: petId } });
  const stoolEntries = stoolRaw.map(r => {
    (r.image_paths || []).forEach(img => scheduleFile(img, 'images'));
    return cleanRecord(r);
  });

  const behaviorRaw     = await BehaviorEntry.findAll({ where: { pet_id: petId } });
  const behaviorEntries = behaviorRaw.map(r => {
    (r.image_paths || []).forEach(img => scheduleFile(img, 'images'));
    return cleanRecord(r);
  });

  const feedingPlansRaw = await FeedingPlan.findAll({ where: { pet_id: petId }, include: [FeedingEntry] });
  const feedingPlans    = feedingPlansRaw.map(plan => {
    const p      = cleanRecord(plan);
    p.entries    = (plan.FeedingEntries || []).map(e => {
      const obj = e.toJSON();
      delete obj.id;
      delete obj.feeding_plan_id;
      return obj;
    });
    return p;
  });

  const vaccinations = (await Vaccination.findAll({ where: { pet_id: petId } })).map(cleanRecord);
  const events       = (await Event.findAll({ where: { pet_id: petId } })).map(cleanRecord);
  const weightEntries = (await WeightEntry.findAll({ where: { pet_id: petId } })).map(cleanRecord);

  // ── Plugin hooks ──────────────────────────────────────────────────────────
  const pluginData   = {};
  const { getPluginModules } = require('./pluginService');
  for (const [name, mod] of getPluginModules()) {
    if (typeof mod.exportPetData === 'function') {
      try {
        const result = await mod.exportPetData(petId, userId, UPLOAD_DIR, addFiles);
        if (result != null) pluginData[name] = result;
      } catch (e) {
        console.error(`Export hook failed for plugin "${name}":`, e.message);
      }
    }
  }

  // ── Assemble ZIP ──────────────────────────────────────────────────────────
  const manifest = {
    version:    '1.0',
    exportDate: new Date().toISOString(),
    petName:    pet.name,
    plugins:    Object.keys(pluginData)
  };

  const data = {
    pet: petData, vet_visits: vetVisits, medications, blood_work: bloodWork,
    stool_entries: stoolEntries, behavior_entries: behaviorEntries,
    feeding_plans: feedingPlans, vaccinations, events, weight_entries: weightEntries
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  zip.addFile('data.json',     Buffer.from(JSON.stringify(data, null, 2),     'utf8'));

  for (const [pluginName, pData] of Object.entries(pluginData)) {
    zip.addFile(`plugins/${pluginName}.json`, Buffer.from(JSON.stringify(pData, null, 2), 'utf8'));
  }

  // Deduplicate files (same diskPath might be added twice)
  const seen = new Set();
  for (const { diskPath: dp, archivePath } of addFiles) {
    if (seen.has(dp)) continue;
    seen.add(dp);
    try {
      zip.addLocalFile(dp, path.dirname(archivePath), path.basename(archivePath));
    } catch (e) {
      console.warn(`Could not add file to export ZIP: ${dp}`);
    }
  }

  const safeName = pet.name.replace(/[^a-z0-9äöüß]/gi, '_');
  const filename = `nemo-export-${safeName}-${new Date().toISOString().split('T')[0]}.zip`;

  return { buffer: zip.toBuffer(), filename };
}

module.exports = { exportPet };
