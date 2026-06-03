const AdmZip  = require('adm-zip');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  Pet, VetVisit, VetVisitAttachment, AttachmentType,
  Medication, BloodWork, StoolEntry, UrineEntry, BehaviorEntry,
  FeedingPlan, FeedingEntry, Vaccination, Event, WeightEntry, Plugin
} = require('../models');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

async function importPet(zipBuffer, userId) {
  const zip = new AdmZip(zipBuffer);

  // ── ZIP einlesen ──────────────────────────────────────────────────────────
  let manifest, data;
  try {
    manifest = JSON.parse(zip.readAsText('manifest.json'));
    data     = JSON.parse(zip.readAsText('data.json'));
  } catch {
    throw new Error('Ungueltige Export-Datei: manifest.json oder data.json fehlt oder ist beschaedigt.');
  }

  if (manifest.version !== '1.0') {
    throw new Error(`Nicht unterstuetzte Export-Version: ${manifest.version}`);
  }

  // Dateibasename → ZIP-Eintrag (alle files/*-Eintraege)
  const fileMap = {};
  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('files/') && !entry.isDirectory) {
      fileMap[path.basename(entry.entryName)] = entry.entryName;
    }
  }

  // Datei aus ZIP extrahieren, mit neuer UUID speichern, neue URL zurueckgeben
  function extractFile(originalUrlPath, subDir) {
    if (!originalUrlPath) return null;
    const basename    = path.basename(originalUrlPath);
    const archivePath = fileMap[basename];
    if (!archivePath) return null;
    const entry = zip.getEntry(archivePath);
    if (!entry) return null;
    const ext         = path.extname(basename).toLowerCase();
    const newFilename = `${uuidv4()}${ext}`;
    const targetDir   = path.join(UPLOAD_DIR, subDir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, newFilename), entry.getData());
    return `/uploads/${subDir}/${newFilename}`;
  }

  function extractImages(imagePaths) {
    if (!Array.isArray(imagePaths)) return [];
    return imagePaths.map(p => extractFile(p, 'images')).filter(Boolean);
  }

  // ── Tier anlegen ──────────────────────────────────────────────────────────
  const { id: _id, user_id: _u, pet_id: _p, created_at: _c, updated_at: _up, ...petFields } = data.pet;
  const photoPath = extractFile(data.pet.photo_path, 'images');

  const pet = await Pet.create({ ...petFields, user_id: userId, photo_path: photoPath, active: true });

  // ── Tierarztbesuche mit Anlagen ───────────────────────────────────────────
  // Anlagen sind inline im Besuch gespeichert (type_name statt type_id),
  // kein ID-Mapping noetig.
  for (const r of data.vet_visits || []) {
    const { attachments, ...visitData } = r;
    const visit = await VetVisit.create({ ...visitData, pet_id: pet.id, id: undefined });

    for (const att of attachments || []) {
      if (!att.type_name) continue;
      const type = await AttachmentType.findOne({ where: { name: att.type_name } });
      if (!type) {
        console.log(`Import: Anlagentyp "${att.type_name}" auf dieser Instanz nicht bekannt — uebersprungen.`);
        continue;
      }
      const newPath = extractFile(att.file_path, 'attachments');
      if (!newPath) {
        console.log(`Import: Anlage-Datei fuer "${att.original_filename}" fehlt im ZIP — uebersprungen.`);
        continue;
      }
      await VetVisitAttachment.create({
        vet_visit_id:      visit.id,
        type_id:           type.id,
        file_path:         newPath,
        original_filename: att.original_filename || null,
        file_size:         att.file_size || null,
        description:       att.description || null
      });
    }
  }

  // ── Sonstige Kerntabellen ─────────────────────────────────────────────────
  for (const r of data.medications || []) {
    await Medication.create({ ...r, pet_id: pet.id, id: undefined });
  }

  for (const r of data.stool_entries || []) {
    await StoolEntry.create({ ...r, pet_id: pet.id, id: undefined, image_paths: extractImages(r.image_paths) });
  }

  for (const r of data.urine_entries || []) {
    await UrineEntry.create({ ...r, pet_id: pet.id, id: undefined, image_paths: extractImages(r.image_paths) });
  }

  for (const r of data.behavior_entries || []) {
    await BehaviorEntry.create({ ...r, pet_id: pet.id, id: undefined, image_paths: extractImages(r.image_paths) });
  }

  for (const plan of data.feeding_plans || []) {
    const { entries, ...planFields } = plan;
    const newPlan = await FeedingPlan.create({ ...planFields, pet_id: pet.id, id: undefined });
    for (const entry of entries || []) {
      await FeedingEntry.create({ ...entry, feeding_plan_id: newPlan.id, id: undefined });
    }
  }

  for (const r of data.vaccinations || []) {
    await Vaccination.create({ ...r, pet_id: pet.id, id: undefined });
  }

  for (const r of data.events || []) {
    await Event.create({ ...r, pet_id: pet.id, id: undefined });
  }

  for (const r of data.weight_entries || []) {
    await WeightEntry.create({ ...r, pet_id: pet.id, id: undefined });
  }

  // Altdaten: blood_work (aus aelteren Exporten, Rueckwaertskompatibilitaet)
  for (const r of data.blood_work || []) {
    const newPath = extractFile(r.file_path, 'bloodwork');
    if (!newPath) continue;
    await BloodWork.create({ ...r, pet_id: pet.id, id: undefined, file_path: newPath });
  }

  // ── Plugin-Daten ──────────────────────────────────────────────────────────
  const installedPlugins = await Plugin.findAll({ where: { active: true } });
  const installedNames   = new Set(installedPlugins.map(p => p.name));
  const { getPluginModules } = require('./pluginService');

  for (const pluginName of manifest.plugins || []) {
    if (!installedNames.has(pluginName)) {
      console.log(`Import: Plugin "${pluginName}" nicht installiert — Daten werden uebersprungen.`);
      continue;
    }
    const mod = getPluginModules().get(pluginName);
    if (typeof mod?.importPetData !== 'function') {
      console.log(`Import: Plugin "${pluginName}" hat keinen importPetData-Hook.`);
      continue;
    }
    try {
      const pluginDataRaw = zip.readAsText(`plugins/${pluginName}.json`);
      if (!pluginDataRaw) continue;
      await mod.importPetData(pet.id, userId, JSON.parse(pluginDataRaw), zip, UPLOAD_DIR, fileMap);
    } catch (e) {
      console.error(`Import-Hook fuer Plugin "${pluginName}" fehlgeschlagen:`, e.message);
    }
  }

  return pet;
}

module.exports = { importPet };
