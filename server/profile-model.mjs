// src/profiles.ts
var MAIN_PROFILE = "principal";
var REGISTRY = "bioenergia.community.profiles.v1";
var ACTIVE = "bioenergia.community.active.v1";
var validProfile = (v) => {
  const p = v;
  return !!p && typeof p.id === "string" && /^(principal|[a-z0-9-]{10,64})$/.test(p.id) && typeof p.name === "string" && p.name.trim().length >= 2 && p.name.length <= 48 && !/[\u0000-\u001f]/.test(p.name) && typeof p.createdAt === "string" && Number.isFinite(Date.parse(p.createdAt));
};
var main = { id: MAIN_PROFILE, name: "Caderno principal", createdAt: "2026-11-01T00:00:00Z" };
function getProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(REGISTRY) ?? "[]");
    const rows = Array.isArray(saved) ? saved.filter(validProfile) : [];
    return [rows.find((p) => p.id === MAIN_PROFILE) ?? main, ...rows.filter((p, i, a) => p.id !== MAIN_PROFILE && a.findIndex((x) => x.id === p.id) === i)].slice(0, 50);
  } catch {
    return [main];
  }
}
function resolveProfile() {
  try {
    const requested = new URL(location.href).searchParams.get("caderno") ?? localStorage.getItem(ACTIVE);
    return requested && /^(principal|[a-z0-9-]{10,64})$/.test(requested) ? requested : MAIN_PROFILE;
  } catch {
    return MAIN_PROFILE;
  }
}
var PROFILE_ID = resolveProfile();
var scopedKey = (key, id = PROFILE_ID) => id === MAIN_PROFILE ? key : key + ".profile." + id;
var notebookKey = (key, id = PROFILE_ID) => id === MAIN_PROFILE ? key : key + ":" + id;
var currentProfile = () => getProfiles().find((p) => p.id === PROFILE_ID) ?? { ...main, id: PROFILE_ID, name: "Caderno recuperado" };
function mergeProfiles(profiles) {
  const existing = getProfiles();
  for (const p of profiles) if (validProfile(p) && !existing.some((x) => x.id === p.id) && existing.length < 50) existing.push(p);
  try {
    localStorage.setItem(REGISTRY, JSON.stringify(existing));
  } catch {
  }
  return existing;
}
function createProfile(name) {
  const rows = getProfiles();
  if (rows.length >= 50) throw new Error("LIMIT");
  if (rows.some((p) => p.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) throw new Error("NAME");
  const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const profile = { id, name: name.trim(), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  if (!validProfile(profile)) throw new Error("NAME");
  try {
    localStorage.setItem(REGISTRY, JSON.stringify([...rows, profile]));
  } catch {
    throw new Error("STORAGE");
  }
  return profile;
}
function openProfile(id) {
  if (!getProfiles().some((p) => p.id === id)) throw new Error("PROFILE");
  try {
    localStorage.setItem(ACTIVE, id);
  } catch {
  }
  const url = new URL(location.href);
  url.searchParams.set("caderno", id);
  location.assign(url.href);
}
export {
  MAIN_PROFILE,
  PROFILE_ID,
  createProfile,
  currentProfile,
  getProfiles,
  mergeProfiles,
  notebookKey,
  openProfile,
  scopedKey,
  validProfile
};
