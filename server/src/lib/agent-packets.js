import fs from "node:fs";
import path from "node:path";

const PACKET_FILES = [
  ["soul", "soul.md"],
  ["userContext", "user.md"],
  ["baseMemory", "memory.md"],
  ["heartbeat", "heartbeat.md"],
  ["orchestrationSkills", "skills.md"],
  ["architecture", "ARCHITECTURE.md"],
];

function readPacketText(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return "";
    }

    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function packetPaths(cwd, sourceDir) {
  return Object.fromEntries(
    PACKET_FILES.map(([key, fileName]) => {
      const absolutePath = path.join(sourceDir, fileName);
      const relativePath = path.relative(cwd, absolutePath) || fileName;
      return [key, relativePath];
    }),
  );
}

export function loadAgentPacketSet({ env, entry }) {
  const sourcePath = String(entry?.sourcePath || "").trim();
  if (!sourcePath) {
    return {
      sourcePath: "",
      sourceDir: "",
      filePaths: {},
      soul: "",
      userContext: "",
      baseMemory: "",
      heartbeat: "",
      orchestrationSkills: "",
      architecture: "",
    };
  }

  const sourceDir = path.resolve(env.cwd, sourcePath);
  const packets = {
    sourcePath,
    sourceDir,
    filePaths: packetPaths(env.cwd, sourceDir),
  };

  for (const [key, fileName] of PACKET_FILES) {
    packets[key] = readPacketText(path.join(sourceDir, fileName));
  }

  return packets;
}

export function packetTextValues(packetSet) {
  return [
    packetSet?.soul,
    packetSet?.userContext,
    packetSet?.baseMemory,
    packetSet?.heartbeat,
    packetSet?.orchestrationSkills,
    packetSet?.architecture,
  ].filter(Boolean);
}
