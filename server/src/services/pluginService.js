const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { Plugin } = require('../models');
const { sequelize } = require('../config/database');
const { PLUGINS_DIR } = require('../middleware/upload');

// Tracks loaded plugin modules so export/import hooks can be called
const loadedModules = new Map(); // pluginName → router (may have exportPetData / importPetData)

function getPluginModules() {
  return loadedModules;
}

function validateManifest(manifest) {
  const required = ['name', 'shortName', 'longName'];
  for (const key of required) {
    if (!manifest[key]) throw new Error(`manifest.json missing required field: ${key}`);
  }
  if (!/^[a-z0-9-_]+$/.test(manifest.name)) {
    throw new Error('Plugin name must be lowercase alphanumeric with hyphens/underscores only');
  }
  const placement = manifest.menuItem?.placement;
  if (placement && !['top', 'pet'].includes(placement)) {
    throw new Error('menuItem.placement must be "top" or "pet"');
  }
}

async function installPlugin(zipPath, app) {
  let pluginDir;
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    const manifestEntry = entries.find(e => e.entryName.endsWith('manifest.json') && e.entryName.split('/').length <= 2);
    if (!manifestEntry) throw new Error('manifest.json not found in ZIP');

    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    validateManifest(manifest);

    const existing = await Plugin.findOne({ where: { name: manifest.name } });

    // ── UPDATE existing plugin ────────────────────────────────────────────
    if (existing) {
      return await updatePlugin(existing, manifest, zip, app, zipPath);
    }

    // ── FRESH INSTALL ─────────────────────────────────────────────────────
    pluginDir = path.join(PLUGINS_DIR, manifest.name);
    if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true });

    zip.extractAllTo(pluginDir, true);
    flattenIfNested(pluginDir);

    await runSql(path.join(pluginDir, 'migrations', 'install.sql'));

    const iconPath    = manifest.icon ? `/plugins/${manifest.name}/${manifest.icon}` : null;
    const menuPlacement = manifest.menuItem?.placement || 'top';

    const plugin = await Plugin.create({
      name: manifest.name, short_name: manifest.shortName, long_name: manifest.longName,
      version: manifest.version, author: manifest.author, author_link: manifest.authorLink,
      description: manifest.description, icon_path: iconPath,
      install_path: pluginDir, menu_placement: menuPlacement, active: true
    });

    loadPluginRoutes(app, manifest.name, pluginDir);
    return plugin;
  } catch (err) {
    if (pluginDir && fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true });
    throw err;
  } finally {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function flattenIfNested(dir) {
  const items = fs.readdirSync(dir);
  if (items.length === 1 && fs.statSync(path.join(dir, items[0])).isDirectory()) {
    const nested = path.join(dir, items[0]);
    const tmp    = dir + '_tmp';
    fs.renameSync(nested, tmp);
    fs.rmSync(dir, { recursive: true });
    fs.renameSync(tmp, dir);
  }
}

async function runSql(sqlPath) {
  if (!fs.existsSync(sqlPath)) return;
  const sql = fs.readFileSync(sqlPath, 'utf8');
  for (const stmt of sql.split(';').map(s => s.trim()).filter(Boolean)) {
    await sequelize.query(stmt);
  }
}

// ── Update an already-installed plugin ────────────────────────────────────
// Extracts the new ZIP to a temporary directory, runs migrations/update.sql
// (if present), then atomically replaces the plugin directory and updates
// the DB record. Existing data tables are untouched unless update.sql
// explicitly alters them.
async function updatePlugin(existingPlugin, manifest, zip, app, zipPath) {
  const pluginDir = existingPlugin.install_path || path.join(PLUGINS_DIR, manifest.name);
  const tempDir   = pluginDir + '_update_tmp';

  try {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    zip.extractAllTo(tempDir, true);
    flattenIfNested(tempDir);

    // Run update migration BEFORE replacing files so rollback is possible
    await runSql(path.join(tempDir, 'migrations', 'update.sql'));

    // Swap directories atomically
    if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true });
    fs.renameSync(tempDir, pluginDir);

    const iconPath     = manifest.icon ? `/plugins/${manifest.name}/${manifest.icon}` : existingPlugin.icon_path;
    const menuPlacement = manifest.menuItem?.placement || existingPlugin.menu_placement || 'top';

    await existingPlugin.update({
      short_name: manifest.shortName, long_name: manifest.longName,
      version: manifest.version, author: manifest.author,
      author_link: manifest.authorLink, description: manifest.description,
      icon_path: iconPath, menu_placement: menuPlacement
    });

    // Reload routes with fresh require cache
    loadPluginRoutes(app, manifest.name, pluginDir);
    console.log(`Plugin "${manifest.name}" updated to v${manifest.version || '?'}`);
    return existingPlugin;
  } catch (err) {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    throw err;
  } finally {
    if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  }
}

function loadPluginRoutes(app, name, dir) {
  const publicPath = path.join(dir, 'server', 'public.js');
  const adminPath = path.join(dir, 'server', 'admin.js');

  if (fs.existsSync(publicPath)) {
    try {
      delete require.cache[require.resolve(publicPath)];
      const mod = require(publicPath);
      app.use(`/api/plugins/${name}`, mod);
      loadedModules.set(name, mod); // register for export/import hooks
      console.log(`Plugin "${name}" public routes loaded`);
    } catch (e) {
      console.error(`Failed to load ${name} public routes:`, e.message);
    }
  }

  if (fs.existsSync(adminPath)) {
    try {
      delete require.cache[require.resolve(adminPath)];
      const router = require(adminPath);
      app.use(`/api/admin/plugins/${name}`, router);
      console.log(`Plugin "${name}" admin routes loaded`);
    } catch (e) {
      console.error(`Failed to load ${name} admin routes:`, e.message);
    }
  }

  // Serve static assets and html
  const assetsPath = path.join(dir, 'assets');
  if (fs.existsSync(assetsPath)) {
    app.use(`/plugins/${name}/assets`, require('express').static(assetsPath));
  }

  const htmlPath = path.join(dir, 'html');
  if (fs.existsSync(htmlPath)) {
    // Plugin HTML files use inline <script> blocks which helmet's default
    // "script-src 'self'" would silently block. We override the CSP for
    // plugin HTML responses only — API calls are still restricted to 'self'.
    const express = require('express');
    const pluginCsp = (req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'self';"
      );
      next();
    };
    app.use(`/plugins/${name}/html`, pluginCsp, express.static(htmlPath));
  }
}

async function loadPlugins(app) {
  const plugins = await Plugin.findAll({ where: { active: true } });
  for (const plugin of plugins) {
    if (plugin.install_path && fs.existsSync(plugin.install_path)) {
      loadPluginRoutes(app, plugin.name, plugin.install_path);
    }
  }
  console.log(`Loaded ${plugins.length} plugin(s)`);
}

async function uninstallPlugin(plugin) {
  const uninstallSqlPath = plugin.install_path ? path.join(plugin.install_path, 'migrations', 'uninstall.sql') : null;
  if (uninstallSqlPath && fs.existsSync(uninstallSqlPath)) {
    const sql = fs.readFileSync(uninstallSqlPath, 'utf8');
    for (const stmt of sql.split(';').map(s => s.trim()).filter(Boolean)) {
      await sequelize.query(stmt);
    }
  }
  if (plugin.install_path && fs.existsSync(plugin.install_path)) {
    fs.rmSync(plugin.install_path, { recursive: true });
  }
  await plugin.destroy();
}

module.exports = { installPlugin, uninstallPlugin, loadPlugins, getPluginModules };
