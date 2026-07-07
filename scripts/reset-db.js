// Deletes the local SQLite database so it gets recreated (and re-seeded with
// fresh demo data) the next time `npm run dev` / `npm start` runs.
const fs = require("node:fs")
const path = require("node:path")

const dataDir = path.join(process.cwd(), "data")

if (fs.existsSync(dataDir)) {
  for (const file of fs.readdirSync(dataDir)) {
    if (file.startsWith("payroll.db")) {
      fs.rmSync(path.join(dataDir, file))
      console.log(`Removed ${file}`)
    }
  }
  console.log("Database reset. It will be recreated with fresh demo data on next start.")
} else {
  console.log("No database found — nothing to reset.")
}
